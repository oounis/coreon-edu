import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { current } from '@core/auth.js'
import { db, studentById, classById } from '@core/db.js'
import { DAYS } from '@core/data.js'
import { PageHead, Card, Select, Avatar, Badge, EmptyState, STATUS } from '../components/ui.jsx'
import { Radio, Clock, MapPin, Moon, Sun, CalendarCheck, ClipboardCheck } from 'lucide-react'
import { AREAS, fmt, daySegments, statusAt, schoolPhase } from '@core/livestatus.js'
import { studentSummary, mentionFor } from '@core/results.js'
import RouteMap from '../components/RouteMapFlow.jsx'
import { isoOf, now as appNow, isDemoLive } from '@core/clock.js'
import { rentreeLabel, DemoLiveButton } from '../components/Summer.jsx'

const stopLabel=s=> s.kind==='class'?(s.cell?.subject||'Étude') : s.kind==='cour'?'Récré' : s.kind==='cantine'?'Déjeuner' : 'Étude'

export default function Live(){
  const u=current(); const d=db()
  const kids=(u.childIds||[]).map(studentById).filter(Boolean)
  const [kidId,setKidId]=useState(kids[0]?.id)
  const kid=kids.find(k=>k.id===kidId)||kids[0]
  const cls=kid?classById(kid.classId):null

  // ── temps scolaire réel : le suivi vit aux heures de l'école, pas après ──
  const now=appNow(); const wd=now.getDay(); const realWeekday=isDemoLive()||(wd>=1&&wd<=5)
  const dayIdx=(wd>=1&&wd<=5)?wd-1:0
  const nowMin=now.getHours()*60+now.getMinutes()
  const phase = schoolPhase(now)
  const defMin = phase==='live'?nowMin : phase==='after'?900 : phase==='before'?480 : 630   // vacances/week-end → aperçu 10:30
  const [min,setMin]=useState(defMin)
  const [liveNow,setLiveNow]=useState(phase==='live')
  const exploring = !liveNow && min!==defMin
  const simulated = exploring && (phase==='vacances'||phase==='weekend'||phase==='before')   // journée type, pas la réalité
  const replay = exploring && phase==='after'                                               // revoir la vraie journée
  useEffect(()=>{ if(!liveNow) return; const t=setInterval(()=>{const n=appNow();setMin(n.getHours()*60+n.getMinutes())},20000); return ()=>clearInterval(t) },[liveNow])

  const sick=useMemo(()=>d.incidents.some(i=>i.studentId===kid?.id&&i.type==='Santé'&&i.status==='open'&&(Date.now()-i.at)<86400000),[d,kid])
  const st=useMemo(()=>kid?statusAt(kid.classId,dayIdx,min,sick&&phase==='live'):null,[kid,dayIdx,min,sick,phase])
  if(!kid) return <Card><EmptyState icon={<Radio size={26}/>} title="Aucun enfant associé" sub="Demandez à la direction de lier votre compte à votre enfant pour activer le suivi en direct."/></Card>

  const area=AREAS[st.place]
  const segLen=Math.max(1,st.seg.end-st.seg.start); const done=Math.min(1,Math.max(0,(min-st.seg.start)/segLen)); const remain=Math.max(0,st.seg.end-min)
  const segs=daySegments(kid.classId,dayIdx)
  const open=segs[0].start, close=segs[segs.length-1].end
  const first=kid.name.split(' ')[0]
  const day=realWeekday?DAYS[dayIdx]:'Lundi (journée type)'

  // ── récap de la journée (une fois l'école finie) ──
  const todayIso=isoOf(now)
  const att=(d.attendance?.[kid.classId+'_'+todayIso]||{})[kid.id]||null
  const evToday=d.evaluations.filter(e=>e.classId===kid.classId&&isoOf(new Date(e.at))===todayIso)
    .map(e=>({id:e.id,subject:e.subject,lesson:e.lesson,score:studentSummary(e,kid.id).score})).filter(x=>x.score!=null)
  const lessons=segs.filter(s=>s.kind==='class').length

  const pill = liveNow ? {txt:`EN DIRECT · ${fmt(min)}`,bg:STATUS.live,pulse:true}
    : simulated ? {txt:`Journée type · ${fmt(min)}`,bg:'#F59E0B'}
    : exploring ? {txt:`Aperçu · ${fmt(min)}`,bg:STATUS.neutral}
    : phase==='after' ? {txt:'Journée terminée',bg:'#8B5CF6'}
    : phase==='before' ? {txt:`Ouvre à ${fmt(open)}`,bg:STATUS.info}
    : phase==='weekend' ? {txt:'Week-end · journée type',bg:STATUS.neutral}
    : phase==='vacances' ? {txt:"Vacances d'été",bg:'#F59E0B'}
    : {txt:`Aperçu · ${fmt(min)}`,bg:STATUS.neutral}

  return (<>
    <PageHead title="Suivi en direct" sub={phase==='live'?`Le parcours de ${first}, en ce moment.`:phase==='after'?`La journée de ${first} est terminée : voici son récapitulatif.`:phase==='before'?`L'école n'a pas encore ouvert · aperçu de la journée de ${first}.`:phase==='vacances'?`C'est les vacances d'été · aperçu d'une journée type de ${first}.`:`Pas d'école aujourd'hui · aperçu d'une journée type de ${first}.`}
      action={kids.length>1&&<Select value={kidId} onChange={e=>setKidId(e.target.value)}>{kids.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}</Select>}/>

    <div className="grid lg:grid-cols-[1fr_340px] gap-5">
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1.5 rounded-full text-white shadow" style={{background:pill.bg}}>
              {pill.pulse&&<motion.span animate={{opacity:[1,.3,1]}} transition={{repeat:Infinity,duration:1.4}}><Radio size={12}/></motion.span>}{pill.txt}</span>
            <span className="text-sm font-bold text-muted hidden sm:inline">Journée de {first} · {day}</span>
          </div>
          <span className="text-sm font-extrabold px-3 py-1 rounded-full" style={{background:area.color+'16',color:area.color}}>{(liveNow||replay)?st.title:phase==='after'?'Journée terminée':phase==='before'?"Avant l'école":'Journée type'}</span>
        </div>
        <RouteMap stops={[
          { kind:'entree', label:'Arrivée', time:fmt(open) },
          ...segs.map(s=>({ kind:s.kind==='free'?'class':s.kind, label:stopLabel(s), sub:s.cell?.room, time:fmt(s.start) })),
          { kind:'entree', label:'Sortie', time:fmt(close) },
        ]} curIndex={min<open?0:min>=close?segs.length+1:(()=>{const j=segs.findIndex(s=>min>=s.start&&min<s.end);return (j<0?segs.length-1:j)+1})()}
          name={kid.name} seed={kid.id} showStudent={liveNow||replay} plain={!(liveNow||phase==='after')}/>
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Avatar name={kid.name} seed={kid.id} size={56}/>
            <div><div className="font-bold">{kid.name}</div><div className="text-xs text-muted">{cls?.name} · École primaire</div></div>
          </div>

          {(phase==='live'||replay) && <div className="mt-4 rounded-2xl p-4" style={{background:area.color+'12'}}>
            <div className="flex items-center gap-2 text-sm font-bold" style={{color:area.color}}><MapPin size={15}/> {area.label}</div>
            <div className="text-lg font-extrabold mt-1">{st.title}</div>
            <div className="text-sm text-muted">{st.sub}</div>
            {remain>0 && st.title!=='Journée terminée' && st.title!=='Avant l’école' && <>
              <div className="mt-3 h-2 rounded-full bg-white/70 overflow-hidden"><motion.div className="h-full rounded-full" style={{background:area.color}} animate={{width:`${Math.round(done*100)}%`}} transition={{type:'spring',stiffness:80,damping:18}}/></div>
              <div className="flex items-center justify-between mt-1.5 text-xs"><span className="flex items-center gap-1 text-muted"><Clock size={12}/> Se termine à {fmt(st.seg.end)}</span><span className="font-bold" style={{color:area.color}}>{remain} min restantes</span></div>
            </>}
          </div>}

          {phase==='after' && !exploring && <div className="mt-4 space-y-3">
            <div className="rounded-2xl p-4" style={{background:'#8B5CF612'}}>
              <div className="flex items-center gap-2 text-sm font-bold" style={{color:'#8B5CF6'}}><Moon size={15}/> Journée terminée à {fmt(close)}</div>
              <div className="text-sm text-muted mt-1">{lessons} séances au programme aujourd'hui.</div>
            </div>
            <div className="flex items-center justify-between text-sm rounded-xl border border-line px-3 py-2.5">
              <span className="flex items-center gap-2 text-muted"><CalendarCheck size={15}/> Présence du jour</span>
              {att?<Badge status={att}/>:<span className="text-xs text-muted">non pointée</span>}
            </div>
            <div className="rounded-xl border border-line px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm text-muted mb-1.5"><ClipboardCheck size={15}/> Évaluations reçues aujourd'hui</div>
              {evToday.length===0 ? <div className="text-xs text-muted">Aucune évaluation aujourd'hui.</div>
              : evToday.map(e=>{ const m=mentionFor(e.score); return (
                <div key={e.id} className="flex items-center justify-between text-sm py-1">
                  <span className="font-medium truncate">{e.subject}{e.lesson?<span className="text-muted"> {e.lesson}</span>:''}</span>
                  <span className="font-bold shrink-0" style={{color:m.color}}>{e.score}/100</span>
                </div>)})}
            </div>
          </div>}

          {phase==='before' && !exploring && <div className="mt-4 rounded-2xl p-4" style={{background:STATUS.info+'12'}}>
            <div className="flex items-center gap-2 text-sm font-bold" style={{color:STATUS.info}}><Sun size={15}/> L'école ouvre à {fmt(open)}</div>
            <div className="text-sm text-muted mt-1">Le suivi en direct démarrera automatiquement à l'arrivée de {first}.</div>
          </div>}

          {phase==='weekend' && <div className="mt-4 rounded-2xl p-4 bg-canvas">
            <div className="flex items-center gap-2 text-sm font-bold text-muted"><Sun size={15}/> Pas d'école aujourd'hui</div>
            <div className="text-sm text-muted mt-1">Bon week-end ! Le suivi reprendra lundi à {fmt(open)}.</div>
          </div>}

          {simulated && <div className="mt-4 rounded-2xl p-4 border-2 border-dashed" style={{borderColor:area.color+'55',background:area.color+'0A'}}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold" style={{color:area.color}}><MapPin size={15}/> {area.label}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{background:'#F59E0B22',color:'#B45309'}}>SIMULATION</span>
            </div>
            <div className="text-lg font-extrabold mt-1">À {fmt(min)}, un jour d'école : {st.title==='En classe'?st.sub?.split(' · ')[0]:st.title}</div>
            <div className="text-sm text-muted">{st.seg?.end>st.seg?.start?`Séance de ${fmt(st.seg.start)} à ${fmt(st.seg.end)} (${st.seg.end-st.seg.start} min)`:st.sub}</div>
          </div>}

          {phase==='vacances' && <div className="mt-4 rounded-2xl p-4" style={{background:'#F59E0B14'}}>
            <div className="flex items-center gap-2 text-sm font-bold" style={{color:'#B45309'}}><Sun size={15}/> Vacances d'été</div>
            <div className="text-sm text-muted mt-1">L'école reprend le <b>{rentreeLabel()}</b>. Le suivi en direct redémarrera automatiquement à la rentrée · bel été à {first} !</div>
          </div>}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-1"><div className="font-bold text-sm">{phase==='after'?'Revoir la journée':phase==='live'?'Explorer la journée':'Explorer une journée type'}</div>
            <button onClick={()=>{setMin(defMin);setLiveNow(phase==='live')}} className="text-xs font-semibold accent-text">{phase==='live'?'Revenir à maintenant':'Réinitialiser'}</button></div>
          <p className="text-[12px] text-muted mb-2">{phase==='live'?'Faites glisser pour revoir un moment de la journée : puis revenez au direct.':phase==='after'?"Rejouez la journée heure par heure sur le plan.":"Faites glisser le curseur pour voir comment se déroule une journée d'école, heure par heure (simple aperçu)."}</p>
          <input type="range" min={480} max={900} step={5} value={min} onChange={e=>{setMin(+e.target.value);setLiveNow(false)}} className="w-full accent-[var(--accent)]" aria-label="Explorer la journée"/>
          <div className="flex justify-between text-[11px] text-muted mt-1"><span>{fmt(open)}</span><span className="font-bold text-ink">{fmt(min)}</span><span>{fmt(close)}</span></div>
        </Card>
      </div>
    </div>
  </>)
}
