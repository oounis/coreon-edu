import { mutate, db, uid } from './db.js'
export function notify({to=null,role=null,kind="info",actor=null,title,body,link=null}){
  mutate(d=>{ d.notifications.unshift({ id:uid("n"), to, role, kind, actor, title, body, link, at:Date.now(), read:false }) })
}
export function inboxFor(user){ if(!user) return []; return db().notifications.filter(n=>n.to===user.id||(n.role&&n.role===user.role)) }
export function unreadFor(user){ return inboxFor(user).filter(n=>!n.read).length }
export function markRead(id){ mutate(d=>{ const n=d.notifications.find(x=>x.id===id); if(n)n.read=true }) }
export function markAllRead(user){ mutate(d=>{ d.notifications.forEach(n=>{ if(n.to===user.id||(n.role&&n.role===user.role)) n.read=true }) }) }
