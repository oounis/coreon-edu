import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { current } from '../auth.js'
import { db, studentById, classById } from '../db.js'
import { DAYS } from '../data.js'
import { PageHead, Card, Select } from '../components/ui.jsx'
import { studentColor } from '../data.js'
import { Radio, Clock, MapPin } from 'lucide-react'
import { AREAS, fmt, daySegments, statusAt } from '../livestatus.js'
import { Kid } from '../components/Kid.jsx'
import { studentAvatar, avatarBg } from '../people.js'
import RouteMap from '../components/RouteMapFlow.jsx'

const stopLabel=s=> s.kind==='class'?(s.cell?.subject||'Étude') : s.kind==='cour'?'Récré' : s.kind==='cantine'?'Déjeuner' : 'Étude'

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
  const open=segs[0].start, close=segs[segs.length-1].end
  const first=kid.name.split(' ')[0]; const day=realWeekday?DAYS[dayIdx]:'Lundi (aperçu)'

  // build the route: Arrivée → periods/récré/déjeuner → Sortie
  const stops=[
    { kind:'entree', label:'Arrivée', time:fmt(open) },
    ...segs.map(s=>({ kind:s.kind==='free'?'class':s.kind, label:stopLabel(s), sub:s.cell?.room, time:fmt(s.start) })),
    { kind:'entree', label:'Sortie', time:fmt(close) },
  ]
  let curIndex, mapDone
  if(min<open){ curIndex=0; mapDone=0 }
  else if(min>=close){ curIndex=stops.length-1; mapDone=1 }
  else { const j=segs.findIndex(s=>min>=s.start&&min<s.end); const sg=segs[j<0?segs.length-1:j]; curIndex=(j<0?segs.length-1:j)+1; mapDone=Math.min(1,Math.max(0,(min-sg.start)/Math.max(1,sg.end-sg.start))) }

  return (<>
    <PageHead title="Suivi en direct" sub={`Le parcours de ${first} pendant la journée.`}
      action={kids.length>1&&<Select value={kidId} onChange={e=>setKidId(e.target.value)}>{kids.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}</Select>}/>

    <div className="grid lg:grid-cols-[1fr_340px] gap-5">
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full text-white shadow" style={{background:liveNow?'#FF3B5C':'#8A93A6'}}>
              <motion.span animate={{opacity:[1,.3,1]}} transition={{repeat:Infinity,duration:1.4}}><Radio size={12}/></motion.span>{liveNow?'EN DIRECT':'Aperçu'} · {fmt(min)}</span>
            <span className="text-sm font-bold text-muted hidden sm:inline">Journée de {first} · {day}</span>
          </div>
          <span className="text-sm font-extrabold px-3 py-1 rounded-full" style={{background:area.color+'16',color:area.color}}>{st.title}</span>
        </div>
        <RouteMap stops={stops} curIndex={curIndex} done={mapDone} remain={remain} name={first} live={liveNow}/>
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="w-14 h-14 rounded-2xl overflow-hidden grid place-items-center shrink-0" style={{background:avatarBg(kid.id)}}><img src={studentAvatar(kid.gender,kid.id)} alt="" className="w-full h-full object-contain"/></span>
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
  </>)
}
