import { db } from '../db.js'
import { current } from '../auth.js'
import { PageHead, StatCard, SectionCard, EmptyState, Btn, Avatar } from '../components/ui.jsx'
import { Bus, Phone, Clock, Users, Route, School } from 'lucide-react'

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
            <span className={`mt-2 text-[10px] text-center leading-tight ${done?'font-bold text-ink':'text-muted'}`}>{s}</span>
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
    ? <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{background:'#10B981'}}><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>EN DIRECT</span>
    : <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-canvas text-muted">Aperçu</span>
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
          <div className="text-right"><div className="text-[11px] text-muted flex items-center gap-1 justify-end"><Clock size={11}/> {dir==='out'?'Dépose':'Arrivée'} à {nextStop}</div><div className="text-sm font-extrabold accent-text">≈ {eta} min</div></div>
          <Btn variant="soft" size="sm" aria-label={`Appeler ${r.driver}`}><Phone size={14}/> Appeler</Btn>
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
  return (<>
    <PageHead title="Transport scolaire" sub={u?.role==='parent'?'Suivez le bus de votre enfant en temps réel.':'Flotte, circuits et suivi en direct.'}/>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
      <StatCard tint="brand"  icon={<Route size={20}/>}  value={routes.length} label="Circuits"/>
      <StatCard tint="butter" icon={<Bus size={20}/>}    value={routes.length} label="Bus en service"/>
      <StatCard tint="sky"    icon={<Users size={20}/>}  value={totalKids}     label="Élèves transportés"/>
      <StatCard tint="mint"   icon={<Clock size={20}/>}  value="98%"           label="Ponctualité" sub="30 j"/>
    </div>
    {routes.length===0
      ? <SectionCard headless><EmptyState icon={<Bus size={26}/>} title="Aucun circuit de transport" sub="Ajoutez un circuit pour commencer à suivre les bus et informer les parents."/></SectionCard>
      : <div className="grid lg:grid-cols-2 gap-4">{ordered.map(r=><RouteCard key={r.id} r={r} mine={r.id===mineId}/>)}</div>}
  </>)
}
