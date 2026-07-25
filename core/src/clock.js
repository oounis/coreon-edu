// Horloge de l'application + « mode démo ».
//
// Deux problèmes réglés ici :
//  1. Le gel estival (1er juillet → 14 septembre) rend Évaluer / Appel / Badgeuse /
//     Suivi en direct indémontrables pendant toute la saison de vente. Le mode démo
//     force l'application à se comporter comme un jour de classe ordinaire.
//  2. Les clés de date étaient construites avec toISOString() (UTC) alors que les
//     heures affichées sont locales : entre 00 h et 01 h en Tunisie (UTC+1) tout
//     était enregistré la veille. isoOf() est local.

import { getItem, setItem } from './storage.js'
import { t } from './i18n.js'
import { isWeekendDay, schoolDayIndex } from './locales.js'

const DEMO_KEY = 'coreon_demo_live'
const SCHOOL_OPEN = 8 * 60          // 08:00
const SCHOOL_CLOSE = 15 * 60        // 15:00
const DEMO_PINNED_MIN = 10 * 60 + 30 // 10:30 — milieu de matinée, une séance en cours

// ?live=1 active le mode démo (et le mémorise), ?live=0 le coupe.
// Marche avec HashRouter : on regarde search ET hash.
function fromUrl() {
  if (typeof window === 'undefined') return null
  const s = window.location.search + window.location.hash
  if (/[?&]live=1/.test(s)) return true
  if (/[?&]live=0/.test(s)) return false
  return null
}

export function isDemoLive() {
  const forced = fromUrl()
  if (forced !== null) {
    setItem(DEMO_KEY, forced ? '1' : '0')
    return forced
  }
  return getItem(DEMO_KEY) === '1'
}

export function setDemoLive(on) {
  setItem(DEMO_KEY, on ? '1' : '0')
}

// L'heure vue par l'application. En mode démo, on garde la date réelle (les
// enregistrements restent datés correctement) mais on ramène l'heure dans les
// horaires scolaires si on est en dehors.
export function now() {
  const real = new Date()
  if (!isDemoLive()) return real
  const min = real.getHours() * 60 + real.getMinutes()
  if (min >= SCHOOL_OPEN && min < SCHOOL_CLOSE) return real
  const d = new Date(real)
  d.setHours(Math.floor(DEMO_PINNED_MIN / 60), DEMO_PINNED_MIN % 60, 0, 0)
  return d
}

// 1er jour d'école du PAYS = 0 … 5e = 4 (audit B-2 : lun–ven n'était vrai qu'en
// Tunisie ; au Golfe la semaine commence le dimanche). Le week-end retombe sur
// le premier jour (grille de référence).
export function dayIndex(d = now()) {
  const i = schoolDayIndex(d.getDay())
  return i >= 0 ? Math.min(i, 4) : 0
}

export const isWeekend = (d = now()) => isWeekendDay(d.getDay())

// ⚠️ AUDIT 2026-07-25 (CC-1) : now() renvoie une Date — persistée, elle devient
// une CHAÎNE ISO au rechargement, et `now() - stocké` vaut NaN. Huit modules
// cassaient sur données réelles (accusés d'accident, climat, siestes, tri des
// moments) tout en passant les tests (graines fraîches). Règle désormais :
//   ÉCRIRE  → nowMs()  (un nombre, stable au JSON)
//   LIRE    → ms(x)    (nombre | Date | chaîne ISO → millisecondes)
export const nowMs = () => +now()
export const ms = v => v == null ? 0 : v instanceof Date ? +v : typeof v === 'number' ? v : (Date.parse(v) || 0)

// Date locale au format YYYY-MM-DD (jamais toISOString(), qui est en UTC).
export const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const todayIso = () => isoOf(now())

// La rentrée : 15 septembre de l'année scolaire en cours. Le jour de la semaine
// est calculé, jamais écrit en dur. Formatage français sans dépendance (le web
// utilisait date-fns ici — interdit dans le cœur, Android n'en veut pas).
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export function rentreeDate(ref = now()) {
  // Passé le 15 septembre → la prochaine rentrée est en septembre de l'an prochain.
  // ANCIEN BUG (trouvé au test 2026-07-17) : `month>=8 && date>=15` ratait le
  // 1er octobre (date 1 < 15) et renvoyait la rentrée de CETTE année, déjà passée.
  const m = ref.getMonth(), d = ref.getDate()
  const passed = m > 8 || (m === 8 && d >= 15)
  return new Date(ref.getFullYear() + (passed ? 1 : 0), 8, 15)
}
export function rentreeLabel(ref = now()) {
  const d = rentreeDate(ref)
  return `${t(JOURS[d.getDay()])} ${d.getDate()} ${t(MOIS[d.getMonth()])}`
}
export const frDateLabel = d => `${t(JOURS[d.getDay()])} ${d.getDate()} ${t(MOIS[d.getMonth()])}`

export { SCHOOL_OPEN, SCHOOL_CLOSE }
