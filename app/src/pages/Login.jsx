import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { login, loginAs } from '@core/auth.js'
import { ROLE } from '@core/theme.js'
import { db } from '@core/db.js'
import { Zap } from 'lucide-react'
import { Mark, Input, Btn } from '../components/ui.jsx'
export default function Login(){
  const nav=useNavigate(); const [email,setEmail]=useState(''); const [pw,setPw]=useState(''); const [err,setErr]=useState(false)
  const go=()=>{ const u=login(email,pw); if(u&&!u.disabled){nav('/app')} else setErr(u&&u.disabled?'Ce compte a été désactivé. Contactez la direction.':'E-mail ou mot de passe incorrect.') }
  const quick=db().users.filter(u=>['schooladmin','admin','teacher','supervisor','security','parent'].includes(u.role)).filter((u,i,a)=>a.findIndex(x=>x.role===u.role)===i)
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 text-white" style={{background:'linear-gradient(150deg,#6366F1,#8B5CF6)'}}>
        <div className="flex items-center gap-2 font-extrabold text-lg"><span className="w-9 h-9 rounded-xl grid place-items-center bg-white/20" style={{padding:4}}><svg viewBox="0 0 132 96" width="30" height="22"><path fill="white" d="M12 54 C12 34 28 22 52 22 C74 22 88 32 91 46 C94 38 99 30 107 25 C105 32 104 38 105 43 C110 41 117 41 124 44 C117 48 111 50 106 50 C102 62 92 70 76 73 C58 76 34 74 22 68 C14 64 12 60 12 54 Z"/><circle cx="34" cy="45" r="4.2" fill="#312E81"/><path d="M42 12 q-1 -7 5 -9 M50 12 q4 -6 11 -6" stroke="white" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".85"/></svg></span> coreon edu</div>
        <div><div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/15 mb-4"><Zap size={13}/> Pas un ERP scolaire de plus</div>
          <h1 className="text-4xl font-extrabold leading-tight max-w-[16ch]">L'école qu'on a envie d'ouvrir.</h1>
          <p className="mt-4 text-white/80 max-w-[42ch]">Évaluer une classe en 30 secondes, suivre la journée de son enfant en direct, organiser la vie commune — web et mobile, les mêmes données.</p></div>
        <div className="text-white/70 text-sm">par Kogia Group · © 2026 · Tunisie</div>
      </div>
      <div className="flex items-center justify-center p-8 bg-canvas">
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-6"><Mark size={30}/><span className="font-extrabold lowercase tracking-tight">coreon <span className="text-sm font-normal" style={{color:'#5B6EE1'}}>edu</span></span></div>
          <h2 className="text-2xl font-extrabold">Bon retour</h2>
          <p className="text-muted text-sm mb-6">Connectez-vous à votre portail.</p>
          <div className="space-y-3">
            <Input value={email} onChange={e=>{setEmail(e.target.value);setErr(false)}} placeholder="E-mail"/>
            <Input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr(false)}} onKeyDown={e=>e.key==='Enter'&&go()} placeholder="Mot de passe"/>
            {err&&<div className="text-sm text-coral">{typeof err==='string'?err:'E-mail ou mot de passe incorrect.'}</div>}
            {/* la page publique n'a pas encore de --accent : on garantit le fond marque */}
            <Btn size="lg" className="w-full" onClick={go} style={{background:'#6366F1'}}>Se connecter</Btn>
          </div>
          <div className="mt-6"><div className="text-xs text-muted mb-2">Démo — connexion en un clic :</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>{loginAs('u_owner');nav('/app')}} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line bg-white" style={{color:ROLE.owner.color}}>Kogia Group ({ROLE.owner.label})</button>
              {quick.map(u=>{const r=ROLE[u.role];return <button key={u.id} onClick={()=>{loginAs(u.id);nav('/app')}} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line bg-white" style={{color:r.color}}>{r.label}</button>})}
            </div>
            <div className="text-[12px] text-muted mt-3">ex : enseignant@alnour.tn / teacher · direction@alnour.tn / admin · securite@alnour.tn / secu</div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
