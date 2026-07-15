import { useState, useMemo, useEffect } from 'react'
import { current } from '@core/auth.js'
import { db, mutate, studentById, classById , attParts } from '@core/db.js'
import { notify } from '@core/notify.js'
import { PageHead, Card, StatCard, SectionCard, Avatar, Btn, Badge, EmptyState, Modal, STATUS } from '../components/ui.jsx'
import { currentClass, teacherSchedule } from '@core/data.js'
import { todayIso, isoOf } from '@core/clock.js'
import { Check, CalendarCheck, UserX, Clock, AlertTriangle, BellRing, TrendingUp, Users, BriefcaseBusiness } from 'lucide-react'
import { SoftArea } from '../components/charts.jsx'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { isSummer, SummerFreeze } from '../components/Summer.jsx'

const CYCLE={present:'absent',absent:'late',late:'present'}
const COL={present:STATUS.ok,absent:STATUS.danger,late:STATUS.warn}
const FR={present:'Présent',absent:'Absent',late:'Retard'}

// Un appel déjà enregistré ne connaît pas les élèves inscrits depuis. On complète
// leur marque à « présent » : sans cela ils restaient sur undefined, incliquables
// (CYCLE[undefined] === undefined) et faisaient basculer les compteurs à NaN.
function hydrateMarks(saved, students){
  const base=Object.fromEntries(students.map(s=>[s.id,'present']))
  if(!saved) return base
  for(const s of students) if(saved[s.id]) base[s.id]=saved[s.id]
  return base
}

export default function Attendance(){
  const u=current()
  if(['schooladmin','admin'].includes(u.role)) return <SchoolView/>
  return <MarkView/>
}

/* ── Direction / Administration : vue école (élèves) ────────────────────── */
function SchoolView(){
  return (<>
    <PageHead title="Présence — vue école" sub="Le suivi de présence des élèves. La présence du personnel a son propre module."
      action={<Btn variant="soft" onClick={()=>{location.hash='#/app/staff'}}><BriefcaseBusiness size={15}/> Personnel</Btn>}/>
    <StudentsInsights/>
  </>)
}

