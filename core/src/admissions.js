// ════════════════════════════════════════════════════════════════════════════
// LES INSCRIPTIONS — de la pré-inscription à l'élève.
//
// Recherche (kogia-research, vérifié 3-0) : la CONTINUITÉ des données entre la
// candidature et le dossier élève — ne PAS ressaisir — est un point de douleur
// reconnu du marché, que PowerSchool et Infinite Campus vendent tous les deux
// comme un MODULE PREMIUM, avec une étape d'approbation explicite qui conditionne
// l'écriture dans le dossier élève.
//
// Donc ici : on ne ressaisit jamais. La candidature DEVIENT l'élève, en un geste,
// et seulement après approbation.
//
// LE PARCOURS RÉEL (et non un formulaire de plus) :
//   candidature → pièces → examen → décision
//                                      ├─ accepté  → place disponible ? → inscrit
//                                      │                    └─ non → LISTE D'ATTENTE
//                                      └─ refusé
//
// La CAPACITÉ est vérifiée au moment de l'inscription, pas à la candidature :
// une place se libère, la liste d'attente avance. C'est comme ça dans la vraie vie.
// ════════════════════════════════════════════════════════════════════════════
import { db, save, classById } from './db.js'
import { now, todayIso } from './clock.js'
import { levelOf, labelOf } from './levels.js'
import { notify } from './notify.js'
import { applicantEmail, emailsApplicant } from './admissions-mail.js'
import { sendMail, mailReady } from './mailer.js'

/** Les étapes. `terminal` = plus rien ne bouge sans une action humaine explicite. */
export const STAGES = {
  nouvelle:   { key: 'nouvelle',   label: 'Nouvelle',        tone: 'info',    next: ['pieces', 'refuse'] },
  pieces:     { key: 'pieces',     label: 'Pièces à fournir', tone: 'warn',   next: ['examen', 'refuse'] },
  examen:     { key: 'examen',     label: 'À l’étude',       tone: 'info',    next: ['accepte', 'refuse'] },
  accepte:    { key: 'accepte',    label: 'Accepté',         tone: 'ok',      next: ['inscrit', 'attente'] },
  attente:    { key: 'attente',    label: 'Liste d’attente', tone: 'warn',    next: ['inscrit', 'refuse'] },
  inscrit:    { key: 'inscrit',    label: 'Inscrit',         tone: 'ok',      terminal: true, next: [] },
  refuse:     { key: 'refuse',     label: 'Refusé',          tone: 'danger',  terminal: true, next: [] },
}

/** Les pièces exigées. Une candidature n'avance pas tant qu'elles manquent. */
export const DOCS = [
  { key: 'naissance', label: 'Acte de naissance', required: true },
  { key: 'photo',     label: 'Photo d’identité',  required: true },
  { key: 'vaccins',   label: 'Carnet de vaccination', required: true, earlyOnly: true },
  { key: 'bulletin',  label: 'Bulletin de l’école précédente', required: false },
  { key: 'domicile',  label: 'Justificatif de domicile', required: true },
]

export const docsFor = level =>
  DOCS.filter(d => !d.earlyOnly || levelOf(level)?.cycle === 'petiteEnfance')

export const applications = () => db().applications || []
export const appById = id => applications().find(a => a.id === id) || null

function write(next) { const d = db(); d.applications = next; save(d) }

// ── Emails au candidat ──────────────────────────────────────────────────────
// On passe par le MAILER CENTRAL (mailer.js) : un seul transport pour toute
// l'app, injecté une fois par l'hôte. `setMailTransport` reste exporté ici par
// commodité (rétro-compatibilité), mais règle le transport central.
export { setMailTransport } from './mailer.js'

// Journalise (et tente d'envoyer) l'email d'une étape. Sans transport, l'email
// est « préparé » et gardé sur le dossier — jamais perdu ni faussé.
function mailApplicant(id, stage, extra = {}) {
  const a = appById(id)
  if (!a || !a.parentEmail || !emailsApplicant(stage)) return
  const mail = applicantEmail(a, stage, extra)
  if (!mail) return
  const eid = 'm' + now().toString(36) + ((a.emails || []).length)
  const entry = { id: eid, at: now(), stage, to: mail.to, subject: mail.subject, status: mailReady() ? 'envoi' : 'préparé' }
  write(applications().map(x => x.id !== id ? x : { ...x, emails: [...(x.emails || []), entry] }))
  if (mailReady()) sendMail(mail).then(r => markEmail(id, eid, r.ok ? 'envoyé' : 'échec'))
}
function markEmail(id, eid, status) {
  write(applications().map(x => x.id !== id ? x
    : { ...x, emails: (x.emails || []).map(e => e.id === eid ? { ...e, status } : e) }))
}
// Les pièces obligatoires encore manquantes — pour l'email « pièces à fournir ».
const missingDocs = a => docsFor(a.level).filter(d => d.required && !hasDoc(a, d.key)).map(d => d.label)

