// ════════════════════════════════════════════════════════════════════════════
// LE SERVEUR COREON — le jour où l'école cesse de vivre dans un navigateur.
//
// Un seul processus, zéro dépendance : node:http + node:crypto + des fichiers
// JSON atomiques. Il héberge UNE école (pilote v1) et fait exactement quatre
// choses, celles que production-readiness-checklist.md exige :
//   1. AUTHENTIFIER : mots de passe hachés (scrypt), sessions à durée de vie,
//      jamais un mot de passe dans le blob.
//   2. SERVIR le blob PAR RÔLE : la direction voit tout, l'enseignant pas la
//      paie, le parent un blob RECONSTRUIT (acl.js — défaut refus).
//   3. ÉCRIRE avec un VERROU DE RÉVISION : une écriture périmée reçoit 409 et
//      les données du serveur — plus jamais « le dernier écrase le premier »
//      en silence. La fusion ne prend que les collections du rôle.
//   4. SAUVEGARDER : copie datée au démarrage puis toutes les 6 h, rotation 30.
//
// LES RÈGLES DU CŒUR NE SONT PAS RÉÉCRITES : le serveur importe core/src et
// exécute les MÊMES fonctions (accidents.acknowledge, gallery.toggleLike,
// admissions.apply) pour les opérations des parents.
//
//   node server/server.mjs            → http://0.0.0.0:8787
//   COREON_DATA=/var/coreon  PORT=…   → configuration par l'environnement
//   COREON_ORIGINS=https://edu.kogiagroup.com,…  → CORS
//   COREON_STATIC=../app/dist         → sert aussi l'application (optionnel)
// ════════════════════════════════════════════════════════════════════════════
import http from 'node:http'
import { randomBytes } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { hashPw, checkPw } from './pw.mjs'
import { join, extname, dirname, resolve, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeStore } from './store.mjs'
import { setStorage } from '../core/src/storage.js'
import { blobForStaff, blobForParent, mergeWrite, mayWriteCollection } from '../core/src/acl.js'
import { acknowledge } from '../core/src/accidents.js'
import { toggleLike } from '../core/src/gallery.js'
import { apply as applyAdmission } from '../core/src/admissions.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 8787)
const DATA = process.env.COREON_DATA || join(HERE, 'data')
const ORIGINS = (process.env.COREON_ORIGINS || 'http://localhost:5173,http://localhost:8123').split(',')
const STATIC = process.env.COREON_STATIC ? join(HERE, process.env.COREON_STATIC) : null
const SESSION_TTL = 8 * 60 * 60 * 1000

// Deux magasins possibles, MÊME interface {read, write, backup} : fichiers
// locaux (par défaut) ou Turso (TURSO_DATABASE_URL posé) pour un hébergeur
// SANS disque persistant (ex. Render, plan gratuit — voir README « Déployer »).
// `read` est ASYNC dans les deux cas maintenant (attendre une valeur déjà
// prête ne coûte rien) ; `write`/`backup` restent des appels non attendus
// partout ailleurs dans ce fichier, comme avant.
const store = process.env.TURSO_DATABASE_URL
  ? await (await import('./store.turso.mjs')).makeStore(process.env.TURSO_DATABASE_URL, process.env.TURSO_AUTH_TOKEN)
  : makeStore(DATA)
let school = await store.read('school', null)          // { rev, blob }
let auth = await store.read('auth', { users: [], sessions: {} })

// CodeQL (2026-08-11, puis 2026-08-20) : `auth.sessions[token]` et
// `auth.resets[token]` utilisaient une chaîne venue du client comme clé d'objet.
// Un jeton nommé `constructor` ou `__proto__` renvoyait alors une propriété
// HÉRITÉE, truthy — testé en production : l'accès restait refusé (401/403), mais
// la vérification passait un cran plus loin qu'elle n'aurait dû. Première parade :
// `Object.create(null)`. CodeQL continuait de suivre la clé jusqu'à l'affectation
// crochet ; on passe donc à des `Map` : aucune propriété héritée, aucune clé
// spéciale, et `persistAuth` resérialise en objet — le format stocké ne change pas.
const sessions = new Map(Object.entries(auth.sessions || {}))
const resets = new Map(Object.entries(auth.resets || {}))
if (!school) { console.error('Aucune école : lancez d\'abord  node server/import.mjs  (voir README)'); process.exit(1) }

const persistSchool = () => store.write('school', school)
const persistAuth = () => store.write('auth', { ...auth, sessions: Object.fromEntries(sessions), resets: Object.fromEntries(resets) })

