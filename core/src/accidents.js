// ════════════════════════════════════════════════════════════════════════════
// DÉCLARATION D'ACCIDENT — la chaîne de confiance entre l'école et le parent.
//
// Recherche (kogia-research, vérifié 3-0) : chez Famly et Procare, la déclaration
// d'accident n'est PAS un formulaire — c'est un WORKFLOW COMPLET :
//   dossier structuré → SCHÉMA CORPOREL interactif → APPROBATION à DEUX NIVEAUX
//   → ACCUSÉ DE RÉCEPTION NUMÉRIQUE du parent → RELANCE automatique s'il ne lit pas.
// La recherche l'a désigné comme « le motif le plus transférable et le plus
// difficile à copier pour un nouvel entrant ».
//
// POURQUOI C'EST LE MODULE LE PLUS IMPORTANT DU PRODUIT :
// ce n'est pas une fonctionnalité, c'est une CHAÎNE DE CUSTODIE JURIDIQUE. Le jour
// où un parent dit « personne ne m'a prévenu que mon fils s'était ouvert l'arcade »,
// l'école doit pouvoir montrer : qui a vu, qui a soigné, qui a validé, à quelle
// heure le parent a lu, et qu'il a signé. Sans ça, c'est la parole contre la parole
// — et l'école perd toujours.
//
// LES RÈGLES :
//  1. DEUX PAIRES D'YEUX. Celui qui déclare ne valide pas. Un adulte témoin
//     rédige, un responsable valide. C'est ce qui rend le document crédible.
//  2. LE PARENT DOIT ACCUSER RÉCEPTION. Envoyé ≠ lu. Lu ≠ signé.
//  3. S'IL NE SIGNE PAS, ON RELANCE — et l'école VOIT qui n'a pas signé.
//     Un accident non accusé est une bombe à retardement.
//  4. RIEN NE S'EFFACE. On corrige par un ajout daté, jamais en réécrivant.
// ════════════════════════════════════════════════════════════════════════════
import { db, save } from './db.js'
import { now } from './clock.js'

/** Le schéma corporel. Un adulte pointe où l'enfant s'est fait mal — il n'écrit pas. */
export const BODY_ZONES = [
  { key: 'tete',        label: 'Tête',            x: 50, y: 8 },
  { key: 'visage',      label: 'Visage',          x: 50, y: 15 },
  { key: 'cou',         label: 'Cou',             x: 50, y: 22 },
  { key: 'epaule_g',    label: 'Épaule gauche',   x: 33, y: 27 },
  { key: 'epaule_d',    label: 'Épaule droite',   x: 67, y: 27 },
  { key: 'bras_g',      label: 'Bras gauche',     x: 25, y: 40 },
  { key: 'bras_d',      label: 'Bras droit',      x: 75, y: 40 },
  { key: 'main_g',      label: 'Main gauche',     x: 20, y: 52 },
  { key: 'main_d',      label: 'Main droite',     x: 80, y: 52 },
  { key: 'torse',       label: 'Torse',           x: 50, y: 36 },
  { key: 'ventre',      label: 'Ventre',          x: 50, y: 47 },
  { key: 'dos',         label: 'Dos',             x: 50, y: 42 },
  { key: 'hanche',      label: 'Hanche',          x: 50, y: 55 },
  { key: 'jambe_g',     label: 'Jambe gauche',    x: 42, y: 70 },
  { key: 'jambe_d',     label: 'Jambe droite',    x: 58, y: 70 },
  { key: 'genou_g',     label: 'Genou gauche',    x: 42, y: 65 },
  { key: 'genou_d',     label: 'Genou droit',     x: 58, y: 65 },
  { key: 'pied_g',      label: 'Pied gauche',     x: 42, y: 90 },
  { key: 'pied_d',      label: 'Pied droit',      x: 58, y: 90 },
]

export const INJURY_KINDS = {
  bosse:    { key: 'bosse',    label: 'Bosse' },
  coupure:  { key: 'coupure',  label: 'Coupure' },
  eraflure: { key: 'eraflure', label: 'Éraflure' },
  morsure:  { key: 'morsure',  label: 'Morsure' },
  brulure:  { key: 'brulure',  label: 'Brûlure' },
  chute:    { key: 'chute',    label: 'Chute' },
  autre:    { key: 'autre',    label: 'Autre' },
}

export const CARE = {
  lavage:   'Lavé à l’eau',
  glace:    'Poche de glace',
  pansement:'Pansement',
  desinfect:'Désinfection',
  repos:    'Mis au repos',
  infirmerie:'Conduit à l’infirmerie',
  medecin:  'Médecin appelé',
  samu:     'SAMU (190) appelé',
}

/** Le cycle de vie. Chaque étape est une SIGNATURE, pas un statut décoratif. */
export const STAGES = {
  brouillon: { key: 'brouillon', label: 'Rédigé',           tone: 'neutral' },
  valide:    { key: 'valide',    label: 'Validé',           tone: 'info'    },
  envoye:    { key: 'envoye',    label: 'Envoyé au parent', tone: 'warn'    },
  accuse:    { key: 'accuse',    label: 'Accusé par le parent', tone: 'ok'  },
}