function StudentsInsights(){
  const d=db(); const [,force]=useState(0)
  // Chaque chiffre du tableau de bord s'ouvre : derrière « 3 absents » il y a
  // trois enfants, et la direction veut les voir d'un clic, pas les chercher.
  const [detail,setDetail]=useState(null) // 'rate' | 'absent' | 'late' | 'chronic'
  const A=useMemo(()=>{
    const days={} // iso → {present,absent,late, absents:[{sid,classId,status}]}
    for(const key in (d.attendance||{})){
      const {classId,iso}=attParts(key)
      const day=days[iso]=days[iso]||{present:0,absent:0,late:0,absents:[]}
      for(const [sid,st] of Object.entries(d.attendance[key])){
        day[st]!=null&&day[st]++
        if(st!=='present') day.absents.push({sid,classId,status:st})
      }
    }
    const dates=Object.keys(days).sort()
    const latest=dates[dates.length-1]
    // 30 derniers jours : cumuls par élève et par classe
    const cutoff=isoOf(new Date(Date.now()-30*86400000))
    const perStudent={}, perClass={}
    for(const key in (d.attendance||{})){
      const {classId,iso}=attParts(key)
      if(iso<cutoff) continue
      const pc=perClass[classId]=perClass[classId]||{present:0,absent:0,late:0}
      for(const [sid,st] of Object.entries(d.attendance[key])){
        pc[st]!=null&&pc[st]++
        const ps=perStudent[sid]=perStudent[sid]||{present:0,absent:0,late:0}
        ps[st]!=null&&ps[st]++
      }
    }
    const chronic=Object.entries(perStudent)
      .map(([sid,c])=>({s:studentById(sid),...c,total:c.present+c.absent+c.late}))
      .filter(x=>x.s&&x.absent>=4)
      .sort((a,b)=>b.absent-a.absent)
    const trend=dates.slice(-20).map(iso=>{ const x=days[iso]; const t=x.present+x.absent+x.late
      return {name:format(new Date(iso),'d MMM',{locale:fr}), taux:t?Math.round(x.present/t*100):100} })
    return {days,latest,chronic,perClass,trend}
  },[d])

  // La présence par classe DU JOUR — pour le détail derrière « Taux de présence ».
  const dayPerClass=useMemo(()=>{
    if(!A.latest) return []
    const per={}
    for(const key in (d.attendance||{})){
      const {classId,iso}=attParts(key)
      if(iso!==A.latest) continue
      const pc=per[classId]=per[classId]||{present:0,absent:0,late:0}
      for(const st of Object.values(d.attendance[key])) pc[st]!=null&&pc[st]++
    }
    return Object.entries(per)
  },[d,A])

  if(!A.latest) return <Card><EmptyState icon={<CalendarCheck size={26}/>} title="Aucun appel enregistré" sub="Les appels des enseignants alimenteront cette vue."/></Card>

  const today=A.days[A.latest]
  const total=today.present+today.absent+today.late
  const rate=total?Math.round(today.present/total*100):100
  const dayLabel=format(new Date(A.latest),'EEEE d MMMM',{locale:fr})

  const notifyParent=(s,body)=>{
    const parent=d.users.find(x=>x.id===s.parentId)
    if(!parent) return toast.error(`${s.name} n'a pas de compte parent lié`)
    notify({to:parent.id,kind:'info',actor:'Direction',title:`Présence de ${s.name.split(' ')[0]}`,body})
    toast.success(`Parent de ${s.name.split(' ')[0]} prévenu`); force(x=>x+1)
  }

  return (<>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard tint="mint"  icon={<CalendarCheck size={20}/>} value={`${rate}%`} label="Taux de présence" sub={dayLabel} onClick={()=>setDetail('rate')}/>
      <StatCard tint="coral" icon={<UserX size={20}/>}         value={today.absent} label="Absents" onClick={()=>setDetail('absent')}/>
      <StatCard tint="butter" icon={<Clock size={20}/>}        value={today.late} label="Retards" onClick={()=>setDetail('late')}/>
      <StatCard tint="grape" icon={<AlertTriangle size={20}/>} value={A.chronic.length} label="Absences répétées" sub="≥ 4 sur 30 j" onClick={()=>setDetail('chronic')}/>
    </div>

    <div className="grid lg:grid-cols-[1fr_360px] gap-4 mb-4">
      <SectionCard icon={<TrendingUp size={16}/>} tint="mint" title="Taux de présence de l'école" sub="20 derniers jours d'école">
        <SoftArea data={A.trend} dataKey="taux" color={STATUS.ok} id="gAtt" unit="%" domain={[60,100]} height={208}/>
      </SectionCard>

      <SectionCard icon={<UserX size={16}/>} tint="coral" title={`Absents & retards · ${format(new Date(A.latest),'d MMM',{locale:fr})}`} sub="Un clic pour prévenir le parent" bodyClass="p-3 max-h-72 overflow-y-auto scroll-thin">
        {today.absents.length===0 ? <EmptyState icon={<Check size={22}/>} title="Personne ne manque" sub="Tous les élèves sont présents."/>
        : today.absents.map(({sid,classId,status})=>{ const s=studentById(sid); if(!s) return null
          return (
            <div key={sid} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-canvas">
              <Avatar name={s.name} seed={s.id} size={30}/>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate leading-tight">{s.name}</span>
                <span className="block text-[12px] text-muted">{classById(classId)?.name}</span></span>
              <Badge status={status}/>
              <button onClick={()=>notifyParent(s,`${s.name} a été marqué(e) ${FR[status].toLowerCase()} le ${dayLabel}.`)}
                title="Prévenir le parent" className="w-7 h-7 grid place-items-center rounded-lg text-muted hover:accent-text hover:bg-white"><BellRing size={14}/></button>
            </div>) })}
      </SectionCard>
    </div>

    <div className="grid lg:grid-cols-2 gap-4">
      <SectionCard icon={<AlertTriangle size={16}/>} tint="butter" title="Absences répétées — 30 derniers jours" sub="Élèves à suivre de près (4 absences ou plus)" bodyClass="p-3">
        {A.chronic.length===0 ? <EmptyState icon={<Check size={22}/>} title="Aucun absentéisme répété" sub="Aucun élève n'a manqué 4 jours ou plus ce mois-ci."/>
        : A.chronic.map(x=>(
          <div key={x.s.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
            <Avatar name={x.s.name} seed={x.s.id} size={34}/>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate leading-tight">{x.s.name}</span>
              <span className="block text-[12px] text-muted">{classById(x.s.classId)?.name} · {x.absent} absences · {x.late} retards</span></span>
            <span className="text-sm font-extrabold" style={{color:STATUS.danger}}>{x.total?Math.round(x.absent/x.total*100):0}%</span>
            <Btn size="sm" variant="soft" onClick={()=>notifyParent(x.s,`${x.s.name} cumule ${x.absent} absences sur les 30 derniers jours. Merci de contacter la direction.`)}><BellRing size={13}/> Parent</Btn>
          </div>))}
      </SectionCard>

      <SectionCard icon={<Users size={16}/>} tint="sky" title="Présence par classe" sub="30 derniers jours">
        <div className="space-y-3">
          {Object.entries(A.perClass).map(([cid,c])=>{ const t=c.present+c.absent+c.late; const r=t?Math.round(c.present/t*100):100
            const col=r>=95?STATUS.ok:r>=90?STATUS.warn:STATUS.danger
            return (
              <div key={cid} className="flex items-center gap-3">
                <span className="w-20 text-sm font-bold shrink-0">{classById(cid)?.name||cid}</span>
                <div className="flex-1 h-2.5 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full" style={{width:`${r}%`,background:col}}/></div>
                <span className="w-12 text-right text-sm font-extrabold" style={{color:col}}>{r}%</span>
                <span className="w-20 text-right text-xs text-muted">{c.absent} abs · {c.late} ret</span>
              </div>) })}
        </div>
      </SectionCard>
    </div>

    <StatDetailModal detail={detail} onClose={()=>setDetail(null)} A={A} today={today} rate={rate}
      dayLabel={dayLabel} dayPerClass={dayPerClass} notifyParent={notifyParent}/>
  </>)
}

/* ── Le détail derrière chaque chiffre : un clic sur la tuile l'ouvre ────── */
function StatDetailModal({ detail, onClose, A, today, rate, dayLabel, dayPerClass, notifyParent }){
  if(!detail) return null

  // Une ligne d'élève, partout la même : avatar, classe, statut, prévenir le parent.
  const Row=({s,classId,status,extra,body})=>(
    <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-canvas">
      <Avatar name={s.name} seed={s.id} size={32}/>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate leading-tight">{s.name}</span>
        <span className="block text-[12px] text-muted">{classById(classId)?.name||''}{extra&&<span> · {extra}</span>}</span></span>
      {status&&<Badge status={status}/>}
      <button onClick={()=>notifyParent(s,body)} title="Prévenir le parent"
        className="w-8 h-8 grid place-items-center rounded-lg text-muted hover:accent-text hover:bg-canvas shrink-0"><BellRing size={15}/></button>
    </div>)

  const list=(status)=>{
    const rows=today.absents.filter(a=>a.status===status).map(({sid,classId})=>({s:studentById(sid),classId})).filter(x=>x.s)
    return rows.length===0
      ? <EmptyState icon={<Check size={22}/>} title={status==='absent'?'Aucun absent':'Aucun retard'} sub={`Personne n'a été marqué ${FR[status].toLowerCase()} ce jour-là.`}/>
      : rows.map(({s,classId})=><Row key={s.id} s={s} classId={classId} status={status}
          body={`${s.name} a été marqué(e) ${FR[status].toLowerCase()} le ${dayLabel}.`}/>)
  }

  const C={
    rate:{ title:`Taux de présence · ${dayLabel}`, body:(<>
      <div className="flex items-end gap-6 mb-4">
        <span className="text-4xl font-extrabold" style={{color:STATUS.ok}}>{rate}%</span>
        <span className="text-sm text-muted pb-1"><b style={{color:STATUS.ok}}>{today.present}</b> présents · <b style={{color:STATUS.danger}}>{today.absent}</b> absents · <b style={{color:STATUS.warn}}>{today.late}</b> retards</span>
      </div>
      <div className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Par classe, ce jour-là</div>
      <div className="space-y-2.5">
        {dayPerClass.map(([cid,c])=>{ const t=c.present+c.absent+c.late; const r=t?Math.round(c.present/t*100):100
          const col=r>=95?STATUS.ok:r>=90?STATUS.warn:STATUS.danger
          return (
            <div key={cid} className="flex items-center gap-3">
              <span className="w-24 text-sm font-bold shrink-0 truncate">{classById(cid)?.name||cid}</span>
              <div className="flex-1 h-2.5 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full" style={{width:`${r}%`,background:col}}/></div>
              <span className="w-12 text-right text-sm font-extrabold" style={{color:col}}>{r}%</span>
              <span className="w-20 text-right text-xs text-muted">{c.absent} abs · {c.late} ret</span>
            </div>) })}
      </div></>)},
    absent:{ title:`Absents · ${dayLabel}`, body:list('absent') },
    late:{ title:`Retards · ${dayLabel}`, body:list('late') },
    chronic:{ title:'Absences répétées · 30 derniers jours', body: A.chronic.length===0
      ? <EmptyState icon={<Check size={22}/>} title="Aucun absentéisme répété" sub="Aucun élève n'a manqué 4 jours ou plus ce mois-ci."/>
      : A.chronic.map(x=><Row key={x.s.id} s={x.s} classId={x.s.classId} extra={`${x.absent} absences · ${x.late} retards`}
          body={`${x.s.name} cumule ${x.absent} absences sur les 30 derniers jours. Merci de contacter la direction.`}/>) },
  }[detail]

  return (
    <Modal open onClose={onClose} title={C.title} size="xl" footer={<Btn variant="ghost" onClick={onClose}>Fermer</Btn>}>
      {C.body}
    </Modal>
  )
}

/* ── Enseignant / Surveillant : faire l'appel ───────────────────────────── */
function MarkView(){
  const schedule=useMemo(()=>teacherSchedule(),[])
  const live=useMemo(()=>currentClass(),[])
  // La séance en cours si elle existe, sinon la première du planning : dans les
  // deux cas l'enseignant peut changer de classe (avant, il était enfermé sur 5ème A).
  const [slotIdx,setSlotIdx]=useState(()=>{
    const i=live? schedule.findIndex(s=>s.classId===live.slot.classId && s.start===live.slot.start) : -1
    return i>=0?i:0
  })
  const cls=schedule[slotIdx]
  const today=todayIso(); const key=cls.classId+'_'+today
  // Les élèves inscrits après un appel déjà enregistré n'ont pas de marque : on les
  // complète à « présent » au lieu de laisser un undefined incliquable (counts → NaN).
  const [marks,setMarks]=useState(()=>hydrateMarks(db().attendance[key], cls.students))
  const [,setTick]=useState(0)
  const [saving,setSaving]=useState(false)
  // Changer de classe (ou de jour) recharge la feuille d'appel correspondante.
  useEffect(()=>{ setMarks(hydrateMarks(db().attendance[key], cls.students)) },[key]) // eslint-disable-line react-hooks/exhaustive-deps

  const counts=cls.students.reduce((a,s)=>{ const v=marks[s.id]; if(a[v]!=null)a[v]++; return a },{present:0,absent:0,late:0})
  const history=Object.keys(db().attendance||{}).filter(k=>k.startsWith(cls.classId+'_')).map(k=>{
    const m=db().attendance[k]; const c={present:0,absent:0,late:0}; Object.values(m).forEach(v=>c[v]!=null&&c[v]++)
    return {date:k.split('_').slice(1).join('_'),...c}
  }).sort((a,b)=>b.date.localeCompare(a.date))

  const save=()=>{
    if(saving) return                                   // pas de double-enregistrement
    setSaving(true)
    mutate(db=>{db.attendance[key]=marks})
    const flagged=cls.students.filter(s=>marks[s.id]!=='present')
    notify({role:'admin',kind:'info',title:`Appel — ${cls.cls.name}`,body:`${counts.present} présents · ${counts.absent} absents · ${counts.late} retards (${cls.subject})`,link:'/app/attendance'})
    notify({role:'schooladmin',kind:'info',title:`Appel — ${cls.cls.name}`,body:`${counts.absent} absent(s), ${counts.late} retard(s)`,link:'/app/attendance'})
    flagged.forEach(s=>{ if(s.parentId) notify({to:s.parentId,kind:'info',title:`Présence de ${s.name.split(' ')[0]}`,body:`${s.name} a été marqué(e) ${FR[marks[s.id]].toLowerCase()} aujourd'hui (${cls.subject}).`,link:'/app'}) })
    toast.success('Appel enregistré · direction et parents notifiés')
    setTick(x=>x+1); setTimeout(()=>setSaving(false),600)
  }

  if(isSummer()) return (<>
    <PageHead title="Appel / Présence" sub="Pas d'appel pendant les vacances d'été."/>
    <SummerFreeze feature="L'appel du matin" detail="Les élèves sont en vacances — la feuille d'appel se rouvrira le jour de la rentrée."/>
  </>)

  return (<>
    <PageHead title="Appel / Présence" sub={`${cls.cls.name} · ${cls.subject} · ${today}`}
      action={<Btn onClick={save} disabled={saving}><Check size={16}/> {saving?'Enregistrement…':'Enregistrer'}</Btn>}/>

    <Card className="p-3 mb-4">
      <label className="text-xs font-semibold text-muted px-1">Séance</label>
      <div className="flex gap-2 mt-1.5 flex-wrap">
        {schedule.map((s,i)=>(
          <button key={`${s.classId}-${s.start}`} onClick={()=>setSlotIdx(i)}
            aria-pressed={i===slotIdx}
            className={`text-sm font-semibold px-3 py-2 rounded-xl border transition ${i===slotIdx?'border-transparent text-white':'border-line hover:bg-canvas'}`}
            style={i===slotIdx?{background:'var(--accent)'}:{}}>
            {s.cls.name} <span className="opacity-70 font-normal">· {s.start}</span>
            {s.isLive && <span className="ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{background:i===slotIdx?'rgba(255,255,255,.25)':STATUS.ok+'22',color:i===slotIdx?'#fff':STATUS.ok}}>EN COURS</span>}
          </button>))}
      </div>
    </Card>

    <div className="flex gap-3 mb-4">{Object.entries(counts).map(([k,v])=><div key={k} className="card px-4 py-2 text-sm"><span className="font-bold" style={{color:COL[k]}}>{v}</span> <span className="text-muted">{FR[k]}</span></div>)}</div>
    <Card className="p-3"><div className="grid sm:grid-cols-2 gap-2">
      {cls.students.length===0
        ? <EmptyState icon={<Users size={22}/>} title="Aucun élève dans cette classe" sub="Ajoutez des élèves depuis la page Élèves."/>
        : cls.students.map(s=>(<button key={s.id} onClick={()=>setMarks(m=>({...m,[s.id]:CYCLE[m[s.id]]??'absent'}))} className="flex items-center gap-3 p-2 rounded-xl border border-line hover:bg-canvas">
        <Avatar name={s.name} seed={s.id} size={32}/><span className="flex-1 text-left text-sm font-medium">{s.name}</span>
        <Badge status={marks[s.id]||'present'}/></button>))}
    </div><p className="text-xs text-muted mt-2 px-1">Touchez un élève pour changer : présent → absent → retard. La direction et les parents concernés sont notifiés à l'enregistrement.</p></Card>
    <Card className="p-4 mt-4"><h3 className="font-bold mb-2 text-sm">Appels enregistrés · {cls.cls.name}</h3>
      {history.length? <div className="space-y-1.5 max-h-64 overflow-y-auto scroll-thin">{history.map(h=>(<div key={h.date} className="flex items-center justify-between text-sm border-b border-line pb-1.5 last:border-0">
        <span className="text-muted">{h.date}</span>
        <span className="flex gap-3"><b style={{color:COL.present}}>{h.present}</b> présents · <b style={{color:COL.absent}}>{h.absent}</b> absents · <b style={{color:COL.late}}>{h.late}</b> retards</span></div>))}</div>
       : <EmptyState icon={<CalendarCheck size={26}/>} title="Aucun appel enregistré" sub="Les appels de cette classe apparaîtront ici après le premier enregistrement."/>}
    </Card>
  </>)
}
