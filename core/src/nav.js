// LA NAVIGATION — source unique, pour la barre latérale et la palette (Ctrl+K).
//
// POURQUOI ELLE A CHANGÉ (recherche kogia-research/COMPETITIVE_v2.md, vérifié 3-0) :
// Arbor — MIS britannique moderne — n'a AUCUN module dans sa barre latérale. Elle
// ne contient que SEPT icônes utilitaires (accueil, favoris, notifications,
// calendrier, ALERTE D'URGENCE, aide, déconnexion). Les modules vivent en haut, en
// QUATRE groupes, et la sous-navigation est contextuelle, DANS la fiche.
//
// Autrement dit : 22 entrées à plat était bien le problème — mais les regrouper ne
// suffisait pas non plus. Il faut des ÉTAGES.
//
// Ce que nous faisons ici, en gardant notre barre latérale (un seul écran, pas de
// district à gérer) :
//   1. ÉPINGLÉ — les 3 ou 4 choses que CE rôle fait tous les jours. En haut.
//   2. GROUPES — un petit nombre de sections nommées, repliables.
//   3. RECHERCHE — Ctrl+K, déjà là : c'est la vraie navigation d'un ERP (chez
//      PowerSchool, l'accueil administrateur EST un champ de recherche).
//
// L'ordre des groupes suit la FRÉQUENCE d'usage, pas l'organigramme de l'école.
//
// `icon` est le NOM d'une icône lucide, pas le composant : le web le résout dans
// `lucide-react`, Android dans `lucide-react-native`. Le même menu sert les deux.
import { featureEnabled } from './features.js'
import { moduleForSchool } from './levels.js'
import { settings } from './db.js'

/**
 * Les sections. L'ordre est celui de la FRÉQUENCE, pas de la hiérarchie.
 * `pinned` : ce que le rôle ouvre tous les jours — remonté en haut, hors section.
 */
export const SECTIONS = [
  { key:'quotidien',  label:'Au quotidien' },
  { key:'eleves',     label:'Élèves & familles' },
  { key:'pedagogie',  label:'Pédagogie' },
  { key:'vie',        label:'Vie de l’école' },
  { key:'equipe',     label:'Équipe' },
  { key:'argent',     label:'Finances' },
  { key:'systeme',    label:'Administration' },
]

