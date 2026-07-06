import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { current } from '../auth.js'
import { db, studentById, classById } from '../db.js'
import { DAYS } from '../data.js'
import { PageHead, Card, Select } from '../components/ui.jsx'
import { studentColor } from '../data.js'
import { Radio, Clock, MapPin, GraduationCap, Cross } from 'lucide-react'
import { AREAS, KIND_AREA, fmt, daySegments, statusAt } from '../livestatus.js'
import RoomArt, { Kid } from '../components/RoomArt.jsx'

// live "window" into the room the child is in right now — fully hand-drawn scene
function RoomScene({ area, place, kid, title, sub, live, min }){
  return (
    <div className="relative w-full aspect-video overflow-hidden bg-ink">
      <AnimatePresence mode="popLayout">
        <motion.div key={place} className="absolute inset-0"
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.45}}>
          <RoomArt place={place} gender={kid.gender} className="absolute inset-0 w-full h-full"/>
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(to top, rgba(8,12,26,.5) 0%, rgba(8,12,26,.05) 30%, transparent 50%)'}}/>
      {/* room plaque */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white/90 shadow" style={{color:area.color}}>
        {place==='infirmerie'?<Cross size={13}/>:<MapPin size={13}/>} {area.label}
      </div>
      {/* live badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full text-white shadow" style={{background:live?'#FF3B5C':'#8A93A6'}}>
        <motion.span animate={{opacity:[1,.3,1]}} transition={{repeat:Infinity,duration:1.4}}><Radio size={12}/></motion.span>
        {live?'EN DIRECT':'Aperçu'} · {fmt(min)}
      </div>
      {/* name chip */}
      <div className="absolute top-3 right-3 text-[11px] font-bold text-white px-2.5 py-1.5 rounded-full shadow" style={{background:area.color}}>{kid.name.split(' ')[0]}</div>
      {/* status caption */}
      <div className="absolute bottom-3 left-4 text-white drop-shadow">
        <div className="text-lg font-extrabold leading-tight">{title}</div>
        <div className="text-sm opacity-90">{sub}</div>
      </div>
    </div>
  )
}