// ── Sessions ──────────────────────────────────────────────────────────────────
const openSession = userId => {
  const token = randomBytes(24).toString('hex')
  sessions.set(token, { userId, exp: Date.now() + SESSION_TTL })
  // ménage : les sessions mortes ne s'accumulent pas
  for (const [t, s] of sessions) if (s.exp < Date.now()) sessions.delete(t)
  persistAuth()
  return token
}
const sessionUser = req => {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const s = sessions.get(token)
  if (!s || s.exp < Date.now()) return null
  const u = (school.blob.users || []).find(u => u.id === s.userId) || null
  // Désactiver un compte doit couper l'accès TOUT DE SUITE — pas à l'expiration
  // du jeton (8 h plus tard). On vérifie `disabled` à CHAQUE requête, et on tue
  // la session au passage : la Direction ferme la porte, elle se ferme.
  if (u && u.disabled) { sessions.delete(token); persistAuth(); return null }
  return u
}

// ── Le cœur tourne SUR le blob du serveur (opérations nommées) ────────────────
// L'adaptateur donne au cœur (db.js) une vue synchrone du blob ; chaque save()
// du cœur incrémente la révision et persiste. Les mêmes règles, côté serveur.
setStorage({
  getItem: k => (k === 'coreon_db' ? JSON.stringify(school.blob) : null),
  setItem: (k, v) => { if (k === 'coreon_db') { school = { rev: school.rev + 1, blob: JSON.parse(v) }; persistSchool() } },
  removeItem: () => {},
})

// Ce qu'un parent a le droit de DEMANDER au serveur — et sous quelle garde.
const PARENT_OPS = {
  acknowledge: (user, [accidentId]) => {
    const a = (school.blob.accidents || []).find(x => x.id === accidentId)
    if (!a || !(user.childIds || []).includes(a.childId)) return { error: 'Cet accident ne concerne pas vos enfants.' }
    return acknowledge(accidentId, user.name)
  },
  toggleLike: (user, [momentId]) => {
    const m = (school.blob.moments || []).find(x => x.id === momentId)
    const kids = new Set(user.childIds || [])
    if (!m || !(m.childIds || []).some(id => kids.has(id))) return { error: 'Ce moment ne concerne pas vos enfants.' }
    return { liked: toggleLike(momentId, user.id) }
  },
}

// ── Anti-abus minimal sur les endpoints publics ───────────────────────────────
const limiter = (max, windowMs) => {
  const log = new Map()
  return ip => {
    const now = Date.now()
    const list = (log.get(ip) || []).filter(t => now - t < windowMs)
    if (list.length >= max) return false
    list.push(now); log.set(ip, list); return true
  }
}
const applyAllowed = limiter(10, 60 * 60 * 1000)        // pré-inscription
const forgotAllowed = limiter(5, 60 * 60 * 1000)        // mot de passe oublié
const loginAllowed = limiter(20, 15 * 60 * 1000)        // force brute (audit 2026-07-25)
const resetAllowed = limiter(10, 60 * 60 * 1000)        // devinette de jeton
const mailAllowed = limiter(60, 60 * 60 * 1000)         // envois e-mail par utilisateur/heure

// L'adresse du client. Derrière un reverse-proxy (Caddy/nginx), TOUTES les
// requêtes portent l'IP du proxy : sans ceci, un seul visiteur épuise le
// quota de toute l'école. COREON_TRUST_PROXY=1 fait lire X-Forwarded-For.
const ipOf = req => {
  if (process.env.COREON_TRUST_PROXY === '1') {
    const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    if (xff) return xff
  }
  return req.socket.remoteAddress || '?'
}

// ── Mot de passe oublié ───────────────────────────────────────────────────────
// Règles tenues ici, pas dans le client : un jeton est un secret, il ne se
// fabrique jamais dans le navigateur.
//   · à usage unique, 60 minutes de vie
//   · la réponse est TOUJOURS la même — savoir si un compte existe est déjà
//     une fuite (on ne dit pas à un inconnu qui travaille dans l'école)
//   · réinitialiser ferme toutes les sessions ouvertes du compte : si un
//     intrus était déjà entré, le changement le met dehors
const RESET_TTL = 60 * 60 * 1000

const openReset = userId => {
  const token = randomBytes(24).toString('hex')
  resets.set(token, { userId, exp: Date.now() + RESET_TTL })
  for (const [t, r] of resets) if (r.exp < Date.now()) resets.delete(t)
  persistAuth()
  return token
}