const ALL_NAV=[
  { to:'/app', section:'quotidien', pinned:['owner','schooladmin','admin','teacher','supervisor','security','parent'], label:'Tableau de bord', icon:'LayoutDashboard', roles:['owner','schooladmin','admin','teacher','supervisor','security','parent'] },
  { to:'/app/live', section:'quotidien', pinned:['parent'], label:'Suivi en direct', icon:'Radio', roles:['parent'] },
  { to:'/app/schools', section:'systeme', label:'Écoles', icon:'Building2', roles:['owner'] },
  { to:'/app/accounts', section:'systeme', label:'Comptes', icon:'UserCog', roles:['schooladmin'] },
  { to:'/app/admissions', section:'eleves', pinned:['schooladmin','admin'], label:'Inscriptions', icon:'UserPlus', module:'admissions',
    roles:['schooladmin','admin'] },
  { to:'/app/students', section:'eleves', label:'Élèves', icon:'Users', roles:['schooladmin','admin','supervisor','teacher'] },
  { to:'/app/teachers', section:'equipe', label:'Enseignants', icon:'GraduationCap', roles:['schooladmin','admin'] },
  { to:'/app/staff', section:'equipe', label:'Personnel', icon:'BriefcaseBusiness', roles:['schooladmin','admin'] },
  // RH & paie : aucune école n'achète un ERP sans ça. Ennuyeux, donc parfait.
  { to:'/app/hr', section:'equipe', label:'RH & Paie', icon:'Wallet2', module:'hr', roles:['schooladmin','admin'] },
  // Comptabilité : barème, remises, factures, reçus. Une facture émise ne se
  // modifie pas — elle s'annule par un avoir. C'est ça, une compta défendable.
  { to:'/app/accounting', section:'argent', label:'Comptabilité', icon:'Receipt', module:'accounting', roles:['schooladmin','admin'] },
  // Bulletins & passage. Le passage d'année est IRRÉVERSIBLE et touche à l'argent :
  // on le montre avant de l'exécuter (recherche 3-0).
  { to:'/app/academic', section:'pedagogie', label:'Bulletins & passage', icon:'FileBadge', module:'academic', roles:['schooladmin','admin','teacher'] },
  // Location des installations : les murs de l'école sont vides le soir et le
  // week-end. Une SECONDE ligne de revenus — qu'aucun ERP scolaire ne propose.
  { to:'/app/facilities', section:'vie', label:'Installations', icon:'Waves', module:'facilities', roles:['schooladmin','admin'] },
  { to:'/app/pointage', section:'quotidien', pinned:['teacher','supervisor','security','admin'], label:'Mon pointage', icon:'Fingerprint', roles:['teacher','supervisor','security','admin'] },
  { to:'/app/evaluate', section:'quotidien', pinned:['teacher'], label:'Évaluer', icon:'ClipboardCheck', roles:['teacher'] },
  // ── Petite enfance : le trou du marché. Aucun ERP scolaire généraliste n'a ça.
  // Le dossier de l'enfant : santé, personnes autorisées, jalons. Petite enfance
  // uniquement — un CM2 n'a pas de jalon « marche seul », et il rentre seul.
  { to:'/app/child', section:'eleves', label:'Dossier de l’enfant', icon:'BookUser', module:'childfile',
    roles:['teacher','admin','schooladmin'] },
  { to:'/app/journal', section:'quotidien', pinned:['teacher','parent'], label:'Journal du jour', icon:'NotebookPen', module:'journal',
    roles:['teacher','admin','schooladmin','parent'],
    labelFor:{ parent:'La journée de mon enfant' } },
  { to:'/app/results', section:'pedagogie', label:'Suivi élèves', icon:'BarChart3', roles:['schooladmin','admin'] },
  { to:'/app/timetable', section:'pedagogie', label:'Emploi du temps', icon:'CalendarClock', roles:['schooladmin','admin','teacher','parent','supervisor'] },
  { to:'/app/attendance', section:'quotidien', pinned:['teacher','supervisor'], label:'Présence', icon:'CalendarCheck', roles:['schooladmin','teacher','admin','supervisor'] },
  { to:'/app/homework', section:'pedagogie', label:'Devoirs', icon:'BookOpen', roles:['teacher','admin','parent'] },
  { to:'/app/exams', section:'pedagogie', label:'Examens', icon:'Award', roles:['schooladmin','admin','teacher','parent'] },
  { to:'/app/finance', section:'argent', label:'Frais & Finances', icon:'Wallet', roles:['schooladmin','admin'] },
  { to:'/app/payments', section:'argent', pinned:['parent'], label:'Mes paiements', icon:'CreditCard', roles:['parent'] },
  { to:'/app/library', section:'pedagogie', label:'Bibliothèque', icon:'BookMarked', roles:['schooladmin','admin','teacher'] },
  { to:'/app/transport', section:'vie', label:'Transport', icon:'Bus', roles:['schooladmin','admin','parent'] },
  { to:'/app/events', section:'vie', label:'Événements', icon:'CalendarDays', roles:['schooladmin','admin','teacher','supervisor','security','parent'] },
  { to:'/app/security', section:'quotidien', pinned:['security'], label:'Poste de sécurité', icon:'ShieldCheck', roles:['security','schooladmin','admin'] },
  { to:'/app/social', section:'vie', label:'Espaces', icon:'Sparkles', roles:['parent','teacher','supervisor','security','schooladmin','admin'],
    labelFor:{parent:'Espace parents',teacher:'Espace enseignants',supervisor:'Espace personnel',security:'Espace personnel'} },
  { to:'/app/incidents', section:'eleves', label:'Incidents', icon:'ShieldAlert', roles:['supervisor','security','admin','schooladmin'] },
  // Déclarations d'accident : la chaîne de confiance école ↔ parent. Deux paires
  // d'yeux, un accusé de réception du parent, et rien qui s'efface. La recherche
  // (3-0) l'a désigné comme le motif « le plus difficile à copier ».
  { to:'/app/accidents', section:'eleves', label:'Accidents', icon:'HeartPulse', module:'accidents',
    roles:['teacher','supervisor','admin','schooladmin','parent'],
    labelFor:{ parent:'Déclarations d’accident' } },
  // Suivi du comportement : l'idée maîtresse — suivre l'élève au quotidien.
  // Encourager d'abord, jamais classer (règle n°9). Le parent voit le parcours
  // de SON enfant.
  { to:'/app/behavior', section:'pedagogie', pinned:['teacher'], label:'Comportement', icon:'Smile', module:'behavior',
    roles:['teacher','admin','schooladmin','parent'],
    labelFor:{ parent:'Comportement de mon enfant' } },
  // Moments : le partage photo/vidéo de la journée — l'attente n°1 d'une crèche.
  // La vie privée des enfants est tenue par le cœur (gallery.js).
  { to:'/app/gallery', section:'quotidien', pinned:['parent'], label:'Moments', icon:'Camera', module:'gallery',
    roles:['teacher','admin','schooladmin','parent'] },
  // Cantine : le menu de la semaine, et l'ALERTE ALLERGIE — la sécurité de
  // l'enfant appliquée au repas (croisement avec le dossier).
  { to:'/app/canteen', section:'vie', label:'Cantine', icon:'UtensilsCrossed', module:'canteen',
    roles:['teacher','admin','schooladmin','parent'] },
  // Documents officiels : le guichet — certificats numérotés, registre.
  { to:'/app/documents', section:'eleves', label:'Documents', icon:'ScrollText', module:'documents',
    roles:['admin','schooladmin'] },
  { to:'/app/budget', section:'argent', label:'Budget & rapports', icon:'Scale', module:'budget',
    roles:['schooladmin','admin'] },
  { to:'/app/inventory', section:'vie', label:'Inventaire', icon:'Boxes', module:'inventory',
    roles:['schooladmin','admin'] },
  { to:'/app/recruit', section:'equipe', label:'Recrutement', icon:'UserPlus', module:'recruit',
    roles:['schooladmin','admin'] },
  { to:'/app/requests', section:'equipe', label:'Demandes', icon:'FileText', roles:['teacher','admin','schooladmin'] },
  { to:'/app/messages', section:'quotidien', label:'Messages', icon:'MessageSquare', roles:['owner','schooladmin','admin','teacher','supervisor','security','parent'] },
  { to:'/app/notices', section:'quotidien', label:'Annonces', icon:'Megaphone', roles:['owner','schooladmin','admin','teacher','supervisor','security','parent'] },
  // « Est-ce que ça s'intègre ? » est une QUESTION D'ACHAT dans toute école
  // internationale. OneRoster v1.2 : la réponse est un fichier, pas une promesse.
  { to:'/app/interop', section:'systeme', label:'Interopérabilité', icon:'Plug', module:'interop', roles:['schooladmin','admin'] },
  { to:'/app/settings', section:'systeme', label:'Paramètres', icon:'Settings', roles:['schooladmin'] },
]

