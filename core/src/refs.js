// ════════════════════════════════════════════════════════════════════════════
// L'IDENTIFICATION D'ENTREPRISE (CR-017 · CR-018)
//
// DEUX identifiants distincts, qui ne se remplacent JAMAIS :
//
//   1. LA RÉFÉRENCE ERP — générée par le système, identifie le DOSSIER dans le
//      logiciel. C'est ce module.
//   2. L'IDENTITÉ HUMAINE — passeport, CIN, carte de séjour… saisie par un
//      utilisateur, identifie la PERSONNE dans le monde réel. Elle vit à côté,
//      dans les champs { idType, cin } de l'entité (voir locales.js / accounts).
//
// ── Format de la référence ERP ────────────────────────────────────────────────
//   PRÉFIXE-PAYS-TENANT-ÉCOLE-ANNÉE-SÉQUENCE-CLÉ
//   ex.  STD-TN-T001-SCH001-2026-00000001-7
//
//   · PRÉFIXE  — type d'entité (STD élève, TCH enseignant, PAR parent, EMP
//                personnel, INV facture, PAY paiement…)
//   · PAYS     — code ISO du pays (TN, FR, BH, QA…) — du contexte, jamais du client
//   · TENANT   — l'organisation cliente (T001…)      — du contexte
//   · ÉCOLE    — l'établissement (SCH001…)            — du contexte
//   · ANNÉE    — année de création
//   · SÉQUENCE — 8 chiffres, auto-incrément SANS TROU, par (type, école, année)
//   · CLÉ      — chiffre de contrôle (Luhn sur tout le corps) : une référence mal
//                recopiée, ou un mauvais tenant/école, est détectée aussitôt.
//
// ── Sécurité ──────────────────────────────────────────────────────────────────
//   Le CLIENT ne fournit JAMAIS pays / tenant / école / séquence. Ils viennent du
//   CONTEXTE authentifié (en mode serveur : la session/JWT ; en démo : les
//   paramètres de l'école, qui SONT le contexte de confiance). Un enseignant ne
//   peut donc pas fabriquer un dossier pour un autre établissement.
//
// ── Générateur central ────────────────────────────────────────────────────────
//   Ce module EST le générateur unique. Aucun autre module ne fabrique de
//   référence : ils appellent `nextRef` (via db.assignRef). Ajouter un type = une
//   ligne dans PREFIX, rien d'autre. Générique, extensible, sans logique par
//   entité éparpillée.
// ════════════════════════════════════════════════════════════════════════════

// Un préfixe par type d'entité. Court, en lettres, prononçable.
export const PREFIX = {
  student:     'STD',
  teacher:     'TCH',
  parent:      'PAR',
  staff:       'EMP',   // personnel non-enseignant (employee)
  application: 'ADM',   // candidature (admission)
  invoice:     'INV',
  payment:     'PAY',   // paiement / reçu
  request:     'REQ',
  accident:    'ACC',
  incident:    'INC',
  document:    'DOC',
  booking:     'RES',   // réservation d'installation
  expense:     'EXP',
}

const SEQ_WIDTH = 8

// ── Chiffre de contrôle (Luhn sur les chiffres du corps entier) ───────────────
// Les lettres (préfixe, codes pays/tenant/école) sont mappées en chiffres pour
// qu'elles comptent : STD-TN-… et TCH-TN-… n'ont pas la même clé, donc citer le
// mauvais type ou la mauvaise école se voit.
function luhn(numStr) {
  let sum = 0, alt = false
  for (let i = numStr.length - 1; i >= 0; i--) {
    const d = numStr.charCodeAt(i) - 48
    if (d < 0 || d > 9) continue
    let x = d
    if (alt) { x *= 2; if (x > 9) x -= 9 }
    sum += x; alt = !alt
  }
  return (10 - (sum % 10)) % 10
}
const lettersToDigits = s => s.split('').map(c => {
  const u = c.toUpperCase().charCodeAt(0)
  return u >= 65 && u <= 90 ? String(u - 64) : c
}).join('')

/** La clé de contrôle d'un corps (tout sauf la clé finale). */
export function checkDigit(body) {
  return String(luhn(lettersToDigits(body)))
}

/** Normalise un segment de contexte : lettres/chiffres majuscules, jamais vide. */
const seg = (v, fallback) => {
  const s = String(v == null ? '' : v).toUpperCase().replace(/[^A-Z0-9]/g, '')
  return s || fallback
}

/**
 * Assemble une référence à partir de ses parties. Le CLIENT n'appelle pas ceci
 * directement avec des valeurs choisies : le contexte vient de l'appelant de
 * confiance (db.assignRef → paramètres école).
 */
export function buildRef({ type, country, tenant, school, year, seq }) {
  const prefix = PREFIX[type]
  if (!prefix) throw new Error(`Type sans préfixe : ${type}`)
  const body = [
    prefix,
    seg(country, 'XX'),
    seg(tenant, 'T000'),
    seg(school, 'SCH000'),
    String(year),
    String(seq).padStart(SEQ_WIDTH, '0'),
  ].join('-')
  return `${body}-${checkDigit(body)}`
}

