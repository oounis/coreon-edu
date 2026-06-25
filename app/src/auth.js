import { db } from './db.js'
const SK="coreon_session"
export function login(email,pw){
  const u = db().users.find(u=>u.email.toLowerCase()===email.toLowerCase() && u.pw===pw)
  if(u){ sessionStorage.setItem(SK,u.id); return u } return null
}
export function loginAs(id){ sessionStorage.setItem(SK,id); return current() }
export function logout(){ sessionStorage.removeItem(SK) }
export function current(){ const id=sessionStorage.getItem(SK); return db().users.find(u=>u.id===id)||null }
