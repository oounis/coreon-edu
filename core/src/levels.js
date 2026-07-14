// ════════════════════════════════════════════════════════════════════════════
// LES NIVEAUX — la colonne vertébrale de Coreon EDU.
//
// Une crèche ne doit JAMAIS voir un emploi du temps de 6ème année. Une école
// primaire ne doit jamais voir un suivi des siestes. Ce fichier est ce qui rend
// cela vrai — et il doit être juste dès maintenant, parce que chaque niveau
// futur (collège, lycée, professionnel) passera par lui.
//
// CE N'EST PAS UN INTERRUPTEUR D'INTERFACE. C'est un MODÈLE DE CAPACITÉS :
//   · un module déclare les niveaux qu'il sert          (MODULE_LEVELS)
//   · une école déclare les niveaux qu'elle accueille   (school.levels)
//   · ce qui existe = l'intersection des deux
//
// POURQUOI ÇA COMPTE COMMERCIALEMENT (recherche du 2026-07-13, kogia-research) :
// le marché est coupé en deux. Les ERP scolaires (PowerSchool, iSAMS, Classter)
// ne savent PAS faire la petite enfance. Les plateformes petite enfance (Famly,
// Procare) ne savent pas faire l'école. Un parent avec un enfant de 3 ans et un
// de 8 ans dans le MÊME établissement a besoin de DEUX applications aujourd'hui.
//
// Coreon EDU couvre les deux sous un seul toit. C'est notre position sur le
// marché, pas une fonctionnalité en plus.
// ════════════════════════════════════════════════════════════════════════════

/** Les cycles. Un cycle regroupe des niveaux qui partagent une pédagogie. */
export const CYCLES = {
  petiteEnfance: { key: 'petiteEnfance', label: 'Petite enfance', short: 'Crèche & maternelle' },
  primaire:      { key: 'primaire',      label: 'Primaire',       short: 'École primaire' },
}

/**
 * Les niveaux, dans l'ordre réel de progression d'un enfant.
 * `age` sert à la validation d'inscription (et plus tard aux passages de classe).
 */
export const LEVELS = [
  { key: 'nursery', label: 'Crèche',        cycle: 'petiteEnfance', order: 1, age: [0, 3] },
  { key: 'prekg',   label: 'Pré-maternelle', cycle: 'petiteEnfance', order: 2, age: [3, 4] },
  { key: 'kg1',     label: 'Maternelle 1',   cycle: 'petiteEnfance', order: 3, age: [4, 5] },
  { key: 'kg2',     label: 'Maternelle 2',   cycle: 'petiteEnfance', order: 4, age: [5, 6] },
  { key: 'g1',      label: '1ère année',     cycle: 'primaire',      order: 5, age: [6, 7] },
  { key: 'g2',      label: '2ème année',     cycle: 'primaire',      order: 6, age: [7, 8] },
  { key: 'g3',      label: '3ème année',     cycle: 'primaire',      order: 7, age: [8, 9] },
  { key: 'g4',      label: '4ème année',     cycle: 'primaire',      order: 8, age: [9, 10] },
  { key: 'g5',      label: '5ème année',     cycle: 'primaire',      order: 9, age: [10, 11] },
  { key: 'g6',      label: '6ème année',     cycle: 'primaire',      order: 10, age: [11, 12] },
]

export const LEVEL_KEYS = LEVELS.map(l => l.key)
export const EARLY_YEARS = LEVELS.filter(l => l.cycle === 'petiteEnfance').map(l => l.key)
export const PRIMARY     = LEVELS.filter(l => l.cycle === 'primaire').map(l => l.key)

export const levelOf  = key => LEVELS.find(l => l.key === key) || null
export const labelOf  = key => (levelOf(key)?.label) || key
export const cycleOf  = key => levelOf(key)?.cycle || null
export const isEarly  = key => cycleOf(key) === 'petiteEnfance'

