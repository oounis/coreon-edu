// ════════════════════════════════════════════════════════════════════════════
// LA PRÉ-INSCRIPTION, PAR CATÉGORIE DE NIVEAU (CR-008 · CR-009 · CR-010)
//
// Un formulaire unique posait les mêmes questions à tout le monde : le parent
// d'un bébé de 18 mois se voyait demander son ancienne école, et le parent
// d'un CM2 se voyait demander le rythme des siestes. C'est long, c'est confus,
// et l'école récolte des cases vides.
//
// Les dix niveaux tombent dans TROIS catégories qui ne demandent pas la même
// chose :
//   crèche      (0-3 ans)  — le soin prime : rythme, allergies, qui récupère
//   maternelle  (3-6 ans)  — le rythme prime : jours de présence, périscolaire
//   primaire    (6-12 ans) — le parcours prime : école précédente, fratrie
//
// Ce module ne connaît NI React NI le stockage : il décrit les étapes, valide,
// et rend des erreurs. L'écran ne fait que l'afficher — donc les règles sont
// testables sans navigateur, et le mobile s'en sert aussi.
// ════════════════════════════════════════════════════════════════════════════
import { levelOf, cycleOf } from './levels.js'

// ── Catégories ───────────────────────────────────────────────────────────────
export const CATEGORIES = {
  creche:     { key: 'creche',     label: 'Crèche',      levels: ['nursery'] },
  maternelle: { key: 'maternelle', label: 'Maternelle',  levels: ['prekg', 'kg1', 'kg2'] },
  primaire:   { key: 'primaire',   label: 'Primaire',    levels: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'] },
}

export function categoryOf(levelKey) {
  for (const c of Object.values(CATEGORIES)) if (c.levels.includes(levelKey)) return c.key
  // Un niveau inconnu ne fait pas planter la porte d'entrée : on retombe sur le
  // cycle, et à défaut sur le primaire (le jeu de questions le plus neutre).
  return cycleOf(levelKey) === 'petiteEnfance' ? 'maternelle' : 'primaire'
}

// ── Rythmes proposés (CR-008 : « preferred programs ») ───────────────────────
export const RYTHMES = [
  { key: 'd2', label: '2 jours par semaine' },
  { key: 'd3', label: '3 jours par semaine' },
  { key: 'd4', label: '4 jours par semaine' },
  { key: 'd5', label: '5 jours par semaine' },
]
export const PERISCOLAIRE = [
  { key: 'before', label: 'Accueil du matin' },
  { key: 'after', label: 'Accueil du soir' },
  { key: 'both', label: 'Matin et soir' },
  { key: 'none', label: 'Aucun' },
]

// ── Les étapes ───────────────────────────────────────────────────────────────
// `req` : obligatoire. `only` : catégories concernées (absent = toutes).
// Types : text · date · tel · email · select · radio · textarea · checkbox ·
//         chips (choix unique visuel) · address (bloc) · files · terms
const F = (name, label, type = 'text', extra = {}) => ({ name, label, type, ...extra })

export const STEPS = [
  {
    key: 'enfant', title: 'L’enfant', hint: 'Qui allez-vous nous confier ?',
    fields: [
      F('childFirstName', 'Prénom de l’enfant', 'text', { req: true, placeholder: 'Amira' }),
      F('childLastName', 'Nom de l’enfant', 'text', { req: true, placeholder: 'Ben Salah' }),
      F('dob', 'Date de naissance', 'date', { req: true }),
      F('gender', 'Sexe', 'radio', { options: ['Fille', 'Garçon'] }),
      F('level', 'Niveau demandé', 'chips', { req: true }),
      F('birthPlace', 'Lieu de naissance', 'text', { placeholder: 'Tunis' }),
      F('nationality', 'Nationalité', 'text', { placeholder: 'Tunisienne' }),
    ],
  },
  {
    key: 'famille', title: 'La famille', hint: 'Qui contacter, et où vous écrire.',
    fields: [
      F('motherFirstName', 'Prénom de la mère', 'text'),
      F('motherLastName', 'Nom de la mère', 'text'),
      F('motherPhone', 'Téléphone de la mère', 'tel', { placeholder: '+216 20 000 000' }),
      F('motherEmail', 'E-mail de la mère', 'email'),
      F('motherJob', 'Profession de la mère', 'text'),
      F('fatherFirstName', 'Prénom du père', 'text'),
      F('fatherLastName', 'Nom du père', 'text'),
      F('fatherPhone', 'Téléphone du père', 'tel', { placeholder: '+216 20 000 000' }),
      F('fatherEmail', 'E-mail du père', 'email'),
      F('fatherJob', 'Profession du père', 'text'),
      F('address', 'Adresse du domicile', 'address'),
    ],
  },
  {
    key: 'sante', title: 'Santé', hint: 'Ce que l’équipe doit savoir pour protéger votre enfant.',
    fields: [
      F('hasCondition', 'Votre enfant a-t-il une allergie, une maladie, un handicap ou un suivi médical ?', 'radio', { req: true, options: ['Non', 'Oui'] }),
      F('conditionDetail', 'Si oui, décrivez-le', 'textarea', { showIf: f => f.hasCondition === 'Oui', req: true, placeholder: 'Allergie à l’arachide : trousse d’urgence fournie.' }),
      F('doctorName', 'Médecin traitant', 'text'),
      F('doctorPhone', 'Téléphone du médecin', 'tel'),
      F('emergencyName', 'Personne à prévenir en urgence', 'text', { req: true }),
      F('emergencyPhone', 'Téléphone d’urgence', 'tel', { req: true }),
      F('teachersNote', 'Autre chose que l’équipe devrait savoir ?', 'textarea'),
    ],
  },
  {
    key: 'rythme', title: 'Le rythme', hint: 'Comment se passera la semaine.',
    only: ['creche', 'maternelle'],
    fields: [
      F('rythme', 'Jours de présence souhaités', 'chips', { req: true, options: RYTHMES }),
      F('periscolaire', 'Accueil périscolaire', 'chips', { options: PERISCOLAIRE }),
      F('napHabits', 'Habitudes de sieste', 'text', { only: ['creche'], placeholder: '13h-15h, avec sa doudou' }),
      F('mealHabits', 'Habitudes de repas', 'text', { only: ['creche'], placeholder: 'Mange seul, n’aime pas les épinards' }),
      F('diaper', 'Propreté acquise ?', 'radio', { only: ['creche'], options: ['Oui', 'Pas encore', 'En cours'] }),
      F('startDate', 'Date d’entrée souhaitée', 'date'),
    ],
  },
  {
    key: 'parcours', title: 'Le parcours', hint: 'D’où vient votre enfant.',
    only: ['maternelle', 'primaire'],
    fields: [
      F('prevSchool', 'École ou crèche précédente', 'text', { placeholder: 'Aucune, si c’est sa première' }),
      F('prevYears', 'Combien de temps y est-il resté ?', 'text', { placeholder: '2 ans' }),
      F('prevLevel', 'Dernier niveau suivi', 'text', { only: ['primaire'] }),
      F('siblings', 'Frères et sœurs déjà dans l’école', 'textarea', { placeholder: 'Nom, âge et classe' }),
      F('startDate', 'Date d’entrée souhaitée', 'date'),
    ],
  },
  {
    key: 'pieces', title: 'Les pièces', hint: 'Joignez ce que vous avez sous la main. Rien n’est obligatoire maintenant.',
    fields: [F('files', 'Pièces justificatives', 'files')],
  },
  {
    key: 'engagement', title: 'Engagement', hint: 'À lire avant d’envoyer.',
    fields: [
      F('parentName', 'Nom du parent ou tuteur qui dépose', 'text', { req: true }),
      F('parentPhone', 'Téléphone joignable', 'tel', { req: true, placeholder: '+216 20 000 000' }),
      F('parentEmail', 'E-mail (pour recevoir le suivi)', 'email'),
      F('terms', 'Conditions', 'terms', { req: true }),
      F('note', 'Un mot pour l’école (facultatif)', 'textarea'),
    ],
  },
]

/** Les étapes qui concernent réellement cette catégorie. */
export function stepsFor(category) {
  return STEPS
    .filter(s => !s.only || s.only.includes(category))
    .map(s => ({ ...s, fields: s.fields.filter(f => !f.only || f.only.includes(category)) }))
}

// ── Les conditions (CR-009) ──────────────────────────────────────────────────
// Adaptées d'un formulaire d'inscription standard, débarrassées de ce qui n'est
// pas transposable (montants, confession, chèques). Ce sont des ENGAGEMENTS,
// pas des cases décoratives : chacun est daté et conservé avec la candidature.
export const TERMS = [
  { key: 'fees', text: 'Si mon enfant est accepté, je m’engage à régler les frais de scolarité selon l’échéancier de l’école, et à prévenir la direction en cas de difficulté.' },
  { key: 'notice', text: 'En cas de retrait, je préviendrai l’école au moins un mois à l’avance.' },
  { key: 'health', text: 'Je fournirai le carnet de vaccination à jour avant le premier jour de classe.' },
  { key: 'changes', text: 'Je signalerai à l’école tout changement des informations données ici (adresse, téléphone, santé, personnes autorisées).' },
  { key: 'trial', text: 'Je comprends que l’inscription définitive dépend des places disponibles, et qu’une période d’essai permet à l’école comme à la famille de s’assurer que le projet convient à l’enfant.' },
  { key: 'data', text: 'J’autorise l’école à traiter ces informations pour la scolarité de mon enfant. Je peux demander à les consulter, les corriger ou les supprimer à tout moment.' },
]

// ── Validation ───────────────────────────────────────────────────────────────
export const PHONE_RE = /^[\d\s+().-]{8,}$/
export const EMAIL_RE = /^\S+@\S+\.\S+$/

const MSG = {
  required: 'Cette information est nécessaire.',
  phone: 'Un numéro joignable, s’il vous plaît.',
  email: 'Cette adresse ne semble pas valide.',
  future: 'Une date de naissance ne peut pas être dans le futur.',
  terms: 'Merci d’accepter les conditions avant d’envoyer.',
  contact: 'Laissez au moins un moyen de vous joindre : téléphone ou e-mail.',
}

/** Erreurs d'UNE étape. Rend {} si tout va bien. */
export function validateStep(step, f) {
  const e = {}
  for (const field of step.fields) {
    if (field.showIf && !field.showIf(f)) continue
    const v = f[field.name]
    if (field.type === 'terms') {
      if (field.req && !TERMS.every(x => (f.terms || {})[x.key])) e.terms = MSG.terms
      continue
    }
    if (field.type === 'files') continue                       // jamais bloquant
    if (field.req && (v === undefined || v === null || String(v).trim() === '')) { e[field.name] = MSG.required; continue }
    if (!v) continue
    if (field.type === 'tel' && !PHONE_RE.test(String(v))) e[field.name] = MSG.phone
    if (field.type === 'email' && !EMAIL_RE.test(String(v))) e[field.name] = MSG.email
    if (field.name === 'dob' && new Date(v) > new Date()) e.dob = MSG.future
  }
  // La famille : on n'exige aucun parent en particulier, mais on exige un contact.
  if (step.key === 'famille') {
    const joignable = [f.motherPhone, f.fatherPhone, f.motherEmail, f.fatherEmail].some(x => String(x || '').trim())
    if (!joignable) e._step = MSG.contact
  }
  return e
}

/** Toutes les erreurs du dossier, étape par étape. */
export function validateAll(category, f) {
  const out = {}
  for (const s of stepsFor(category)) Object.assign(out, validateStep(s, f))
  return out
}

/** Ce qu'on envoie à admissions.apply() — nom d'affichage compris. */
export function toApplication(f) {
  const childName = [f.childFirstName, f.childLastName].filter(Boolean).join(' ').trim()
  return {
    ...f,
    childName,
    acceptedTerms: TERMS.filter(x => (f.terms || {})[x.key]).map(x => x.key),
    acceptedAt: new Date().toISOString(),
  }
}

export const LEVEL_LABEL = key => levelOf(key)?.label || key
