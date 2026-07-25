// ════════════════════════════════════════════════════════════════════════════
// LE JOURNAL DU JOUR — petite enfance.
//
// C'est LE trou du marché. Recherche du 2026-07-13 (kogia-research), constat
// vérifié 3-0 : la surface fonctionnelle de la petite enfance est « le plus
// grand écart de capacité entre les plateformes petite enfance et les ERP
// scolaires généralistes ». PowerSchool, iSAMS, Classter ne l'ont PAS.
// Famly et Procare l'ont — mais eux ne savent pas faire l'école.
//
// Coreon EDU fait les deux. C'est notre position sur le marché.
//
// Ce que le parent d'un enfant de 3 ans veut savoir en rentrant du travail :
// a-t-il mangé, a-t-il dormi, comment allait-il, que s'est-il passé.
// Pas une note sur 20.
// ════════════════════════════════════════════════════════════════════════════
import { db, save } from './db.js'
import { todayIso, now, nowMs, ms } from './clock.js'

/** Les repas. `ate` : ce que l'enfant a RÉELLEMENT mangé — pas ce qui a été servi. */
export const MEALS = [
  { key: 'petitdej', label: 'Petit-déjeuner', icon: 'Croissant' },
  { key: 'collation', label: 'Collation',     icon: 'Apple' },
  { key: 'dejeuner',  label: 'Déjeuner',      icon: 'UtensilsCrossed' },
  { key: 'gouter',    label: 'Goûter',        icon: 'Cookie' },
]
export const ATE = [
  { key: 'tout',   label: 'Tout',      tone: 'ok' },
  { key: 'moitie', label: 'La moitié', tone: 'warn' },
  { key: 'peu',    label: 'Très peu',  tone: 'danger' },
  { key: 'rien',   label: 'Rien',      tone: 'danger' },
]

/** L'humeur — observée, jamais jugée. Un enfant n'a pas une « mauvaise note » d'humeur. */
export const MOODS = [
  { key: 'joyeux',  label: 'Joyeux',    icon: 'Smile' },
  { key: 'calme',   label: 'Calme',     icon: 'Meh' },
  { key: 'fatigue', label: 'Fatigué',   icon: 'Moon' },
  { key: 'grognon', label: 'Grognon',   icon: 'Frown' },
  { key: 'malade',  label: 'Souffrant', icon: 'Thermometer' },
]

/** Le change (couches). Uniquement crèche / pré-maternelle. */
export const DIAPER = [
  { key: 'propre',  label: 'Propre',  tone: 'ok' },
  { key: 'mouille', label: 'Mouillé', tone: 'info' },
  { key: 'sale',    label: 'Sale',    tone: 'warn' },
]

/** L'entrée du jour, pour UN enfant. Créée à la volée : pas de ligne vide en base. */
export function entry(childId, date = todayIso()) {
  const d = db()
  const j = (d.journal || []).find(e => e.childId === childId && e.date === date)
  return j || { childId, date, meals: {}, naps: [], diapers: [], mood: null, note: '', photos: [], sentAt: null }
}

export function entriesOfDay(classId, date = todayIso()) {
  const d = db()
  const kids = (d.students || []).filter(s => s.classId === classId)
  return kids.map(s => ({ child: s, j: entry(s.id, date) }))
}

function upsert(childId, date, patch) {
  const d = db()
  d.journal = d.journal || []
  const i = d.journal.findIndex(e => e.childId === childId && e.date === date)
  const base = i >= 0 ? d.journal[i] : { childId, date, meals: {}, naps: [], diapers: [], mood: null, note: '', photos: [], sentAt: null }
  const next = { ...base, ...patch }
  if (i >= 0) d.journal[i] = next; else d.journal.push(next)
  save(d)
  return next
}

/** Un repas : ce que l'enfant a mangé. Un seul geste par repas. */
export const setMeal = (childId, meal, ate, date = todayIso()) =>
  upsert(childId, date, { meals: { ...entry(childId, date).meals, [meal]: ate } })

/** Une sieste. On enregistre le DÉBUT, puis la FIN — comme dans la vraie vie. */
export function startNap(childId, date = todayIso()) {
  const naps = [...entry(childId, date).naps, { from: nowMs(), to: null }]
  return upsert(childId, date, { naps })
}
export function endNap(childId, date = todayIso()) {
  const naps = [...entry(childId, date).naps]
  const open = naps.findIndex(n => !n.to)
  if (open < 0) return entry(childId, date)
  naps[open] = { ...naps[open], to: nowMs() }
  return upsert(childId, date, { naps })
}
export const isNapping = j => (j.naps || []).some(n => !n.to)
export const napMinutes = j =>
  (j.naps || []).reduce((m, n) => m + (n.to ? Math.round((ms(n.to) - ms(n.from)) / 60000) : 0), 0)

export const addDiaper = (childId, kind, date = todayIso()) =>
  upsert(childId, date, { diapers: [...entry(childId, date).diapers, { kind, at: nowMs() }] })

export const setMood = (childId, mood, date = todayIso()) => upsert(childId, date, { mood })
export const setNote = (childId, note, date = todayIso()) => upsert(childId, date, { note })

/**
 * ENVOYER LE JOURNAL AU PARENT.
 *
 * Rien n'est visible du parent tant que l'enseignante n'a pas envoyé. C'est
 * délibéré : un journal à moitié rempli, lu en direct par un parent inquiet,
 * cause plus de mal que de bien. On envoie une fois, à la fin de la journée,
 * quand la journée est vraie.
 */
export const sendToParents = (childId, date = todayIso()) => upsert(childId, date, { sentAt: nowMs() })
export const isSent = j => !!j.sentAt

/** Ce que le parent voit. Jamais un journal non envoyé. */
export function forParent(childId, date = todayIso()) {
  const j = entry(childId, date)
  return isSent(j) ? j : null
}

/** Le résumé d'une classe, pour l'écran de l'enseignante : où en est la journée. */
export function classSummary(classId, date = todayIso()) {
  const rows = entriesOfDay(classId, date)
  return {
    total: rows.length,
    napping: rows.filter(r => isNapping(r.j)).length,
    sent: rows.filter(r => isSent(r.j)).length,
    noMeal: rows.filter(r => !Object.keys(r.j.meals || {}).length).length,
  }
}
