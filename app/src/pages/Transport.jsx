import { useState } from 'react'
import { STATUS } from '../components/ui.jsx'
import { db } from '@core/db.js'
import { current } from '@core/auth.js'
import { PageHead, StatCard, SectionCard, EmptyState, Btn, Avatar, Modal } from '../components/ui.jsx'
import { Bus, Phone, Clock, Users, Route, School, MapPin } from 'lucide-react'

// Simulated live position of a bus along its run (mock data → deterministic by clock).
function liveState(){
  const now=new Date(); const min=now.getHours()*60+now.getMinutes()
  const AM=[400,480], PM=[900,980] // 06:40–08:00 vers l'école · 15:00–16:20 retour
  if(min>=AM[0]&&min<=AM[1]) return { live:true, dir:'in',  prog:(min-AM[0])/(AM[1]-AM[0]) }
  if(min>=PM[0]&&min<=PM[1]) return { live:true, dir:'out', prog:(min-PM[0])/(PM[1]-PM[0]) }
  return { live:false, dir: min<720?'in':'out', prog:0.55 } // hors service → aperçu
}
function seqFor(r, dir){ return dir==='out' ? ['École', ...[...r.stops].reverse()] : [...r.stops, 'École'] }

function Journey({ seq, prog, live }){
  const n=seq.length, at=i=> n<=1?0:i/(n-1)
  return (
    <div className="relative h-24 mx-3">
      <div className="absolute left-0 right-0 top-7 h-1.5 rounded-full bg-line"/>
      <div className="absolute left-0 top-7 h-1.5 rounded-full accent-bg transition-all" style={{width:`${prog*100}%`}}/>
      {seq.map((s,i)=>{ const done=at(i)<=prog+0.001; const isSchool=s==='École'
        return (
          <div key={i} className="absolute -translate-x-1/2 flex flex-col items-center" style={{left:`${at(i)*100}%`, top:0, width:70}}>
            <span className={`mt-[19px] grid place-items-center rounded-full border-2 ${isSchool?'w-4 h-4':'w-3.5 h-3.5'} ${done?'accent-bg border-transparent':'bg-white border-line'}`}>
              {isSchool && <School size={9} className="text-white"/>}
            </span>
            <span className={`mt-2 text-[11px] text-center leading-tight ${done?'font-bold text-ink':'text-muted'}`}>{s}</span>
          </div>
        )
      })}
      <div className="absolute -translate-x-1/2 top-[6px] transition-all" style={{left:`${prog*100}%`}}>
        {live && <span className="absolute inset-0 rounded-full accent-bg animate-ping opacity-30"/>}
        <span className="relative w-8 h-8 rounded-full accent-bg text-white grid place-items-center shadow-lg ring-4 ring-white"><Bus size={15}/></span>
      </div>
    </div>
  )
}

