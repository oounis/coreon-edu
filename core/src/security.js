// ── Poste de sécurité ───────────────────────────────────────────────────────
//
// L'agent de sécurité n'est pas le surveillant. Le surveillant s'occupe des
// élèves : la cour, la discipline, les incidents. L'agent s'occupe du bâtiment
// et de qui y entre : le portail, les visiteurs, les rondes, les soirées, les
// alarmes, les clés.
//
// Ce module tient ce qu'un agent doit vraiment faire, d'après les fiches de poste
// réelles (gardien d'établissement scolaire, SSIAP, Securitas / G4S) :
//   contrôle d'accès · filtrage des visiteurs · rondes · alarmes et moyens de
//   secours · intervention · main courante · clés · couverture des événements.
//
// Vocabulaire : on écrit « main courante », « ronde », « registre des visiteurs »,
// « consignes ». La Tunisie n'a pas de PPMS à la française ; le cadre est le Code
// de la sécurité et de la prévention des risques d'incendie (loi 2009-11) et la
// Protection civile, avec un plan d'évacuation et des consignes affichées. On garde
// donc « plan d'évacuation » et « consignes », pas « PPMS ».

// ── Numéros d'urgence tunisiens ─────────────────────────────────────────────
import { STATUS, BRAND, N } from './tokens.js'
export const URGENCES = [
  { k: 'protection', label: 'Protection civile', num: '198', hint: 'Incendie, secours, évacuation' },
  { k: 'samu', label: 'SAMU', num: '190', hint: 'Urgence médicale' },
  { k: 'police', label: 'Police secours', num: '197', hint: 'Intrusion, agression' },
  { k: 'garde', label: 'Garde nationale', num: '193', hint: 'Hors périmètre urbain' },
]

// Les icônes sont désignées par leur NOM lucide (contrat <Ic n="…"/>), jamais par
// un emoji : un emoji change de dessin sur chaque plateforme (Android, iOS, Windows)
// — c'est exactement ce qui faisait que Kogia n'avait pas UNE iconographie.
// Source : brand/KOGIA_HARMONY.md §6
// ── Consignes (procédures d'urgence) ────────────────────────────────────────
export const CONSIGNES = [
  {
    k: 'evacuation', label: 'Évacuation · incendie', icon: 'Flame', color: STATUS.danger,
    steps: [
      "Donner l'alarme et prévenir la Direction.",
      'Appeler la Protection civile (198) : adresse, nature du sinistre, nombre de personnes.',
      'Ouvrir le portail en grand pour les secours ; dégager la voie d’accès.',
      'Guider l’évacuation vers le point de rassemblement (cour, côté rue).',
      'Vérifier salles, sanitaires et bibliothèque : personne ne reste.',
      'Compter les présents avec la Direction ; annoncer les manquants aux secours.',
      "Ne jamais laisser quiconque retourner à l'intérieur.",
    ],
  },
  {
    k: 'confinement', label: 'Confinement / mise à l’abri', icon: 'DoorClosed', color: BRAND.violet,
    steps: [
      'Fermer et verrouiller le portail et toutes les portes extérieures.',
      'Faire rentrer immédiatement tout le monde depuis la cour.',
      'Éteindre les lumières, s’éloigner des fenêtres, garder le silence.',
      'Prévenir la Direction, puis la Police secours (197).',
      'Ne rouvrir que sur ordre des forces de l’ordre ou de la Direction.',
    ],
  },
  {
    k: 'intrusion', label: 'Intrusion', icon: 'OctagonAlert', color: STATUS.warn,
    steps: [
      'Ne pas s’interposer physiquement.',
      'Alerter la Direction et la Police secours (197) ; décrire la personne.',
      'Isoler les élèves : confinement des classes concernées.',
      'Noter l’heure, le signalement, le point d’entrée : main courante.',
      'Préserver les images de vidéosurveillance.',
    ],
  },
  {
    k: 'malaise', label: 'Malaise / accident', icon: 'Ambulance', color: STATUS.info,
    steps: [
      'Ne pas déplacer la personne, sauf danger immédiat.',
      'Appeler le SAMU (190) ; suivre les instructions du régulateur.',
      'Envoyer quelqu’un ouvrir le portail et guider l’ambulance.',
      'Prévenir la Direction, qui prévient la famille.',
      'Consigner l’heure, les faits et les gestes effectués.',
    ],
  },
  {
    k: 'bombe', label: 'Alerte à la bombe', icon: 'Phone', color: N.slate,
    steps: [
      'Ne pas raccrocher ; faire parler, noter mot à mot, heure et voix.',
      'Ne toucher à aucun objet suspect ; ne pas utiliser de radio à proximité.',
      'Prévenir la Direction, puis la Police secours (197).',
      'Évacuer sur ordre, par un itinéraire éloigné de l’objet.',
    ],
  },
]

// ── Rondes ──────────────────────────────────────────────────────────────────
// Les points de passage d'une ronde. Dans la vraie vie ils portent une étiquette
// NFC ou un QR code ; ici on les pointe à la main, avec l'heure.
export const CHECKPOINTS = [
  { k: 'portail', label: 'Portail principal' },
  { k: 'cour', label: 'Cour de récréation' },
  { k: 'batiment', label: 'Bâtiment · salles de classe' },
  { k: 'biblio', label: 'Bibliothèque' },
  { k: 'gymnase', label: 'Gymnase' },
  { k: 'terrain', label: 'Terrain de football' },
  { k: 'parking', label: 'Parking' },
  { k: 'technique', label: 'Local technique & tableau incendie' },
]
export const checkpointOf = k => CHECKPOINTS.find(c => c.k === k) || CHECKPOINTS[0]

