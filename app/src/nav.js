// Single source of truth for navigation — used by the sidebar (AppShell) and
// the Ctrl+K command palette. Each entry is role-gated.
import {
  LayoutDashboard, Users, GraduationCap, UserCog, ClipboardCheck, Wallet, CreditCard,
  ShieldAlert, FileText, Megaphone, Building2, CalendarCheck, BookOpen, BookMarked, BriefcaseBusiness, Fingerprint,
  Bus, CalendarDays, MessageSquare, Award, CalendarClock, Radio, Settings, BarChart3
} from 'lucide-react'

export const NAV=[
  { to:'/app', label:'Tableau de bord', icon:LayoutDashboard, roles:['owner','schooladmin','admin','teacher','supervisor','parent'] },
  { to:'/app/live', label:'Suivi en direct', icon:Radio, roles:['parent'] },
  { to:'/app/schools', label:'Écoles', icon:Building2, roles:['owner'] },
  { to:'/app/accounts', label:'Comptes', icon:UserCog, roles:['schooladmin'] },
  { to:'/app/students', label:'Élèves', icon:Users, roles:['schooladmin','admin','supervisor','teacher'] },
  { to:'/app/teachers', label:'Enseignants', icon:GraduationCap, roles:['schooladmin','admin'] },
  { to:'/app/staff', label:'Personnel', icon:BriefcaseBusiness, roles:['schooladmin','admin'] },
  { to:'/app/pointage', label:'Mon pointage', icon:Fingerprint, roles:['teacher','supervisor','admin'] },
  { to:'/app/evaluate', label:'Évaluer', icon:ClipboardCheck, roles:['teacher'] },
  { to:'/app/results', label:'Suivi élèves', icon:BarChart3, roles:['schooladmin','admin'] },
  { to:'/app/timetable', label:'Emploi du temps', icon:CalendarClock, roles:['schooladmin','admin','teacher','parent','supervisor'] },
  { to:'/app/attendance', label:'Présence', icon:CalendarCheck, roles:['schooladmin','teacher','admin','supervisor'] },
  { to:'/app/homework', label:'Devoirs', icon:BookOpen, roles:['teacher','admin','parent'] },
  { to:'/app/exams', label:'Examens', icon:Award, roles:['schooladmin','admin','teacher','parent'] },
  { to:'/app/finance', label:'Frais & Finances', icon:Wallet, roles:['schooladmin','admin'] },
  { to:'/app/payments', label:'Mes paiements', icon:CreditCard, roles:['parent'] },
  { to:'/app/library', label:'Bibliothèque', icon:BookMarked, roles:['schooladmin','admin','teacher'] },
  { to:'/app/transport', label:'Transport', icon:Bus, roles:['schooladmin','admin','parent'] },
  { to:'/app/events', label:'Événements', icon:CalendarDays, roles:['schooladmin','admin','teacher','supervisor','parent'] },
  { to:'/app/incidents', label:'Incidents', icon:ShieldAlert, roles:['supervisor','admin','schooladmin'] },
  { to:'/app/requests', label:'Demandes', icon:FileText, roles:['teacher','admin','schooladmin'] },
  { to:'/app/messages', label:'Messages', icon:MessageSquare, roles:['owner','schooladmin','admin','teacher','supervisor','parent'] },
  { to:'/app/notices', label:'Annonces', icon:Megaphone, roles:['owner','schooladmin','admin','teacher','supervisor','parent'] },
  { to:'/app/settings', label:'Paramètres', icon:Settings, roles:['schooladmin'] },
]