/**
 * Une nouvelle candidature. Le parent la dépose ; l'école ne saisit rien.
 *
 * LE REÇU NE MENT JAMAIS (défaut trouvé par Othman, 2026-07-14) : quatre photos
 * en base64 dépassaient le quota du navigateur, l'écriture échouait EN SILENCE,
 * et le parent repartait avec une référence… d'un dossier jamais enregistré.
 * Désormais on VÉRIFIE que le dossier a été écrit. S'il ne passe pas avec les
 * pièces, on le réessaie SANS les pièces (elles sont facultatives ; l'école les
 * réclamera) et on le dit : `filesDropped`. S'il ne passe toujours pas, on rend
 * une ERREUR — pas un faux reçu.
 * Retourne { app, filesDropped } ou { error }.
 */
export function apply(payload) {
  const { childName, dob, level, parentName, parentPhone, parentEmail, note = '', files = [], ...rest } = payload || {}
  const a = {
    id: 'a' + Date.now().toString(36),
    childName, dob, level,
    parentName, parentPhone, parentEmail, note,
    // Le dossier détaillé (famille, santé, rythme, parcours, engagements)
    // voyage avec la candidature — c'est justement ce qui évite à l'école de
    // rappeler la famille pour décider (CR-008/009/010). Tout est facultatif :
    // une candidature minimale reste valable, comme avant.
    ...rest,
    stage: 'nouvelle',
    // LES PIÈCES SONT DES FICHIERS, pas des cases à cocher. Une pièce « fournie »
    // sans fichier derrière était un mensonge d'interface : l'administration
    // croyait la détenir. Corrigé le 2026-07-14 (défaut trouvé par Othman).
    files,                          // [{ type, name, size, mime, data }]
    createdAt: now(),
    history: [{ at: now(), stage: 'nouvelle', by: 'Parent (en ligne)' }],
    emails: [],                     // journal des emails envoyés au candidat
    studentId: null,                // rempli à l'inscription — la trace du lien
  }
  write([a, ...applications()])
  // La preuve, pas l'espoir : on relit le stockage.
  if (appById(a.id)) return announced({ app: a, filesDropped: false })
  if (files.length) {
    const light = { ...a, files: [], history: [...a.history, { at: now(), stage: 'nouvelle', by: 'Système', note: 'Pièces non conservées (stockage plein) — à réclamer.' }] }
    write([light, ...applications().filter(x => x.id !== a.id)])
    if (appById(a.id)) return announced({ app: light, filesDropped: true })
  }
  return { error: 'Votre candidature n’a pas pu être enregistrée sur cet appareil (stockage plein ou navigation privée). Réessayez, ou contactez l’école directement.' }
}

/** Une candidature qui arrive PRÉVIENT la direction — jamais en silence. */
function announced(r) {
  const { app } = r
  for (const role of ['schooladmin', 'admin']) {
    notify({
      role, kind: 'request', actor: app.parentName,
      title: 'Nouvelle candidature',
      body: `${app.childName} · ${labelOf(app.level)}${app.files.length ? ` · ${app.files.length} pièce(s)` : ''}`,
      link: '/app/admissions',
    })
  }
  // Le candidat, lui, reçoit un accusé de réception par email (son seul canal).
  mailApplicant(app.id, 'nouvelle')
  return r
}

/** L'administration ajoute une pièce reçue au guichet (papier scanné). */
export function setFiles(id, files) {
  write(applications().map(a => a.id !== id ? a : { ...a, files }))
  return appById(id)
}

/** Une pièce est fournie si — et seulement si — le FICHIER existe. */
export const hasDoc = (a, key) => (a.files || []).some(f => f.type === key && f.data)

/** Les pièces obligatoires sont-elles toutes là ? Sinon on ne passe pas à l'étude. */
export function docsComplete(a) {
  return docsFor(a.level).filter(d => d.required).every(d => hasDoc(a, d.key))
}

