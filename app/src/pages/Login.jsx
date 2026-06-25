import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { login, loginAs } from '../auth.js'
import { ROLE } from '../theme.js'
import { db } from '../db.js'
import { Zap } from 'lucide-react'
export default function Login(){
  const nav=useNavigate(); const [email,setEmail]=useState(''); const [pw,setPw]=useState(''); const [err,setErr]=useState(false)
  const go=()=>{ const u=login(email,pw); if(u){nav('/app')} else setErr(true) }
  const quick=db().users.filter(u=>['schooladmin','admin','teacher','supervisor','parent'].includes(u.role)).filter((u,i,a)=>a.findIndex(x=>x.role===u.role)===i)
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 text-white" style={{background:'linear-gradient(150deg,#6C5CE7,#36C5F0)'}}>
        <div className="flex items-center gap-2 font-extrabold text-lg"><span className="w-9 h-9 rounded-xl grid place-items-center bg-white/20" style={{padding:4}}><svg viewBox="0 0 68 72" width="22" height="22"><path d="M34 62 C31 52 28 47 22 43 C15 38 10 31 7 22 C18 27 28 33 31 41 L34 46 L37 41 C40 33 50 27 61 22 C58 31 53 38 46 43 C40 47 37 52 34 62 Z" fill="white"/></svg></span> kogia edu</div>
        <div><div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/15 mb-4"><Zap size={13}/> La gestion scolaire, simplifiée</div>
          <h1 className="text-4xl font-extrabold leading-tight max-w-[16ch]">Gérez toute votre école depuis un seul endroit.</h1>
          <p className="mt-4 text-white/80 max-w-[42ch]">Évaluations, frais, présence, incidents, annonces et communication avec les parents — une seule plateforme.</p></div>
        <div className="text-white/70 text-sm">par Kogia Group · © 2026 · 🇹🇳 Tunisie</div>
      </div>
      <div className="flex items-center justify-center p-8 bg-canvas">
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 font-extrabold mb-6"><span className="w-9 h-9 rounded-xl grid place-items-center text-white" style={{background:'#6C5CE7'}}>K</span> Coreon Edu</div>
          <h2 className="text-2xl font-extrabold">Bon retour 👋</h2>
          <p className="text-muted text-sm mb-6">Connectez-vous à votre portail.</p>
          <div className="space-y-3">
            <input value={email} onChange={e=>{setEmail(e.target.value);setErr(false)}} placeholder="E-mail" className="w-full rounded-xl border border-line bg-white px-3 py-3 text-sm"/>
            <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr(false)}} onKeyDown={e=>e.key==='Enter'&&go()} placeholder="Mot de passe" className="w-full rounded-xl border border-line bg-white px-3 py-3 text-sm"/>
            {err&&<div className="text-sm text-coral">E-mail ou mot de passe incorrect.</div>}
            <button onClick={go} className="w-full rounded-xl py-3 font-semibold text-white" style={{background:'#6C5CE7'}}>Se connecter</button>
          </div>
          <div className="mt-6"><div className="text-xs text-muted mb-2">Démo — connexion en un clic :</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>{loginAs('u_owner');nav('/app')}} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line bg-white" style={{color:'#6C5CE7'}}>Propriétaire</button>
              {quick.map(u=>{const r=ROLE[u.role];return <button key={u.id} onClick={()=>{loginAs(u.id);nav('/app')}} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line bg-white" style={{color:r.color}}>{r.label}</button>})}
            </div>
            <div className="text-[11px] text-muted mt-3">ex : enseignant@alnour.tn / teacher · direction@alnour.tn / admin</div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