// Un module éteint disparaît du menu et de la palette (features.js).
//
// ET un module qui ne SERT PAS les niveaux de l'école disparaît aussi : une
// crèche ne voit pas « Emploi du temps », une école primaire ne voit pas le
// « Journal du jour ». Ce n'est pas un réglage d'affichage — c'est le modèle de
// capacités (core/src/levels.js). Voir COMPANY_ARCHITECTURE.md §3.
const moduleKey = n => n.module || n.to.replace('/app/', '') || 'dashboard'

export function navFor(school) {
  const levels = school?.levels
  return ALL_NAV.filter(n => featureEnabled(n.to) && moduleForSchool(moduleKey(n), levels))
}

// Compat : le menu à plat (palette Ctrl+K, mobile).
export const NAV = ALL_NAV.filter(n => featureEnabled(n.to) && moduleForSchool(moduleKey(n), settings()?.levels))

/**
 * LE MENU D'UN RÔLE, EN ÉTAGES.
 *   { pinned: [...], groups: [{ key, label, items: [...] }] }
 * `pinned` = ce que ce rôle fait TOUS LES JOURS. Le reste est rangé, pas caché.
 */
export function menuFor(role, school) {
  const mine = NAV.filter(n => n.roles.includes(role) && moduleForSchool(moduleKey(n), school?.levels))
  const isPinned = n => Array.isArray(n.pinned) && n.pinned.includes(role)
  const pinned = mine.filter(isPinned)
  const rest = mine.filter(n => !isPinned(n))
  const groups = SECTIONS
    .map(sec => ({ ...sec, items: rest.filter(n => (n.section || 'systeme') === sec.key) }))
    .filter(g => g.items.length)
  return { pinned, groups }
}
