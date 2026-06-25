import { mutate, db, uid } from './db.js'
import toast from 'react-hot-toast'
// send to a specific user (to=userId) or a whole role (role='admin')
export function notify({to=null, role=null, kind="info", title, body}){
  mutate(d=>{ d.notifications.unshift({ id:uid("n"), to, role, kind, title, body, at:Date.now(), read:false }) })
}
export function notifyToast(msg){ toast.success(msg) }
export function inboxFor(user){
  if(!user) return []
  return db().notifications.filter(n => n.to===user.id || (n.role && n.role===user.role))
}
export function unreadFor(user){ return inboxFor(user).filter(n=>!n.read).length }
export function markAllRead(user){
  mutate(d=>{ d.notifications.forEach(n=>{ if(n.to===user.id || (n.role&&n.role===user.role)) n.read=true }) })
}