/** Faire avancer une candidature. Refuse les sauts d'étape : le parcours est un parcours. */
export function advance(id, stage, by = 'Administration', note = '') {
  const a = appById(id)
  if (!a) return { error: 'Candidature introuvable.' }
  if (a.stage === stage) return { app: a }
  if (!STAGES[a.stage]?.next.includes(stage)) {
    return { error: `Passage impossible : ${STAGES[a.stage].label} → ${STAGES[stage]?.label || stage}.` }
  }
  if (stage === 'examen' && !docsComplete(a)) {
    return { error: 'Des pièces obligatoires manquent encore.' }
  }
  const next = applications().map(x => x.id !== id ? x
    : { ...x, stage, history: [...x.history, { at: now(), stage, by, note }] })
  write(next)
  // Prévenir le candidat par email du changement d'étape (accepté, refusé,
  // pièces à fournir, liste d'attente…). L'étape « nouvelle » a déjà son accusé.
  if (stage !== 'nouvelle') {
    mailApplicant(id, stage, stage === 'pieces' ? { missing: missingDocs(appById(id)) } : {})
  }
  return { app: appById(id) }
}

/** La capacité d'une classe. Une place n'existe que si elle existe vraiment. */
export const CAPACITY = 24
export function seatsOf(classId) {
  const d = db()
  const taken = (d.students || []).filter(s => s.classId === classId).length
  return { taken, capacity: CAPACITY, free: Math.max(0, CAPACITY - taken) }
}

/** Les classes d'un niveau qui ont encore de la place. */
export function openClasses(level) {
  return (db().classes || [])
    .filter(c => c.level === level)
    .map(c => ({ ...c, ...seatsOf(c.id) }))
}

/**
 * INSCRIRE — la candidature DEVIENT l'élève. Rien n'est ressaisi.
 * C'est exactement le point que PowerSchool et Infinite Campus font payer.
 *
 * Si la classe est pleine, on N'INSCRIT PAS : on met en liste d'attente. Le
 * système ne ment jamais sur une place qu'il n'a pas.
 */
export function enrol(id, classId, by = 'Administration') {
  const a = appById(id)
  if (!a) return { error: 'Candidature introuvable.' }
  if (!['accepte', 'attente'].includes(a.stage)) {
    return { error: 'Seule une candidature acceptée peut être inscrite.' }
  }
  const seats = seatsOf(classId)
  if (seats.free <= 0) {
    advance(id, 'attente', by, `Classe pleine (${seats.taken}/${seats.capacity}).`)
    return { error: `Cette classe est pleine (${seats.taken}/${seats.capacity}). Candidature mise en liste d’attente.` }
  }

  const d = db()
  const sid = 's' + Date.now().toString(36)
  const [first, ...rest] = String(a.childName).trim().split(' ')
  const last = rest.join(' ') || '—'
  d.students = [...(d.students || []), {
    id: sid,
    name: a.childName,
    initials: (first[0] || '?') + (last[0] || ''),
    classId,
    parentId: null,
    gender: '—',
    dob: a.dob || '',
    admissionDate: todayIso(),
    // Les données de la candidature deviennent celles de l'élève. Zéro ressaisie.
    guardianPhone: a.parentPhone || '',
    email: a.parentEmail || '',
    fatherName: a.parentName || '',
    allergies: 'Aucune', medical: 'Aucune',
    bloodGroup: '—', nationality: '—', prevSchool: '—', address: '—', phone: a.parentPhone || '',
    rollNo: sid.replace(/\D/g, ''), emergencyName: a.parentName || '', emergencyPhone: a.parentPhone || '',
  }]
  d.applications = (d.applications || []).map(x => x.id !== id ? x : {
    ...x, stage: 'inscrit', studentId: sid,
    history: [...x.history, { at: now(), stage: 'inscrit', by, note: `Classe ${classId}` }],
  })
  save(d)
  // « Bienvenue » — le candidat devient élève ; on le lui annonce par email.
  mailApplicant(id, 'inscrit', { className: classById(classId)?.name || classId })
  return { studentId: sid }
}

/** Le tableau de bord des inscriptions : où en est la campagne. */
export function summary() {
  const all = applications()
  const by = k => all.filter(a => a.stage === k).length
  return {
    total: all.length,
    nouvelle: by('nouvelle'), pieces: by('pieces'), examen: by('examen'),
    accepte: by('accepte'), attente: by('attente'), inscrit: by('inscrit'), refuse: by('refuse'),
  }
}

export const stageLabel = k => STAGES[k]?.label || k
export const levelLabel = labelOf
