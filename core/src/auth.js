import { db } from './db.js'
import { getSession, setSession, removeSession } from './storage.js'
import { record, setAuditIdentity, DETAILS } from './audit.js'
const SK="coreon_session"
const TK="coreon_session_exp"
const TTL=8*60*60*1000  // sessions expire after 8h

function open(id){ setSession(SK,id); setSession(TK,String(Date.now()+TTL)) }
// NOTE (prod): replace this plaintext check with a server call + hashed passwords (bcrypt/argon2).
export function login(email,pw){
  const u = db().users.find(u=>u.email.toLowerCase()===String(email).trim().toLowerCase() && u.pw===pw)
  // CR-039 : le journal d'audit consigne les entrées ET les entrées REFUSÉES.
  // Une série de refus sur un même compte est le premier signe d'une intrusion —
  // c'est la ligne qu'un contrôleur PDPL cherche en premier. Le mot de passe
  // essayé n'est évidemment jamais écrit ; l'adresse tentée, oui.
  const mail = String(email).trim()
  if(u && u.disabled){ audit('denied', u, DETAILS.compteDesactive); return {disabled:true} }
  // QA FAT 2026-07-26 (REJET) : « Suspendre l'école » promettait de couper
  // l'accès à tout le monde… et ne coupait rien. Une école suspendue par Kogia
  // (impayé, fin de contrat) ne laisse plus entrer que le compte plateforme.
  if(u && u.role !== 'owner' && schoolSuspended()){ audit('denied', u, DETAILS.ecoleSuspendue); return { suspended:true } }
  if(u){ open(u.id); audit('login', u, ''); return u }
  audit('denied', { id:'', name:mail, role:'' }, DETAILS.identifiantsFaux)
  return null
}

function audit(action, u, detail){
  record({ action, category:'compte', subjectId:u?.id||'', subjectName:u?.name||'', detail, user:u||null })
}

/** L'école de CE déploiement est-elle suspendue par Kogia Group ? */
export function schoolSuspended(){
  const d = db()
  const own = (d.schools || []).find(s => s.live) || null
  return own ? own.status === 'suspended' : false
}
export function loginAs(id){ open(id); const u=current(); audit('login', u, ''); return u }
export function logout(){ const u=current(); if(u) audit('logout', u, ''); removeSession(SK); removeSession(TK) }
export function current(){
  const exp=+getSession(TK)||0
  if(exp && Date.now()>exp){ logout(); return null }   // expired → force re-login
  const id=getSession(SK)
  return db().users.find(u=>u.id===id)||null
}

// « Qui est connecté ? » est une question d'AUTHENTIFICATION, pas de journal :
// c'est donc ici qu'on la branche, une fois pour toutes. Le sens de la
// dépendance compte — audit.js ne connaît PAS auth.js (sinon les deux modules
// s'importeraient en rond) : il expose une prise, auth.js y branche `current`.
// Conséquence : toute application qui sait se connecter journalise avec un nom,
// sans que son point d'entrée ait à y penser.
setAuditIdentity(current)
