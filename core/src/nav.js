// Single source of truth for navigation — used by the sidebar (AppShell) and
// the Ctrl+K command palette. Each entry is role-gated.
//
// `icon` est le NOM d'une icône lucide, pas le composant : le web le résout dans
// `lucide-react`, Android dans `lucide-react-native`. Le même menu sert les deux.
import { featureEnabled } from './features.js'
import { moduleForSchool } from './levels.js'
import { settings } from './db.js'

const ALL_NAV=[
  { to:'/app', label:'Tableau de bord', icon:'LayoutDashboard', roles:['owner','schooladmin','admin','teacher','supervisor','security','parent'] },
  { to:'/app/live', label:'Suivi en direct', icon:'Radio', roles:['parent'] },
  { to:'/app/schools', label:'Écoles', icon:'Building2', roles:['owner'] },
  { to:'/app/accounts', label:'Comptes', icon:'UserCog', roles:['schooladmin'] },
  { to:'/app/admissions', label:'Inscriptions', icon:'UserPlus', module:'admissions',
    roles:['schooladmin','admin'] },
  { to:'/app/students', label:'Élèves', icon:'Users', roles:['schooladmin','admin','supervisor','teacher'] },
  { to:'/app/teachers', label:'Enseignants', icon:'GraduationCap', roles:['schooladmin','admin'] },
  { to:'/app/staff', label:'Personnel', icon:'BriefcaseBusiness', roles:['schooladmin','admin'] },
  // RH & paie : aucune école n'achète un ERP sans ça. Ennuyeux, donc parfait.
  { to:'/app/hr', label:'RH & Paie', icon:'Wallet2', module:'hr', roles:['schooladmin','admin'] },
  // Comptabilité : barème, remises, factures, reçus. Une facture émise ne se
  // modifie pas — elle s'annule par un avoir. C'est ça, une compta défendable.
  { to:'/app/accounting', label:'Comptabilité', icon:'Receipt', module:'accounting', roles:['schooladmin','admin'] },
  { to:'/app/pointage', label:'Mon pointage', icon:'Fingerprint', roles:['teacher','supervisor','security','admin'] },
  { to:'/app/evaluate', label:'Évaluer', icon:'ClipboardCheck', roles:['teacher'] },
  // ── Petite enfance : le trou du marché. Aucun ERP scolaire généraliste n'a ça.
  { to:'/app/journal', label:'Journal du jour', icon:'NotebookPen', module:'journal',
    roles:['teacher','admin','schooladmin','parent'],
    labelFor:{ parent:'La journée de mon enfant' } },
  { to:'/app/results', label:'Suivi élèves', icon:'BarChart3', roles:['schooladmin','admin'] },
  { to:'/app/timetable', label:'Emploi du temps', icon:'CalendarClock', roles:['schooladmin','admin','teacher','parent','supervisor'] },
  { to:'/app/attendance', label:'Présence', icon:'CalendarCheck', roles:['schooladmin','teacher','admin','supervisor'] },
  { to:'/app/homework', label:'Devoirs', icon:'BookOpen', roles:['teacher','admin','parent'] },
  { to:'/app/exams', label:'Examens', icon:'Award', roles:['schooladmin','admin','teacher','parent'] },
  { to:'/app/finance', label:'Frais & Finances', icon:'Wallet', roles:['schooladmin','admin'] },
  { to:'/app/payments', label:'Mes paiements', icon:'CreditCard', roles:['parent'] },
  { to:'/app/library', label:'Bibliothèque', icon:'BookMarked', roles:['schooladmin','admin','teacher'] },
  { to:'/app/transport', label:'Transport', icon:'Bus', roles:['schooladmin','admin','parent'] },
  { to:'/app/events', label:'Événements', icon:'CalendarDays', roles:['schooladmin','admin','teacher','supervisor','security','parent'] },
  { to:'/app/security', label:'Poste de sécurité', icon:'ShieldCheck', roles:['security','schooladmin','admin'] },
  { to:'/app/social', label:'Espaces', icon:'Sparkles', roles:['parent','teacher','supervisor','security','schooladmin','admin'],
    labelFor:{parent:'Espace parents',teacher:'Espace enseignants',supervisor:'Espace personnel',security:'Espace personnel'} },
  { to:'/app/incidents', label:'Incidents', icon:'ShieldAlert', roles:['supervisor','security','admin','schooladmin'] },
  { to:'/app/requests', label:'Demandes', icon:'FileText', roles:['teacher','admin','schooladmin'] },
  { to:'/app/messages', label:'Messages', icon:'MessageSquare', roles:['owner','schooladmin','admin','teacher','supervisor','security','parent'] },
  { to:'/app/notices', label:'Annonces', icon:'Megaphone', roles:['owner','schooladmin','admin','teacher','supervisor','security','parent'] },
  { to:'/app/settings', label:'Paramètres', icon:'Settings', roles:['schooladmin'] },
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

// Compat : le menu par défaut lit l'école courante.
export const NAV = ALL_NAV.filter(n => featureEnabled(n.to) && moduleForSchool(moduleKey(n), settings()?.levels))
