// ════════════════════════════════════════════════════════════════════════════
// ACL — qui LIT quoi, qui ÉCRIT quoi, collection par collection.
//
// C'est la pièce la plus sensible du passage au serveur : jusqu'ici l'accès
// était tenu par l'ÉCRAN (access.js cache les pages), mais les données
// voyageaient entières. Le jour du serveur, le filtrage se fait CÔTÉ SERVEUR,
// et ce fichier est sa loi — partagé avec le cœur pour être TESTÉ comme le
// reste des règles.
//
// Principes :
//  1. DÉFAUT = REFUS. Le blob d'un parent est RECONSTRUIT en n'y mettant QUE
//     ce qui est listé ici — jamais « tout sauf… ».
//  2. Le personnel écrit par collections (la direction écrit tout) ; le parent
//     n'écrit RIEN en bloc — ses actions passent par des opérations nommées.
//  3. Aucun mot de passe ne voyage : `stripSecrets` nettoie chaque blob sortant.
// ════════════════════════════════════════════════════════════════════════════

const DIRECTION = ['schooladmin', 'admin', 'owner']

// ── Ce que chaque rôle du personnel peut ÉCRIRE (synchronisation en bloc) ────
export const WRITE_ACL = {
  owner: '*', schooladmin: '*', admin: '*',
  teacher: ['journal', 'evaluations', 'attendance', 'behavior', 'moments', 'incidents',
    'accidents', 'canteen', 'homework', 'exams', 'messages', 'notifications',
    'staffClock', 'staffLeaves', 'requests', 'milestones', 'departures', 'health',
    'pickups', 'socialEvents'],
  supervisor: ['attendance', 'incidents', 'messages', 'notifications', 'staffClock',
    'staffLeaves', 'requests', 'departures', 'socialEvents'],
  security: ['visitors', 'rounds', 'logbook', 'incidents', 'messages', 'notifications',
    'staffClock', 'staffLeaves', 'socialEvents'],
  // CR-019 : les départements réels, chacun n'écrit que SON périmètre.
  hr: ['hrPayrolls', 'hrContracts', 'staffLeaves', 'staffAttendance', 'staffClock',
    'recruitPosts', 'recruitCandidates', 'requests', 'messages', 'notifications'],
  accountant: ['invoices', 'receipts', 'payments', 'feeSchedule', 'discounts',
    'expenses', 'budget', 'messages', 'notifications'],
  parent: [],   // les actions parent = opérations nommées (/api/op), jamais un bloc
}
export const writableCollections = role => WRITE_ACL[role] || []
export const mayWriteCollection = (role, key) => {
  const w = writableCollections(role)
  return w === '*' || (Array.isArray(w) && w.includes(key))
}

// ── Ce que chaque rôle du personnel ne LIT PAS (retiré du blob sortant) ──────
const STAFF_STRIP_BASE = ['hrPayrolls', 'hrContracts', 'invoices', 'receipts', 'feeSchedule',
  'discounts', 'payments', 'expenses', 'schools', 'recruitPosts', 'recruitCandidates', 'documents']
export const READ_STRIP = {
  owner: [], schooladmin: [], admin: [],
  teacher: [...STAFF_STRIP_BASE, 'visitors', 'rounds', 'logbook'],
  // RH : voit paie/contrats/personnel, PAS le pédagogique ni la santé des élèves.
  hr: ['evaluations', 'reports', 'behavior', 'moments', 'journal', 'milestones',
    'health', 'homework', 'exams', 'invoices', 'receipts', 'visitors', 'rounds', 'logbook'],
  // Comptable : voit l'argent, PAS le pédagogique, la santé ni les dossiers RH.
  accountant: ['evaluations', 'reports', 'behavior', 'moments', 'journal', 'milestones',
    'health', 'homework', 'exams', 'hrPayrolls', 'hrContracts', 'visitors', 'rounds', 'logbook'],
  supervisor: [...STAFF_STRIP_BASE, 'visitors', 'rounds', 'logbook'],
  security: [...STAFF_STRIP_BASE, 'health', 'evaluations', 'reports', 'behavior',
    'moments', 'journal', 'milestones', 'homework', 'exams'],
}

// Les salaires vivent aussi sur teachers[].salary — pas seulement dans la paie.
const lightTeacher = t => ({ id: t.id, name: t.name, subject: t.subject || '', designation: t.designation || '' })

/** Nettoyer les secrets d'un blob SORTANT, quel que soit le rôle. */
export function stripSecrets(d) {
  return {
    ...d,
    users: (d.users || []).map(({ pw, ...u }) => u),
  }
}