// ── Main courante ───────────────────────────────────────────────────────────
// Le journal de bord de l'agent : prise et fin de service, rondes, visiteurs,
// anomalies, alarmes, consignes reçues. Il fait foi ; on n'y efface rien.
export const LOG_KINDS = {
  prise:     { label: 'Prise de service',   icon: 'LogIn', color: STATUS.ok },
  fin:       { label: 'Fin de service',     icon: 'LogOut', color: N.slate },
  ronde:     { label: 'Ronde',              icon: 'Flashlight', color: STATUS.info },
  visiteur:  { label: 'Visiteur',           icon: 'IdCard', color: BRAND.violet },
  evenement: { label: 'Événement',          icon: 'CalendarDays', color: BRAND.indigo },
  anomalie:  { label: 'Anomalie',           icon: 'TriangleAlert', color: STATUS.warn },
  alarme:    { label: 'Alarme',             icon: 'Siren', color: STATUS.danger },
  consigne:  { label: 'Consigne',           icon: 'ClipboardList', color: N.slate },
}
export const logKindOf = k => LOG_KINDS[k] || LOG_KINDS.consigne

// ── Registre des visiteurs ──────────────────────────────────────────────────
export const ID_TYPES = ['CIN', 'Passeport', 'Carte de séjour', 'Carte professionnelle']
// Règle de sûreté : un visiteur qui va au contact des élèves ne circule jamais seul.
// La Tunisie n'a pas de fichier type DBS ; le contrôle réel, c'est le badge,
// l'escorte, et la pièce d'identité enregistrée.
export const ESCORT_REQUIRED_PURPOSES = ['Rencontre avec un enseignant', 'Intervention en classe', 'Visite de l’école']
export const PURPOSES = [
  'Rencontre avec un enseignant',
  'Rendez-vous à la Direction',
  'Livraison',
  'Intervention technique',
  'Intervention en classe',
  'Visite de l’école',
  'Récupérer un enfant',
  'Autre',
]
export const needsEscort = purpose => ESCORT_REQUIRED_PURPOSES.includes(purpose)
export const isInside = v => !!v.inAt && !v.outAt
export const badgeNumber = n => `V-${String(n).padStart(3, '0')}`

// ── Check-list d'un événement ───────────────────────────────────────────────
// Ce qu'un agent coche vraiment avant, pendant et après une soirée dans l'école.
export const CHECKLIST = {
  avant: [
    { k: 'brief', label: 'Consignes reçues : horaires, effectif attendu, contact de l’organisateur' },
    { k: 'liste', label: 'Liste des inscrits en main : on n’entre pas sans y figurer' },
    { k: 'portail', label: 'Plan de portail : une seule entrée ouverte, les autres verrouillées' },
    { k: 'issues', label: 'Issues de secours dégagées et ouvrables de l’intérieur' },
    { k: 'eclairage', label: 'Éclairage vérifié : accès, parking, cheminement, éclairage de secours' },
    { k: 'incendie', label: 'Moyens de secours vérifiés : extincteurs, tableau d’alarme, signalisation' },
    { k: 'secours', label: 'Trousse de premiers secours disponible, un secouriste identifié' },
    { k: 'parking', label: 'Voie d’accès des secours laissée libre' },
    { k: 'cles', label: 'Clés sorties et consignées ; téléphone chargé' },
  ],
  pendant: [
    { k: 'accueil', label: 'Tenue du point d’entrée : accueil, pointage, badge visiteur' },
    { k: 'refus', label: 'Personne non inscrite : accompagnée ou refusée, jamais laissée seule' },
    { k: 'issues2', label: 'Issues de secours maintenues dégagées' },
    { k: 'ronde', label: 'Rondes périodiques : périmètre, salles inutilisées verrouillées' },
    { k: 'journal', label: 'Faits notés en temps réel dans la main courante' },
  ],
  apres: [
    { k: 'sortie', label: 'Tout le monde est sorti : salles, sanitaires, cour vérifiées' },
    { k: 'fermeture', label: 'Ronde de fermeture : lumières, fenêtres, portes, portail' },
    { k: 'alarme', label: 'Alarme réarmée' },
    { k: 'clesretour', label: 'Clés rendues et consignées' },
    { k: 'objets', label: 'Objets trouvés ramassés et notés' },
    { k: 'rapport', label: 'Main courante complétée ; anomalies signalées à la Direction' },
  ],
}
export const CHECK_PHASES = [
  { k: 'avant', label: 'Avant', hint: "Le jour même, avant l'ouverture du portail." },
  { k: 'pendant', label: 'Pendant', hint: "Pendant toute la durée de l'événement." },
  { k: 'apres', label: 'Après', hint: 'Une fois le dernier participant sorti.' },
]

export const checklistTotal = () => CHECK_PHASES.reduce((n, p) => n + CHECKLIST[p.k].length, 0)
export const checklistDone = checks => Object.values(checks || {}).filter(Boolean).length
export const phaseDone = (checks, phase) => CHECKLIST[phase].filter(i => checks?.[i.k]).length
export const isPhaseComplete = (checks, phase) => phaseDone(checks, phase) === CHECKLIST[phase].length
export const checklistComplete = checks => checklistDone(checks) === checklistTotal()