/** Le niveau suivant — c'est la base du passage de classe (voir §3 de la recherche). */
export const nextLevel = key => {
  const l = levelOf(key)
  if (!l) return null
  return LEVELS.find(x => x.order === l.order + 1) || null  // null = fin de cycle → diplômé
}

/**
 * QUELS NIVEAUX CHAQUE MODULE SERT.
 *
 * `'*'`     = tous les niveaux (le socle : présence, frais, communication…)
 * `EARLY`   = petite enfance uniquement (sieste, repas, change…)
 * `PRIMARY` = primaire uniquement (emploi du temps par matière, examens…)
 *
 * NOS IDÉES (évaluation quotidienne, suivi parent, suivi de classe) sont
 * volontairement en `'*'` : ce sont des comportements NÉS en petite enfance que
 * personne n'a fait remonter à l'école primaire. Coreon EDU les fait remonter.
 */
const EARLY = EARLY_YEARS
const PRIM  = PRIMARY

export const MODULE_LEVELS = {
  // ── Le socle : tous les niveaux ──────────────────────────────────────────
  evaluate:   '*',   // NOTRE idée — l'évaluation quotidienne, de la crèche au CM2
  live:       '*',   // NOTRE idée — la journée de l'enfant, en direct
  attendance: '*',
  results:    '*',
  finance:    '*',
  payments:   '*',
  incidents:  '*',
  requests:   '*',
  social:     '*',
  security:   '*',
  events:     '*',
  messages:   '*',
  notices:    '*',
  staff:      '*',
  admissions: '*',
  hr:         '*',
  accounting: '*',
  academic:   '*',
  facilities: '*',
  accidents:  '*',
  interop:    '*',
  pointage:   '*',

  // ── Petite enfance uniquement ────────────────────────────────────────────
  // C'est le trou du marché : aucun ERP scolaire généraliste n'a ça.
  childfile:  EARLY, // Santé, vaccins, personnes autorisées, jalons
  journal:    EARLY, // Le journal du jour : repas, sieste, change, humeur
  milestones: EARLY, // Le développement de l'enfant (jalons observés)
  health:     EARLY, // Vaccins, allergies, traitements
  pickup:     EARLY, // Personnes autorisées à récupérer l'enfant

  // ── Primaire uniquement ──────────────────────────────────────────────────
  timetable:  PRIM,  // Un emploi du temps par matière n'a pas de sens en crèche
  homework:   PRIM,
  exams:      PRIM,
  library:    PRIM,
  transport:  '*',
}

/** Le module `m` sert-il le niveau `level` ? */
export function moduleServesLevel(m, level) {
  const spec = MODULE_LEVELS[m]
  if (spec === undefined) return true      // module non classé = socle
  if (spec === '*') return true
  return spec.includes(level)
}

/**
 * Le module `m` a-t-il un sens pour une école qui accueille `schoolLevels` ?
 * Vrai dès qu'UN SEUL niveau de l'école est servi — une école qui a une crèche
 * ET un primaire voit les deux mondes, et c'est exactement l'intérêt.
 */
export function moduleForSchool(m, schoolLevels = []) {
  const spec = MODULE_LEVELS[m]
  if (spec === undefined || spec === '*') return true
  if (!schoolLevels.length) return true    // école non configurée : on ne cache rien
  return schoolLevels.some(l => spec.includes(l))
}

/** Les niveaux d'une école, dans l'ordre. Tolère une école pas encore configurée. */
export function schoolLevels(school) {
  const raw = school?.levels
  if (!Array.isArray(raw) || !raw.length) return PRIMARY   // défaut historique
  return LEVEL_KEYS.filter(k => raw.includes(k))
}

/** L'école accueille-t-elle de la petite enfance ? (pilote les écrans du journal) */
export const hasEarlyYears = school => schoolLevels(school).some(isEarly)
export const hasPrimary    = school => schoolLevels(school).some(k => !isEarly(k))