// L'e-mail part par le même relais que le reste du produit (Worker → Zoho).
// Sans relais configuré, on écrit le lien dans le journal du serveur : en
// développement on avance, et on ne fait jamais croire qu'un envoi a eu lieu.
const MAIL_RELAY = process.env.COREON_MAIL_RELAY || ''
const MAIL_TOKEN = process.env.COREON_MAIL_TOKEN || ''
const APP_URL = process.env.COREON_APP_URL || 'https://edu.kogiagroup.com'
const SUPPORT = process.env.COREON_SUPPORT || 'support@kogiagroup.com'

// CodeQL js/log-injection (2026-08-14) : `to` peut venir d'un e-mail stocké
// sans validation anti-CRLF (auth.users, posé à la création du compte). Sans
// ce nettoyage, un e-mail contenant \r\n forgerait de fausses lignes dans les
// journaux du serveur — le seul canal de secours quand MAIL_RELAY n'est pas
// configuré.
const journalise = v => String(v).replace(/[\r\n\t]/g, ' ')

// Le relais unique : tout e-mail du serveur passe par ici. COREON_MAIL_TOKEN
// doit être le SERVER_TOKEN du worker (voie serveur, distincte du jeton du
// navigateur — le worker n'exige pas d'Origin pour cette voie-là).
async function relayMail(to, subject, text) {
  if (!MAIL_RELAY) { console.log(`[mail non relayé] ${journalise(to)} · ${journalise(subject)}`); return { ok: false, via: 'no-relay' } }
  try {
    const r = await fetch(MAIL_RELAY, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(MAIL_TOKEN ? { authorization: `Bearer ${MAIL_TOKEN}` } : {}) },
      body: JSON.stringify({ to, subject, text }),
    })
    return { ok: r.ok, via: r.ok ? 'sent' : 'relay-error' }
  } catch (e) {
    // Le détail reste côté serveur : `/api/mail` renvoie `r` tel quel au client,
    // et un message d'exception (hôte, DNS, pile) n'a rien à faire dans un navigateur
    // (CodeQL js/stack-trace-exposure, 2026-08-20).
    console.error(`[mail relais] ${journalise(e?.message || e)}`)
    return { ok: false, via: 'error' }
  }
}

async function sendResetMail(to, token) {
  const link = `${APP_URL}/#/reinitialiser?token=${token}`
  const subject = 'Coreon EDU · réinitialiser votre mot de passe'
  const text =
    `Vous avez demandé un nouveau mot de passe.\n\n${link}\n\n` +
    `Ce lien est valable 60 minutes et ne fonctionne qu'une seule fois.\n` +
    `Si vous n'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.\n\n` +
    `Besoin d'aide : ${SUPPORT}\nCoreon EDU, Kogia Group`
  if (!MAIL_RELAY) { console.log(`[mot de passe oublié] ${journalise(to)} → ${link}`); return { ok: false, via: 'no-relay' } }
  return relayMail(to, subject, text)
}