export default function Live(){
  const u=current(); const d=db()
  const kids=(u.childIds||[]).map(studentById).filter(Boolean)
  const [kidId,setKidId]=useState(kids[0]?.id)
  const kid=kids.find(k=>k.id===kidId)||kids[0]
  const cls=kid?classById(kid.classId):null

  const now=new Date(); const wd=now.getDay(); const realWeekday=wd>=1&&wd<=5
  const dayIdx=realWeekday?wd-1:0
  const nowMin=now.getHours()*60+now.getMinutes()
  const inSchool=realWeekday&&nowMin>=480&&nowMin<=900
  const [min,setMin]=useState(inSchool?nowMin:630)
  const [liveNow,setLiveNow]=useState(inSchool)
  useEffect(()=>{ if(!liveNow) return; const t=setInterval(()=>{const n=new Date();setMin(n.getHours()*60+n.getMinutes())},20000); return ()=>clearInterval(t) },[liveNow])

  const sick=useMemo(()=>d.incidents.some(i=>i.studentId===kid?.id&&i.type==='Santé'&&i.status==='open'&&(Date.now()-i.at)<86400000),[d,kid])
  const st=useMemo(()=>kid?statusAt(kid.classId,dayIdx,min,sick):null,[kid,dayIdx,min,sick])
  if(!kid) return <Card className="p-10 text-center text-muted">Aucun enfant associé à ce compte.</Card>
  const area=AREAS[st.place]
  const segLen=Math.max(1,st.seg.end-st.seg.start); const done=Math.min(1,Math.max(0,(min-st.seg.start)/segLen)); const remain=Math.max(0,st.seg.end-min)
  const segs=daySegments(kid.classId,dayIdx)

  return (<>
    <PageHead title="Suivi en direct" sub={`Où se trouve ${kid.name.split(' ')[0]} en ce moment.`}
      action={kids.length>1&&<Select value={kidId} onChange={e=>setKidId(e.target.value)}>{kids.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}</Select>}/>

    <div className="grid lg:grid-cols-[1fr_340px] gap-5">
      <Card className="p-0 overflow-hidden relative">
        <RoomScene area={area} place={st.place} kid={kid} title={st.title} sub={st.sub} live={liveNow} min={min}/>
        {(()=>{ const nx=segs.find(s=>s.start>min); const na=nx?AREAS[KIND_AREA[nx.kind]||'class']:null
          const nlabel=nx&&(nx.kind==='class'?(nx.cell?.subject||'Étude'):nx.kind==='cour'?'Récréation':nx.kind==='cantine'?'Déjeuner':'Étude')
          return <div className="flex items-center gap-3 px-4 py-3 border-t border-line">
            {nx?<><div className="w-14 h-10 rounded-lg overflow-hidden shrink-0"><RoomArt place={KIND_AREA[nx.kind]||'class'} gender={kid.gender}/></div>
              <div className="min-w-0"><div className="text-[11px] font-semibold text-muted uppercase tracking-wide">À suivre</div>
                <div className="text-sm font-bold truncate">{nlabel} <span className="text-muted font-normal">· dès {fmt(nx.start)}</span></div></div>
              <div className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full shrink-0" style={{background:na.color+'18',color:na.color}}>{Math.max(0,nx.start-min)} min</div></>
            :<div className="text-sm text-muted flex items-center gap-2"><GraduationCap size={15}/> Journée terminée — sortie des classes.</div>}
          </div> })()}
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="w-12 h-14 rounded-2xl grid place-items-end justify-center overflow-hidden shrink-0" style={{background:studentColor(kid.id)+'18'}}><Kid gender={kid.gender} size={54}/></span>
            <div><div className="font-bold">{kid.name}</div><div className="text-xs text-muted">{cls?.name} · {cls?.cycle}</div></div>
          </div>
          <div className="mt-4 rounded-2xl p-4" style={{background:area.color+'12'}}>
            <div className="flex items-center gap-2 text-sm font-bold" style={{color:area.color}}><MapPin size={15}/> {area.label}</div>
            <div className="text-lg font-extrabold mt-1">{st.title}</div>
            <div className="text-sm text-muted">{st.sub}</div>
            {remain>0 && st.title!=='Journée terminée' && st.title!=='Avant l’école' && <>
              <div className="mt-3 h-2 rounded-full bg-white/70 overflow-hidden"><motion.div className="h-full rounded-full" style={{background:area.color}} animate={{width:`${Math.round(done*100)}%`}} transition={{type:'spring',stiffness:80,damping:18}}/></div>
              <div className="flex items-center justify-between mt-1.5 text-xs"><span className="flex items-center gap-1 text-muted"><Clock size={12}/> Se termine à {fmt(st.seg.end)}</span><span className="font-bold" style={{color:area.color}}>{remain} min restantes</span></div>
            </>}
          </div>
          {!inSchool && <div className="text-[11px] text-muted mt-3">Hors des heures d’école — aperçu d’une journée type. Faites glisser pour explorer.</div>}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2"><div className="font-bold text-sm">Explorer la journée</div>
            <button onClick={()=>{setMin(inSchool?nowMin:630);setLiveNow(inSchool)}} className="text-xs font-semibold accent-text">{inSchool?'Revenir à maintenant':'Réinitialiser'}</button></div>
          <input type="range" min={480} max={900} step={5} value={min} onChange={e=>{setMin(+e.target.value);setLiveNow(false)}} className="w-full accent-[var(--accent)]"/>
          <div className="flex justify-between text-[10px] text-muted mt-1"><span>08:00</span><span className="font-bold text-ink">{fmt(min)}</span><span>15:00</span></div>
        </Card>
      </div>
    </div>

    <Card className="p-4 mt-5">
      <div className="font-bold text-sm mb-3 flex items-center gap-2"><GraduationCap size={16} className="accent-text"/> Journée de {kid.name.split(' ')[0]} · {realWeekday?DAYS[dayIdx]:'Lundi (aperçu)'}</div>
      <div className="flex gap-2 overflow-x-auto scroll-thin pb-1">
        {segs.map((s,i)=>{const isNow=min>=s.start&&min<s.end;const a=AREAS[KIND_AREA[s.kind]||'class'];const c=a.color;
          const label=s.kind==='class'?(s.cell?.subject||'Étude'):s.kind==='cour'?'Récréation':s.kind==='cantine'?'Déjeuner':'Libre'
          return <div key={i} className={`shrink-0 w-32 rounded-xl overflow-hidden border ${isNow?'border-transparent':'border-line'}`} style={isNow?{boxShadow:`0 0 0 2px ${c}`}:{}}>
            <div className="relative h-14"><RoomArt place={KIND_AREA[s.kind]||'class'} gender={kid.gender}/>
              {isNow&&<div className="absolute inset-0 grid place-items-center" style={{background:c+'55'}}><span className="w-7 h-7 rounded-full bg-white/90 grid place-items-center"><Radio size={13} style={{color:c}}/></span></div>}</div>
            <div className="p-2">
              <div className="text-[10px] text-muted">{fmt(s.start)}–{fmt(s.end)}</div>
              <div className="text-[12px] font-bold truncate" style={{color:isNow?c:'#1E2433'}}>{label}</div>
              {s.cell?.room&&<div className="text-[10px] text-muted truncate">{s.cell.room}</div>}
            </div>
          </div>})}
      </div>
    </Card>
  </>)
}
