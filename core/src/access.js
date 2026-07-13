// Single source of truth for per-route role permissions.
// Used by App.jsx (route guards) AND the notification system (so a notification
// never links a user to a page their role can't open).
export const ALL=['owner','schooladmin','admin','teacher','supervisor','security','parent']
export const ROUTE_ROLES={
  '/app': ALL,
  '/app/schools': ['owner'],
  '/app/settings': ['schooladmin'],
  '/app/accounts': ['schooladmin'],
  '/app/students': ['schooladmin','admin','supervisor','teacher'],
  '/app/teachers': ['schooladmin','admin'],
  '/app/staff': ['schooladmin','admin'],
  '/app/pointage': ['teacher','supervisor','security','admin'],
  '/app/evaluate': ['teacher'],
  '/app/results': ['schooladmin','admin'],
  '/app/timetable': ['schooladmin','admin','teacher','parent','supervisor'],
  '/app/attendance': ['schooladmin','teacher','admin','supervisor'],
  '/app/homework': ['teacher','admin','parent'],
  '/app/exams': ['schooladmin','admin','teacher','parent'],
  '/app/finance': ['schooladmin','admin'],
  '/app/payments': ['parent'],
  '/app/live': ['parent'],
  '/app/library': ['schooladmin','admin','teacher'],
  '/app/transport': ['schooladmin','admin','parent'],
  '/app/events': ['schooladmin','admin','teacher','supervisor','security','parent'],
  '/app/social': ['parent','teacher','supervisor','security','schooladmin','admin'],
  '/app/security': ['security','schooladmin','admin'],
  '/app/incidents': ['supervisor','security','admin','schooladmin'],
  // Le journal du jour : l'éducatrice le remplit, le parent le lit.
  '/app/journal': ['teacher','admin','schooladmin','parent'],
  '/app/admissions': ['schooladmin','admin'],
  '/app/hr': ['schooladmin','admin'],
  '/setup': ['schooladmin'],
  '/app/requests': ['teacher','admin','schooladmin'],
  '/app/messages': ALL,
  '/app/notices': ALL,
  '/app/notifications': ALL,
}
import { featureEnabled } from './features.js'

// can this role open this path? (ignores query/hash)
// Politique : REFUS par défaut. Une route absente de la table n'est ouverte à
// personne — auparavant un chemin inconnu était autorisé à tous, ce qui est le
// mauvais réglage par défaut pour un module d'autorisation.
export function canAccess(role, path){
  if(!path) return false
  const base=path.split('?')[0].split('#')[0]
  if(!featureEnabled(base)) return false          // module éteint : fermé à tous
  const roles=ROUTE_ROLES[base]
  return Array.isArray(roles) && roles.includes(role)
}
// resolve a safe destination for a notification link given the recipient's role
export function safeLink(role, link){
  return canAccess(role, link||'/app') ? (link||'/app') : '/app/notifications'
}
