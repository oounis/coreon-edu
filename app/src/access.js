// Single source of truth for per-route role permissions.
// Used by App.jsx (route guards) AND the notification system (so a notification
// never links a user to a page their role can't open).
export const ALL=['owner','schooladmin','admin','teacher','supervisor','parent']
export const ROUTE_ROLES={
  '/app': ALL,
  '/app/schools': ['owner'],
  '/app/settings': ['schooladmin'],
  '/app/accounts': ['schooladmin'],
  '/app/students': ['schooladmin','admin','supervisor','teacher'],
  '/app/teachers': ['schooladmin','admin'],
  '/app/evaluate': ['teacher'],
  '/app/timetable': ['schooladmin','admin','teacher','parent','supervisor'],
  '/app/attendance': ['schooladmin','teacher','admin','supervisor'],
  '/app/homework': ['teacher','admin','parent'],
  '/app/exams': ['schooladmin','admin','teacher','parent'],
  '/app/finance': ['schooladmin','admin'],
  '/app/payments': ['parent'],
  '/app/live': ['parent'],
  '/app/library': ['schooladmin','admin','teacher'],
  '/app/transport': ['schooladmin','admin','parent'],
  '/app/events': ['schooladmin','admin','teacher','supervisor','parent'],
  '/app/incidents': ['supervisor','admin','schooladmin'],
  '/app/requests': ['teacher','admin','schooladmin'],
  '/app/messages': ALL,
  '/app/notices': ALL,
  '/app/notifications': ALL,
  '/app/cartes': ['schooladmin','admin','teacher','supervisor','parent'],
}
// can this role open this path? (ignores query/hash)
export function canAccess(role, path){
  if(!path) return false
  const base=path.split('?')[0].split('#')[0]
  const roles=ROUTE_ROLES[base]
  return !roles || roles.includes(role)   // unknown paths default open
}
// resolve a safe destination for a notification link given the recipient's role
export function safeLink(role, link){
  return canAccess(role, link||'/app') ? (link||'/app') : '/app/notifications'
}