function RouteCard({ r, mine }){
  const { live, dir, prog } = liveState()
  const seq = seqFor(r, dir)
  const n=seq.length, idx=Math.min(n-1, Math.floor(prog*(n-1))+1)
  const nextStop=seq[idx], eta=Math.max(1, Math.round((idx/(n-1)-prog)*42))
  const statusPill = live
    ? <span className="flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-full text-white" style={{background:STATUS.live}}><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>EN DIRECT</span>
    : <span className="text-[12px] font-bold px-2.5 py-1 rounded-full bg-canvas text-muted">Aperçu</span>
  return (
    <SectionCard icon={<Bus size={16}/>} tint="butter" title={r.name} sub={`Bus ${r.bus} · ${r.students} élèves`} action={statusPill}
      className={mine?'ring-2 ring-[var(--accent)]':''}>
      {mine && <div className="mb-3 -mt-1 inline-flex items-center gap-1.5 text-xs font-bold accent-text accent-soft px-2.5 py-1 rounded-full">Circuit de votre enfant</div>}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <Avatar name={r.driver} size={40}/>
          <div><div className="font-bold leading-tight">{r.driver}</div><div className="text-xs text-muted">Chauffeur</div></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right"><div className="text-[12px] text-muted flex items-center gap-1 justify-end"><Clock size={11}/> {dir==='out'?'Dépose':'Arrivée'} à {nextStop}</div><div className="text-sm font-extrabold accent-text">≈ {eta} min</div></div>
          {/* le bouton n'avait aucun handler : il ouvre maintenant vraiment le téléphone */}
          {r.phone
            ? <a href={`tel:${r.phone}`} aria-label={`Appeler ${r.driver} au ${r.phone}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition text-xs px-3 py-2 bg-canvas border border-line hover:bg-white active:scale-[.98]">
                <Phone size={14}/> Appeler</a>
            : <Btn variant="soft" size="sm" disabled title="Aucun numéro enregistré pour ce chauffeur"><Phone size={14}/> Appeler</Btn>}
        </div>
      </div>
      <Journey seq={seq} prog={prog} live={live}/>
    </SectionCard>
  )
}

export default function Transport(){
  const d=db(); const u=current()
  const routes=d.routes||[]
  const mineId = u?.role==='parent' && routes.length ? routes[(u.childIds?.[0]?.charCodeAt(1)||0)%routes.length].id : null
  const ordered = mineId ? [...routes].sort((a,b)=> (a.id===mineId?-1:b.id===mineId?1:0)) : routes
  const totalKids=routes.reduce((s,r)=>s+r.students,0)
  // « Bus en service » répétait le nombre de circuits, et la ponctualité était
  // écrite en dur (98 %). On n'affiche plus que des chiffres réellement mesurés.
  const buses=new Set(routes.map(r=>r.bus)).size
  const stops=routes.reduce((s,r)=>s+(r.stops?.length||0),0)
  // Chaque tuile s'ouvre : le détail par circuit, pas seulement le total.
  const [tile,setTile]=useState(null) // routes | buses | kids | stops
  return (<>
    <PageHead title="Transport scolaire" sub={u?.role==='parent'?'Suivez le bus de votre enfant en temps réel.':'Flotte, circuits et suivi en direct.'}/>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
      <StatCard tint="brand"  icon={<Route size={20}/>}  value={routes.length} label="Circuits" onClick={()=>setTile('routes')}/>
      <StatCard tint="butter" icon={<Bus size={20}/>}    value={buses}         label="Bus en service" onClick={()=>setTile('buses')}/>
      <StatCard tint="sky"    icon={<Users size={20}/>}  value={totalKids}     label="Élèves transportés" onClick={()=>setTile('kids')}/>
      <StatCard tint="mint"   icon={<MapPin size={20}/>} value={stops}         label="Arrêts desservis" onClick={()=>setTile('stops')}/>
    </div>

    {tile && (()=>{
      const TITLE={routes:`Circuits · ${routes.length}`,buses:`Bus en service · ${buses}`,kids:`Élèves transportés · ${totalKids}`,stops:`Arrêts desservis · ${stops}`}
      return (
      <Modal open onClose={()=>setTile(null)} title={TITLE[tile]} size="xl"
        footer={<Btn variant="ghost" onClick={()=>setTile(null)}>Fermer</Btn>}>
        {routes.length===0 ? <EmptyState icon={<Bus size={24}/>} title="Aucun circuit de transport" sub="Ajoutez un circuit pour commencer."/>
        : <div className="space-y-1.5">
          {routes.map(r=>(
            <div key={r.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
              <Avatar name={r.driver} seed={r.id} size={32}/>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{r.name} <span className="text-muted font-normal">· bus {r.bus}</span></span>
                {tile==='stops'
                  ? <span className="flex flex-wrap gap-1 mt-0.5">{(r.stops||[]).map(s=><span key={s} className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-canvas text-muted">{s}</span>)}</span>
                  : <span className="block text-[12px] text-muted truncate">{r.driver} · {(r.stops||[]).length} arrêts · {r.students} élèves</span>}
              </span>
              {tile==='kids' && <span className="text-sm font-extrabold accent-text">{r.students}</span>}
              {tile==='buses' && r.phone && <a href={`tel:${r.phone}`} className="text-xs font-semibold inline-flex items-center gap-1 accent-text"><Phone size={13}/> Appeler</a>}
            </div>))}
        </div>}
      </Modal>) })()}
    {routes.length===0
      ? <SectionCard headless><EmptyState icon={<Bus size={26}/>} title="Aucun circuit de transport" sub="Ajoutez un circuit pour commencer à suivre les bus et informer les parents."/></SectionCard>
      : <div className="grid lg:grid-cols-2 gap-4">{ordered.map(r=><RouteCard key={r.id} r={r} mine={r.id===mineId}/>)}</div>}
  </>)
}