/** Découpe une référence en ses parties, ou null si elle est mal formée. */
export function parseRef(ref) {
  const m = /^([A-Z]{2,4})-([A-Z0-9]{2,3})-([A-Z0-9]{2,8})-([A-Z0-9]{2,10})-(\d{4})-(\d{6,10})-(\d)$/.exec(String(ref || '').trim())
  if (!m) return null
  return { prefix: m[1], country: m[2], tenant: m[3], school: m[4], year: m[5], seq: Number(m[6]), check: m[7] }
}

/** Vraie référence bien formée ET clé cohérente. */
export function isValidRef(ref) {
  const p = parseRef(ref)
  if (!p) return false
  const body = String(ref).slice(0, String(ref).lastIndexOf('-'))
  return checkDigit(body) === p.check
}

/** Le type d'une référence, déduit du préfixe. */
export function typeOfRef(ref) {
  const p = parseRef(ref)
  if (!p) return null
  return Object.keys(PREFIX).find(k => PREFIX[k] === p.prefix) || null
}

/**
 * La référence suivante pour un type, dans un contexte donné.
 * @param type      clé de PREFIX ('student'…)
 * @param existing  toutes les références DÉJÀ émises (on n'incrémente que celles
 *                  du même préfixe/pays/tenant/école/année)
 * @param ctx       { country, tenant, school, year } — le contexte de confiance
 */
export function nextRef(type, existing, ctx) {
  const prefix = PREFIX[type]
  if (!prefix) throw new Error(`Type sans préfixe : ${type}`)
  const country = seg(ctx.country, 'XX')
  const tenant = seg(ctx.tenant, 'T000')
  const school = seg(ctx.school, 'SCH000')
  const year = String(ctx.year)
  const head = `${prefix}-${country}-${tenant}-${school}-${year}-`
  // La plus haute séquence déjà émise dans CE contexte (sans trou : +1).
  let max = 0
  for (const r of existing || []) {
    if (!String(r || '').startsWith(head)) continue
    const p = parseRef(r)
    if (p && p.seq > max) max = p.seq
  }
  return buildRef({ type, country, tenant, school, year, seq: max + 1 })
}

// ── UUID (troisième identifiant : API, sync mobile, hors-ligne, intégrations) ─
// La clé technique (BIGINT) reste interne ; l'UUID est l'identifiant STABLE
// exposé aux API et à la synchronisation, jamais montré à l'utilisateur.
// Repli sans WebCrypto (vieux RN) : un xorshift32 semé à l'horloge (ms + fraction
// de performance.now) au premier appel. Deux appareils ne partagent un flux que
// s'ils chargent le module à la même microseconde — même garantie d'UNICITÉ que
// l'ancien Math.random(), sans en être un. Ce n'est PAS secret : jamais utilisé
// pour un mot de passe ou un jeton (ceux-là exigent crypto et échouent sinon).
let etatRepli = 0
const motRepli = () => {
  if (!etatRepli) {
    const p = globalThis.performance && typeof performance.now === 'function' ? performance.now() : 0
    etatRepli = ((Date.now() ^ Math.floor(p * 1e6)) >>> 0) || 0x9e3779b9
  }
  etatRepli ^= etatRepli << 13; etatRepli >>>= 0
  etatRepli ^= etatRepli >>> 17
  etatRepli ^= etatRepli << 5; etatRepli >>>= 0
  return etatRepli
}
/** `n` octets aléatoires en hexadécimal, via WebCrypto (navigateur, Node, Hermes
 *  récent), sinon le repli ci-dessus. CodeQL js/insecure-randomness (2026-08-20) :
 *  Math.random() ne sert plus à forger un identifiant. */
export function randomHex(n = 8) {
  const c = globalThis.crypto
  if (c && typeof c.getRandomValues === 'function') {
    const a = new Uint8Array(n); c.getRandomValues(a)
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('')
  }
  let s = ''
  while (s.length < 2 * n) s += motRepli().toString(16).padStart(8, '0')
  return s.slice(0, 2 * n)
}

export function uuid() {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  // Repli en FORME v4 quand crypto.randomUUID manque (RN ancien).
  const h = randomHex(16).split('')
  h[12] = '4'; h[16] = '89ab'[parseInt(h[16], 16) & 3]
  const s = h.join('')
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
}

// ── QR ────────────────────────────────────────────────────────────────────────
// La référence est une simple chaîne : QR-compatible par nature. Ce helper rend
// l'URL de vérification qu'un futur module (carte élève, certificat, facture)
// encodera, sans jamais changer le format de la référence elle-même.
export function qrPayload(ref, base = 'https://edu.kogiagroup.com') {
  return `${base}/#/verifier/${encodeURIComponent(ref)}`
}