/** Le blob d'un membre du PERSONNEL : tout, moins les collections retirées. */
export function blobForStaff(d, role) {
  const strip = new Set(READ_STRIP[role] || [])
  const out = {}
  for (const k of Object.keys(d)) { if (!strip.has(k)) out[k] = d[k] }
  if (strip.has('hrPayrolls')) out.teachers = (d.teachers || []).map(lightTeacher)
  return stripSecrets(out)
}

/** Le blob d'un PARENT : reconstruit clé par clé — défaut refus. */
export function blobForParent(d, user) {
  const kids = new Set(user.childIds || [])
  const kidsArr = [...kids]
  const myStudents = (d.students || []).filter(s => kids.has(s.id))
  const kidClasses = new Set(myStudents.map(s => s.classId).filter(Boolean))
  const pick = (obj = {}, keys) => Object.fromEntries(Object.entries(obj).filter(([k]) => keys.has(k)))
  const email = String(user.email || '').toLowerCase()

  // L'appel : ne garder, dans chaque feuille, QUE les marques de ses enfants.
  const attendance = {}
  for (const [key, marks] of Object.entries(d.attendance || {})) {
    const mine = Object.fromEntries(Object.entries(marks || {}).filter(([sid]) => kids.has(sid)))
    if (Object.keys(mine).length) attendance[key] = mine
  }

  return stripSecrets({
    _v: d._v,
    settings: d.settings,
    classes: d.classes || [],
    timetables: pick(d.timetables, kidClasses),
    teachers: (d.teachers || []).map(lightTeacher),
    users: (d.users || []).filter(u => u.id === user.id),
    students: myStudents,
    journal: (d.journal || []).filter(j => kids.has(j.childId) || kidClasses.has(j.classId)),
    attendance,
    behavior: (d.behavior || []).filter(b => kids.has(b.childId || b.studentId)),
    moments: (d.moments || []).filter(m => (m.childIds || []).some(id => kids.has(id)) || kidClasses.has(m.classId)),
    accidents: (d.accidents || []).filter(a => kids.has(a.childId)),
    health: pick(d.health, kids),
    pickups: pick(d.pickups, kids),
    milestones: pick(d.milestones, kids),
    departures: (d.departures || []).filter(x => kids.has(x.childId)),
    payments: pick(d.payments, kids),
    invoices: (d.invoices || []).filter(i => kids.has(i.studentId)),
    receipts: (d.receipts || []).filter(r => kids.has(r.studentId)),
    reports: (d.reports || []).filter(r => kids.has(r.studentId)),
    evaluations: (d.evaluations || []).filter(e => kidClasses.has(e.classId)),
    applications: (d.applications || []).filter(a => String(a.parentEmail || '').toLowerCase() === email && email),
    requests: (d.requests || []).filter(r => r.by === user.id),
    notifications: (d.notifications || []).filter(n => n.to === user.id),
    canteen: { menu: (d.canteen || {}).menu || {}, subscribers: ((d.canteen || {}).subscribers || []).filter(id => kids.has(id)) },
    events: d.events || [],
    socialEvents: d.socialEvents || [],
    routes: d.routes || [],
    homework: (d.homework || []).filter(h => kidClasses.has(h.classId)),
    exams: (d.exams || []).filter(x => kidClasses.has(x.classId)),
    // V1 serveur : la messagerie parent arrive en V1.1 (extraction des écritures
    // de Messages.jsx vers le cœur). Vide ≠ cassé : le module l'affiche honnêtement.
    messages: [],
    __kids: kidsArr,
  })
}

/**
 * FUSION d'une écriture du personnel : on ne prend, du blob posté, QUE les
 * collections que ce rôle a le droit d'écrire — le reste est conservé tel quel.
 * Les mots de passe éventuels (création de comptes) sont extraits par l'appelant
 * AVANT la fusion : aucun `pw` n'entre jamais dans le blob serveur.
 */
export function mergeWrite(serverBlob, postedBlob, role) {
  if (writableCollections(role) === '*') {
    const merged = { ...postedBlob }
    merged.users = (postedBlob.users || []).map(({ pw, ...u }) => u)
    return { merged, applied: ['*'] }
  }
  const merged = { ...serverBlob }
  const applied = []
  for (const k of Object.keys(postedBlob || {})) {
    if (mayWriteCollection(role, k)) { merged[k] = postedBlob[k]; applied.push(k) }
  }
  return { merged, applied }
}
