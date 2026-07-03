import { db } from './db.js'
const SK="coreon_session"
const TK="coreon_session_exp"
const TTL=8*60*60*1000  // sessions expire after 8h

function open(id){ sessionStorage.setItem(SK,id); sessionStorage.setItem(TK,String(Date.now()+TTL)) }
// NOTE (prod): replace this plaintext check with a server call + hashed passwords (bcrypt/argon2).
export function login(email,pw){
  const u = db().users.find(u=>u.email.toLowerCase()===String(email).trim().toLowerCase() && u.pw===pw)
  if(u && u.disabled) return {disabled:true}          // account deactivated by Direction
  if(u){ open(u.id); return u } return null
}
export function loginAs(id){ open(id); return current() }
export function logout(){ sessionStorage.removeItem(SK); sessionStorage.removeItem(TK) }
export function current(){
  const exp=+sessionStorage.getItem(TK)||0
  if(exp && Date.now()>exp){ logout(); return null }   // expired → force re-login
  const id=sessionStorage.getItem(SK)
  return db().users.find(u=>u.id===id)||null
}