// ── HTTP ──────────────────────────────────────────────────────────────────────
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
// Le trafic mesuré (17/07/2026) : le blob direction pèse 371 Ko brut, 32 Ko en
// gzip — sur le wifi d'une école tunisienne, la compression n'est pas un luxe.
const send = (res, code, body, origin) => {
  const payload = JSON.stringify(body)
  const gz = payload.length > 1024 && String(res.req?.headers['accept-encoding'] || '').includes('gzip')
  res.writeHead(code, {
    'content-type': 'application/json',
    ...(gz ? { 'content-encoding': 'gzip' } : {}),
    ...(origin ? { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' } : {}),
  })
  res.end(gz ? gzipSync(payload) : payload)
}
const readBody = req => new Promise(resolve => {
  let raw = ''; req.on('data', c => { raw += c; if (raw.length > 30e6) req.destroy() })
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')) } catch { resolve({}) } })
})

export const server = http.createServer(async (req, res) => {
  const origin = ORIGINS.includes(req.headers.origin) ? req.headers.origin : ORIGINS[0]
  if (req.method === 'OPTIONS') return send(res, 204, {}, origin)
  const url = new URL(req.url, 'http://x')

  try {
    if (url.pathname === '/api/health') return send(res, 200, { ok: true, rev: school.rev }, origin)

    if (url.pathname === '/api/login' && req.method === 'POST') {
      if (!loginAllowed(ipOf(req))) return send(res, 429, { error: 'Trop de tentatives. Réessayez dans quelques minutes.' }, origin)
      const { email, pw } = await readBody(req)
      const cred = auth.users.find(u => u.email.toLowerCase() === String(email || '').trim().toLowerCase())
      const user = cred && (school.blob.users || []).find(u => u.id === cred.id)
      if (!cred || !user || !checkPw(pw, cred.hash)) return send(res, 401, { error: 'E-mail ou mot de passe incorrect.' }, origin)
      if (user.disabled) return send(res, 403, { error: 'Compte désactivé par la Direction.' }, origin)
      // codex-review #12, même garde que core/src/auth.js (voir son commentaire) —
      // dupliquée ici car server.mjs a sa propre voie d'authentification, qui ne
      // passe pas par core/src/auth.js. Ce blob-ci sert UNE école (`live`) ; un
      // compte créé par « Ajouter une école » avant que sa propre instance existe
      // ne doit pas se connecter ICI et voir les données de l'école live.
      const ownSchool = (school.blob.schools || []).find(s => s.live) || null
      if (user.role !== 'owner' && ownSchool?.status === 'suspended') return send(res, 403, { error: 'Accès suspendu par Kogia Group.' }, origin)
      if (user.schoolId && ownSchool && user.schoolId !== ownSchool.id) return send(res, 403, { error: 'Ce compte appartient à une école pas encore déployée ici.' }, origin)
      const { pw: _, ...safe } = user
      return send(res, 200, { token: openSession(user.id), user: safe }, origin)
    }

    if (url.pathname === '/api/logout' && req.method === 'POST') {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
      sessions.delete(token); persistAuth()
      return send(res, 200, { ok: true }, origin)
    }

    // Demander un lien. Réponse identique quoi qu'il arrive.
    if (url.pathname === '/api/forgot' && req.method === 'POST') {
      const ip = req.socket.remoteAddress || '?'
      const neutral = { ok: true, message: 'Si un compte existe pour cette adresse, un lien vient d\'être envoyé.' }
      if (!forgotAllowed(ip)) return send(res, 429, { error: 'Trop de demandes depuis cette adresse : réessayez plus tard.' }, origin)
      const { email } = await readBody(req)
      const addr = String(email || '').trim().toLowerCase()
      const cred = auth.users.find(u => u.email.toLowerCase() === addr)
      const user = cred && (school.blob.users || []).find(u => u.id === cred.id)
      // Compte inconnu ou désactivé : même réponse, aucun envoi, aucun jeton.
      if (cred && user && !user.disabled) await sendResetMail(cred.email, openReset(cred.id))
      return send(res, 200, neutral, origin)
    }

    // Poser le nouveau mot de passe. Le jeton meurt à l'usage.
    if (url.pathname === '/api/reset' && req.method === 'POST') {
      if (!resetAllowed(ipOf(req))) return send(res, 429, { error: 'Trop de tentatives. Réessayez plus tard.' }, origin)
      const { token, pw } = await readBody(req)
      const key = String(token || '')
      const rec = resets.get(key)
      if (!rec || rec.exp < Date.now()) {
        resets.delete(key); persistAuth()
        return send(res, 400, { error: 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.' }, origin)
      }
      if (String(pw || '').length < 8) return send(res, 400, { error: 'Le mot de passe doit faire au moins 8 caractères.' }, origin)
      const cred = auth.users.find(u => u.id === rec.userId)
      if (!cred) { resets.delete(key); persistAuth(); return send(res, 400, { error: 'Compte introuvable.' }, origin) }
      cred.hash = hashPw(pw)
      resets.delete(key)
      // toutes les sessions du compte tombent : un intrus éventuel est éjecté
      for (const [t, s] of sessions) if (s.userId === rec.userId) sessions.delete(t)
      persistAuth()
      return send(res, 200, { ok: true }, origin)
    }

    if (url.pathname === '/api/apply' && req.method === 'POST') {
      const ip = req.socket.remoteAddress || '?'
      if (!applyAllowed(ip)) return send(res, 429, { error: 'Trop de candidatures depuis cette adresse : réessayez plus tard.' }, origin)
      const r = applyAdmission(await readBody(req))
      return send(res, r.error ? 400 : 200, r, origin)
    }

    // ── tout le reste exige une session ──
    const user = sessionUser(req)
    if (!user) return send(res, 401, { error: 'Session expirée : reconnectez-vous.' }, origin)

    if (url.pathname === '/api/rev') return send(res, 200, { rev: school.rev }, origin)

    if (url.pathname === '/api/db' && req.method === 'GET') {
      const blob = user.role === 'parent' ? blobForParent(school.blob, user) : blobForStaff(school.blob, user.role)
      return send(res, 200, { rev: school.rev, blob }, origin)
    }

    if (url.pathname === '/api/db' && req.method === 'POST') {
      if (user.role === 'parent') return send(res, 403, { error: 'Les actions parent passent par /api/op.' }, origin)
      const { baseRev, blob } = await readBody(req)
      if (Number(baseRev) !== school.rev) {
        const fresh = blobForStaff(school.blob, user.role)
        return send(res, 409, { rev: school.rev, blob: fresh, error: 'Quelqu\'un a écrit entre-temps : vos données ont été actualisées.' }, origin)
      }
      // Les mots de passe créés à l'écran Comptes vont au registre d'auth, jamais
      // au blob. ⚠️ AUDIT 2026-07-25 (S-1) : cette boucle tournait AVANT l'ACL —
      // n'importe quel rôle authentifié pouvait remplacer l'identifiant de la
      // Direction. Désormais : on ne touche au registre QUE si le rôle a le
      // droit d'écrire `users` (direction/propriétaire), ou pour SON propre
      // compte ; et un utilisateur ne change jamais son propre e-mail ici.
      for (const u of (blob?.users || [])) {
        if (!u?.pw) continue
        const self = u.id === user.id
        if (!self && !mayWriteCollection(user.role, 'users')) continue
        const i = auth.users.findIndex(x => x.id === u.id)
        const email = self && i >= 0 ? auth.users[i].email : (u.email || (i >= 0 ? auth.users[i].email : ''))
        const rec = { id: u.id, email, hash: hashPw(u.pw) }
        i >= 0 ? auth.users[i] = rec : auth.users.push(rec)
      }
      persistAuth()
      const { merged, applied } = mergeWrite(school.blob, blob || {}, user.role)
      school = { rev: school.rev + 1, blob: merged }
      persistSchool()
      return send(res, 200, { rev: school.rev, applied }, origin)
    }

    // ⚠️ AUDIT 2026-07-25 (MAIL-1) : le client (remote.js) appelait /api/mail…
    // qui n'existait pas — ZÉRO e-mail ne partait en mode serveur. Le voici :
    // personnel authentifié seulement, un destinataire, quota par utilisateur.
    if (url.pathname === '/api/mail' && req.method === 'POST') {
      if (user.role === 'parent') return send(res, 403, { error: 'Réservé au personnel.' }, origin)
      if (!mailAllowed('mail:' + user.id)) return send(res, 429, { error: 'Quota d’envoi atteint pour cette heure.' }, origin)
      const { to, subject, text } = await readBody(req)
      if (!to || !subject || !text) return send(res, 400, { error: 'to/subject/text requis.' }, origin)
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(to)) || /[\r\n]/.test(String(to) + String(subject)))
        return send(res, 400, { error: 'Destinataire ou sujet invalide.' }, origin)
      const r = await relayMail(String(to), String(subject).slice(0, 200), String(text).slice(0, 20000))
      return send(res, r.ok ? 200 : 502, r, origin)
    }

    if (url.pathname === '/api/op' && req.method === 'POST') {
      const { op, args = [] } = await readBody(req)
      const fn = user.role === 'parent' ? PARENT_OPS[op] : null
      if (!fn) return send(res, 400, { error: `Opération inconnue ou non autorisée : ${op}` }, origin)
      const r = fn(user, args)
      return send(res, r?.error ? 400 : 200, { ...r, rev: school.rev }, origin)
    }

    return send(res, 404, { error: 'Introuvable.' }, origin)
  } catch (e) {
    console.error(e)
    return send(res, 500, { error: 'Erreur serveur.' }, origin)
  }
})

// Statique (optionnel) : le serveur peut héberger l'application elle-même.
if (STATIC) {
  const base = server.listeners('request')[0]
  server.removeAllListeners('request')
  server.on('request', (req, res) => {
    if (req.url.startsWith('/api/')) return base(req, res)
    // ⚠️ AUDIT 2026-07-25 (S-2) : `join` résolvait les `..` — une requête brute
    // `/../data/auth.json` sortait du dossier statique et servait le registre
    // d'authentification. Désormais : résolution PUIS preuve de confinement.
    const root = resolve(STATIC)
    let p
    try { p = resolve(root, '.' + normalize('/' + decodeURIComponent(req.url.split('?')[0]))) } catch { p = root }
    if (!p.startsWith(root + sep) && p !== root) p = join(root, 'index.html')
    if (req.url === '/' || !existsSync(p) || !statSync(p).isFile()) p = join(root, 'index.html')
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'text/html', 'x-content-type-options': 'nosniff' })
    res.end(readFileSync(p))
  })
}

if (process.env.NODE_ENV !== 'test') {
  store.backup()
  setInterval(() => store.backup(), 6 * 60 * 60 * 1000)
  server.listen(PORT, () => console.log(`Coreon serveur · http://0.0.0.0:${PORT} · rev ${school.rev} · données ${DATA}`))
}
