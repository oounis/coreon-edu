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
import { readFileSync, existsSync } from 'node:fs'
import { hashPw, checkPw } from './pw.mjs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeStore } from './store.mjs'
import { setStorage } from '../core/src/storage.js'
import { blobForStaff, blobForParent, mergeWrite } from '../core/src/acl.js'
import { acknowledge } from '../core/src/accidents.js'
import { toggleLike } from '../core/src/gallery.js'
import { apply as applyAdmission } from '../core/src/admissions.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 8787)
const DATA = process.env.COREON_DATA || join(HERE, 'data')
const ORIGINS = (process.env.COREON_ORIGINS || 'http://localhost:5173,http://localhost:8123').split(',')
const STATIC = process.env.COREON_STATIC ? join(HERE, process.env.COREON_STATIC) : null
const SESSION_TTL = 8 * 60 * 60 * 1000

const store = makeStore(DATA)
let school = store.read('school', null)          // { rev, blob }
let auth = store.read('auth', { users: [], sessions: {} })
if (!school) { console.error('Aucune école : lancez d\'abord  node server/import.mjs  (voir README)'); process.exit(1) }

const persistSchool = () => store.write('school', school)
const persistAuth = () => store.write('auth', auth)

// ── Sessions ──────────────────────────────────────────────────────────────────
const openSession = userId => {
  const token = randomBytes(24).toString('hex')
  auth.sessions[token] = { userId, exp: Date.now() + SESSION_TTL }
  // ménage : les sessions mortes ne s'accumulent pas
  for (const [t, s] of Object.entries(auth.sessions)) if (s.exp < Date.now()) delete auth.sessions[t]
  persistAuth()
  return token
}
const sessionUser = req => {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const s = auth.sessions[token]
  if (!s || s.exp < Date.now()) return null
  const u = (school.blob.users || []).find(u => u.id === s.userId) || null
  // Désactiver un compte doit couper l'accès TOUT DE SUITE — pas à l'expiration
  // du jeton (8 h plus tard). On vérifie `disabled` à CHAQUE requête, et on tue
  // la session au passage : la Direction ferme la porte, elle se ferme.
  if (u && u.disabled) { delete auth.sessions[token]; persistAuth(); return null }
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

// ── Mot de passe oublié ───────────────────────────────────────────────────────
// Règles tenues ici, pas dans le client : un jeton est un secret, il ne se
// fabrique jamais dans le navigateur.
//   · à usage unique, 60 minutes de vie
//   · la réponse est TOUJOURS la même — savoir si un compte existe est déjà
//     une fuite (on ne dit pas à un inconnu qui travaille dans l'école)
//   · réinitialiser ferme toutes les sessions ouvertes du compte : si un
//     intrus était déjà entré, le changement le met dehors
const RESET_TTL = 60 * 60 * 1000
auth.resets = auth.resets || {}

const openReset = userId => {
  const token = randomBytes(24).toString('hex')
  auth.resets[token] = { userId, exp: Date.now() + RESET_TTL }
  for (const [t, r] of Object.entries(auth.resets)) if (r.exp < Date.now()) delete auth.resets[t]
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

async function sendResetMail(to, token) {
  const link = `${APP_URL}/#/reinitialiser?token=${token}`
  const subject = 'Coreon EDU · réinitialiser votre mot de passe'
  const text =
    `Vous avez demandé un nouveau mot de passe.\n\n${link}\n\n` +
    `Ce lien est valable 60 minutes et ne fonctionne qu'une seule fois.\n` +
    `Si vous n'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.\n\n` +
    `Besoin d'aide : ${SUPPORT}\nCoreon EDU, Kogia Group`
  if (!MAIL_RELAY) { console.log(`[mot de passe oublié] ${to} → ${link}`); return { ok: false, via: 'no-relay' } }
  try {
    const r = await fetch(MAIL_RELAY, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(MAIL_TOKEN ? { authorization: `Bearer ${MAIL_TOKEN}` } : {}) },
      body: JSON.stringify({ to, subject, text }),
    })
    return { ok: r.ok, via: r.ok ? 'sent' : 'relay-error' }
  } catch (e) { return { ok: false, via: 'error', error: String(e?.message || e) } }
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
      const { email, pw } = await readBody(req)
      const cred = auth.users.find(u => u.email.toLowerCase() === String(email || '').trim().toLowerCase())
      const user = cred && (school.blob.users || []).find(u => u.id === cred.id)
      if (!cred || !user || !checkPw(pw, cred.hash)) return send(res, 401, { error: 'E-mail ou mot de passe incorrect.' }, origin)
      if (user.disabled) return send(res, 403, { error: 'Compte désactivé par la Direction.' }, origin)
      const { pw: _, ...safe } = user
      return send(res, 200, { token: openSession(user.id), user: safe }, origin)
    }

    if (url.pathname === '/api/logout' && req.method === 'POST') {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
      delete auth.sessions[token]; persistAuth()
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
      const { token, pw } = await readBody(req)
      const rec = auth.resets[String(token || '')]
      if (!rec || rec.exp < Date.now()) {
        delete auth.resets[String(token || '')]; persistAuth()
        return send(res, 400, { error: 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.' }, origin)
      }
      if (String(pw || '').length < 8) return send(res, 400, { error: 'Le mot de passe doit faire au moins 8 caractères.' }, origin)
      const cred = auth.users.find(u => u.id === rec.userId)
      if (!cred) { delete auth.resets[token]; persistAuth(); return send(res, 400, { error: 'Compte introuvable.' }, origin) }
      cred.hash = hashPw(pw)
      delete auth.resets[token]
      // toutes les sessions du compte tombent : un intrus éventuel est éjecté
      for (const [t, s] of Object.entries(auth.sessions)) if (s.userId === rec.userId) delete auth.sessions[t]
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
      // Les mots de passe créés à l'écran Comptes vont au registre d'auth, jamais au blob.
      for (const u of (blob?.users || [])) {
        if (u.pw) {
          const i = auth.users.findIndex(x => x.id === u.id)
          const rec = { id: u.id, email: u.email, hash: hashPw(u.pw) }
          i >= 0 ? auth.users[i] = rec : auth.users.push(rec)
        }
      }
      persistAuth()
      const { merged, applied } = mergeWrite(school.blob, blob || {}, user.role)
      school = { rev: school.rev + 1, blob: merged }
      persistSchool()
      return send(res, 200, { rev: school.rev, applied }, origin)
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
    let p = join(STATIC, req.url.split('?')[0])
    if (req.url === '/' || !existsSync(p)) p = join(STATIC, 'index.html')
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'text/html' })
    res.end(readFileSync(p))
  })
}

if (process.env.NODE_ENV !== 'test') {
  store.backup()
  setInterval(() => store.backup(), 6 * 60 * 60 * 1000)
  server.listen(PORT, () => console.log(`Coreon serveur · http://0.0.0.0:${PORT} · rev ${school.rev} · données ${DATA}`))
}
