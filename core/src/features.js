// ── Modules activés ─────────────────────────────────────────────────────────
//
// Coreon Edu n'est pas un ERP scolaire de plus. Un ERP essaie de tout faire, et
// finit par n'être aimé de personne. Ici on garde ce qui fait vivre l'école tous
// les jours — évaluer, suivre, se parler, se retrouver — et on met de côté ce que
// tout le monde vend déjà.
//
// Les modules ci-dessous restent DANS le code, testés et prêts : on les rallume
// en passant leur valeur à `true`. Rien n'est supprimé, rien n'est perdu.
// C'est aussi ce qui permettra de vendre un jour un « pack gestion » à l'école
// qui le demande, sans réécrire une ligne.
export const FEATURES = {
  homework: false,   // Devoirs        — chaque école a déjà son cahier de textes
  exams: false,      // Examens        — un calendrier suffit
  library: false,    // Bibliothèque   — logiciel dédié dans la plupart des écoles
  transport: false,  // Transport      — sujet à part entière, souvent externalisé

  // Le cœur, toujours actif :
  evaluate: true, attendance: true, live: true, results: true,
  payments: true, finance: true, incidents: true, requests: true,
  social: true, security: true, events: true, messages: true, notices: true,
  staff: true, pointage: true, timetable: true,

  // ── Petite enfance ────────────────────────────────────────────────────────
  // Le journal du jour (repas, sieste, change, humeur) : c'est ce que les ERP
  // scolaires n'ont PAS et ce que Famly/Procare ont — mais eux ne font pas
  // l'école. Nous faisons les deux. Voir core/src/levels.js.
  journal: true,

  // Les inscriptions : la candidature DEVIENT l'élève, sans ressaisie. C'est le
  // point exact que PowerSchool et Infinite Campus vendent en module premium.
  admissions: true,
  hr: true,          // contrats, congés, paie
  accounting: true,  // barème, remises, factures, reçus
  academic: true,    // bulletins, passage de classe, archives
  facilities: true,  // location piscine, terrain, gymnase, salles
  accidents: true,   // déclaration d'accident : validation + accusé du parent
  childfile: true,   // santé, vaccins, personnes autorisées, jalons
  interop: true,     // export OneRoster v1.2
}

// Un chemin est-il ouvert ? (les routes non listées ne sont pas des modules)
const ROUTE_MODULE = {
  '/app/homework': 'homework',
  '/app/exams': 'exams',
  '/app/library': 'library',
  '/app/transport': 'transport',
  '/app/evaluate': 'evaluate',
  '/app/attendance': 'attendance',
  '/app/live': 'live',
  '/app/results': 'results',
  '/app/payments': 'payments',
  '/app/finance': 'finance',
  '/app/incidents': 'incidents',
  '/app/requests': 'requests',
  '/app/social': 'social',
  '/app/security': 'security',
  '/app/journal': 'journal',
  '/app/admissions': 'admissions',
  '/app/hr': 'hr',
  '/app/accounting': 'accounting',
  '/app/academic': 'academic',
  '/app/facilities': 'facilities',
  '/app/accidents': 'accidents',
  '/app/child': 'childfile',
  '/app/interop': 'interop',
  '/app/events': 'events',
  '/app/staff': 'staff',
  '/app/pointage': 'pointage',
  '/app/timetable': 'timetable',
}
export const moduleOf = path => ROUTE_MODULE[String(path || '').split('?')[0]]
export const featureEnabled = path => {
  const m = moduleOf(path)
  return m ? FEATURES[m] !== false : true
}
