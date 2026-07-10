import { db } from './db.js'
import { getSession, setSession, removeSession } from './storage.js'
const SK="coreon_session"
const TK="coreon_session_exp"
const TTL=8*60*60*1000  // sessions expire after 8h

function open(id){ setSession(SK,id); setSession(TK,String(Date.now()+TTL)) }
// NOTE (prod): replace this plaintext check with a server call + hashed passwords (bcrypt/argon2).
export function login(email,pw){
  const u = db().users.find(u=>u.email.toLowerCase()===String(email).trim().toLowerCase() && u.pw===pw)
  if(u && u.disabled) return {disabled:true}          // account deactivated by Direction
  if(u){ open(u.id); return u } return null
}
export function loginAs(id){ open(id); return current() }
export function logout(){ removeSession(SK); removeSession(TK) }
export function current(){
  const exp=+getSession(TK)||0
  if(exp && Date.now()>exp){ logout(); return null }   // expired → force re-login
  const id=getSession(SK)
  return db().users.find(u=>u.id===id)||null
}