export const SEVERITY = {
  benin:  { key: 'benin',  label: 'Bénin',       tone: 'ok' },
  moyen:  { key: 'moyen',  label: 'À surveiller', tone: 'warn' },
  grave:  { key: 'grave',  label: 'Grave',       tone: 'danger' },
}

export const accidents = () => db().accidents || []
export const accidentOf = id => accidents().find(a => a.id === id) || null
export const forChild = childId => accidents().filter(a => a.childId === childId)

function write(next) { const d = db(); d.accidents = next; save(d) }

/** Déclarer. C'est l'adulte TÉMOIN qui rédige — celui qui a vu. */
export function declare({ childId, zones, kind, severity, whatHappened, care, at, byId, byName }) {
  if (!childId) return { error: 'Quel enfant ?' }
  if (!zones?.length) return { error: 'Indiquez où l’enfant s’est fait mal, sur le schéma.' }
  if (!whatHappened?.trim()) return { error: 'Racontez ce qui s’est passé : c’est ce que le parent lira.' }

  const a = {
    id: 'ac' + Date.now().toString(36),
    childId, zones, kind, severity,
    whatHappened: whatHappened.trim(),
    care: care || [],
    at: at || now(),
    stage: 'brouillon',
    witness: { id: byId, name: byName, at: now() },   // qui a VU
    approver: null,                                    // qui a VALIDÉ
    sentAt: null,
    ack: null,                                         // { by, at } — le parent a SIGNÉ
    reminders: [],                                     // les relances, datées
    notes: [],                                         // les ajouts — on ne réécrit rien
  }
  write([a, ...accidents()])
  return { accident: a }
}

/**
 * RÈGLE 1 — DEUX PAIRES D'YEUX. Celui qui a déclaré ne peut pas valider.
 * C'est ce qui rend le document crédible : un adulte a vu, un autre a contrôlé.
 */
export function approve(id, byId, byName) {
  const a = accidentOf(id)
  if (!a) return { error: 'Déclaration introuvable.' }
  if (a.stage !== 'brouillon') return { error: 'Déjà validée.' }
  if (a.witness.id === byId) {
    return { error: 'Vous avez rédigé cette déclaration : un autre responsable doit la valider. Deux paires d’yeux, toujours.' }
  }
  write(accidents().map(x => x.id !== id ? x
    : { ...x, stage: 'valide', approver: { id: byId, name: byName, at: now() } }))
  return { ok: true }
}

/** Envoyer au parent. Seulement APRÈS validation — jamais un brouillon. */
export function sendToParent(id) {
  const a = accidentOf(id)
  if (!a) return { error: 'Déclaration introuvable.' }
  if (a.stage === 'brouillon') return { error: 'Validez la déclaration avant de l’envoyer au parent.' }
  if (a.stage !== 'valide') return { error: 'Déjà envoyée.' }
  write(accidents().map(x => x.id !== id ? x : { ...x, stage: 'envoye', sentAt: now() }))
  return { ok: true }
}

/**
 * RÈGLE 2 — LE PARENT ACCUSE RÉCEPTION. C'est SA signature, pas celle de l'école.
 * Envoyé ≠ lu. Lu ≠ signé. Seul l'accusé vaut preuve.
 */
export function acknowledge(id, parentName) {
  const a = accidentOf(id)
  if (!a) return { error: 'Déclaration introuvable.' }
  if (a.stage !== 'envoye') return { error: 'Rien à accuser.' }
  write(accidents().map(x => x.id !== id ? x
    : { ...x, stage: 'accuse', ack: { by: parentName, at: now() } }))
  return { ok: true }
}

/** RÈGLE 3 — relancer, et garder la trace de chaque relance. */
export function remind(id, by) {
  const a = accidentOf(id)
  if (!a) return { error: 'Déclaration introuvable.' }
  if (a.stage !== 'envoye') return { error: 'Pas de relance nécessaire.' }
  write(accidents().map(x => x.id !== id ? x
    : { ...x, reminders: [...x.reminders, { at: now(), by }] }))
  return { ok: true }
}

/** RÈGLE 4 — on n'efface pas, on AJOUTE. Daté, signé. */
export function addNote(id, text, by) {
  if (!text?.trim()) return { error: 'Une note vide n’ajoute rien.' }
  write(accidents().map(x => x.id !== id ? x
    : { ...x, notes: [...x.notes, { text: text.trim(), by, at: now() }] }))
  return { ok: true }
}

/**
 * CE QUE LA DIRECTION DOIT VOIR EN PREMIER : qui n'a PAS accusé réception.
 * Un accident non accusé est une bombe à retardement — c'est exactement le dossier
 * qui explose six mois plus tard.
 */
export function pendingAck() {
  const HOURS = 3600 * 1000
  return accidents()
    .filter(a => a.stage === 'envoye')
    .map(a => ({ ...a, waitingHours: Math.round((now() - a.sentAt) / HOURS) }))
    .sort((x, y) => y.waitingHours - x.waitingHours)
}

export function stats() {
  const all = accidents()
  return {
    total: all.length,
    aValider: all.filter(a => a.stage === 'brouillon').length,
    aEnvoyer: all.filter(a => a.stage === 'valide').length,
    enAttenteAccuse: all.filter(a => a.stage === 'envoye').length,
    graves: all.filter(a => a.severity === 'grave').length,
  }
}
