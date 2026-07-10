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
