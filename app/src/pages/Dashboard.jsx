import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, RadialBarChart, RadialBar } from 'recharts'
import { Users, GraduationCap, Wallet, ShieldAlert, ClipboardCheck, CreditCard, Star, ArrowRight, Bell, FileText, TrendingUp, CalendarCheck, Radio, Stethoscope, Sunrise, UserX, CalendarDays, ChevronRight, Building2 } from 'lucide-react'
import { current } from '../auth.js'
import { db, FEE_MONTHS, studentById, classById } from '../db.js'
import { StatCard, Card, PageHead, Badge, Avatar, Btn, IconTile, EmptyState, STATUS } from '../components/ui.jsx'
import { currentClass } from '../data.js'
import { studentSummary, bulletinFor, mentionFor, strengthsWeaknesses } from '../results.js'
import { statusAt, AREAS, fmt, nowState } from '../livestatus.js'
import { subjectMeta, PLACES } from '../subjects.jsx'
import Bulletin from '../components/Bulletin.jsx'
// place → shared icon system (subjects.jsx) — same visual family as the live map
const placeMeta=live=>{
  if(live.place==='class') return live.seg?.cell? subjectMeta(live.seg.cell.subject) : PLACES.etude
  if(live.place==='infirmerie') return {Icon:Stethoscope,color:AREAS.infirmerie.color}
  if(live.place==='cour') return PLACES.recre
  if(live.place==='cantine') return PLACES.cantine
  return live.title==='Journée terminée'?PLACES.sortie:PLACES.arrivee
}
// canonical Btn class recipes (ui.jsx) for <Link>s that must look like buttons
const BTN_LG="inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition text-sm px-5 py-3"
const BTN_PRIMARY=`${BTN_LG} text-white accent-bg shadow-sm hover:opacity-90 active:scale-[.98]`
const BTN_DEFAULT=`${BTN_LG} bg-white border border-line hover:bg-canvas active:scale-[.98]`

const chartTip={contentStyle:{borderRadius:12,border:'1px solid #EDEFF5',fontSize:12,boxShadow:'0 8px 24px rgba(30,36,51,.08)'}}

export default function Dashboard(){
  const u=current(); const d=db()
  const greet = `Bonjour, ${u.name.split(' ')[0]}`

  if(u.role==='teacher'){
    const cls=currentClass(new Date())
    // répartition de la dernière évaluation de la classe
    const ev=d.evaluations.find(e=>e.classId===cls.cls.id)
    const dist=[['Excellent',STATUS.ok],['Bien',STATUS.info],['Moyen',STATUS.warn],['Insuffisant',STATUS.danger]]
    const buckets=['excellent','good','average','weak']
    const distData=dist.map(([n,c],i)=>{ let v=0; if(ev) cls.students.forEach(s=>{ const sum=studentSummary(ev,s.id); if(sum.score!=null){ const k=sum.score>=85?0:sum.score>=60?1:sum.score>=40?2:3; if(k===i)v++ } }); return {name:n,value:v,color:c} })
    const hasDist=distData.some(x=>x.value>0)
    return (<><PageHead title={greet} sub="Votre journée d'enseignement en un coup d'œil."/>
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Classe en cours" value={cls.cls.name} sub={cls.slot.subject} tint="mint" icon={<ClipboardCheck/>}/>
        <StatCard label="Élèves" value={cls.students.length} tint="sky" icon={<Users/>}/>
        <StatCard label="Mes demandes" value={d.requests.filter(r=>r.by===u.id).length} tint="butter" icon={<FileText/>}/>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6 flex flex-col justify-between gap-4">
          <div><div className="text-xs font-bold uppercase accent-text">Cours en direct</div>
            <div className="text-xl font-extrabold">{cls.cls.name} · {cls.slot.subject}</div>
            <div className="text-muted text-sm">{cls.slot.start}–{cls.slot.end} · {cls.students.length} élèves {cls.isLive&&<span className="ml-1 text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{background:STATUS.live}}>● EN COURS</span>}</div></div>
          <Link to="/app/evaluate" className={`${BTN_PRIMARY} w-full sm:w-auto`}>Évaluer la classe <ArrowRight size={17}/></Link>
        </Card>
        <Card className="p-5"><h3 className="font-bold mb-1">Niveau de la classe</h3>
          <p className="text-xs text-muted mb-3">Répartition de la dernière évaluation</p>
          {hasDist? <>
            <div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={distData} layout="vertical" margin={{left:8}}><XAxis type="number" hide/><YAxis type="category" dataKey="name" tick={{fontSize:12,fill:'#8A93A6'}} width={78} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/><Bar dataKey="value" radius={[0,6,6,0]}>{distData.map((p,i)=><Cell key={i} fill={p.color}/>)}</Bar></BarChart></ResponsiveContainer></div>
          </> : <EmptyState icon={<ClipboardCheck size={22}/>} title="Aucune évaluation" sub="Évaluez cette classe pour voir la répartition des niveaux."/>}
        </Card>
      </div>
      <Card className="p-5 mt-4"><div className="flex items-center justify-between mb-3"><h3 className="font-bold flex items-center gap-1.5"><ClipboardCheck size={16}/> Mes évaluations enregistrées</h3><span className="text-xs text-muted">{d.evaluations.length} au total</span></div>
        {d.evaluations.length? <div className="space-y-2">{d.evaluations.slice(0,6).map(ev=>{ const studs=d.students.filter(s=>s.classId===ev.classId); const scores=studs.map(s=>studentSummary(ev,s.id).score).filter(x=>x!=null); const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null; const m=mentionFor(avg)
          return (<div key={ev.id} className="flex items-center justify-between text-sm border-b border-line pb-2 last:border-0"><div><span className="font-medium">{ev.className} · {ev.subject}</span><span className="text-xs text-muted ml-2">{new Date(ev.at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div><div className="text-right"><span className="text-muted text-xs mr-2">{scores.length} notés</span><span className="font-bold" style={{color:m.color}}>{avg!=null?`${avg}/100`:'—'}</span></div></div>) })}</div>
         : <EmptyState icon={<ClipboardCheck size={22}/>} title="Aucune évaluation enregistrée" sub="Vos évaluations enregistrées apparaîtront ici."/>}
      </Card></>)
  }

  if(u.role==='parent') return <ParentDashboard u={u} d={d} greet={greet}/>

  if(u.role==='owner') return <PlatformDashboard d={d} greet={greet}/>

  if(u.role==='supervisor'){
    const open=d.incidents.filter(i=>i.status==='open')
    const sevData=[['Faible','low',STATUS.info],['Moyenne','medium',STATUS.warn],['Élevée','high',STATUS.danger]].map(([n,k,c])=>({name:n,value:d.incidents.filter(i=>i.severity===k).length,color:c}))
    return (<><PageHead title={greet} sub="Gardez l'école sûre et informée."/>
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Incidents ouverts" value={open.length} tint="coral" icon={<ShieldAlert/>}/>
        <StatCard label="Élèves" value={d.students.length} tint="sky" icon={<Users/>}/>
        <StatCard label="Signalés par moi" value={d.incidents.length} tint="butter" icon={<ShieldAlert/>}/>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5"><h3 className="font-bold mb-3">Incidents par gravité</h3>
          <div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={sevData}><XAxis dataKey="name" tick={{fontSize:11,fill:'#8A93A6'}} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/><Bar dataKey="value" radius={[6,6,0,0]}>{sevData.map((p,i)=><Cell key={i} fill={p.color}/>)}</Bar></BarChart></ResponsiveContainer></div>
        </Card>
        <Card className="p-5"><h3 className="font-bold mb-3">Incidents récents</h3>
          <div className="space-y-2">
            {d.incidents.slice(0,4).map(i=>{ const s=i.studentId?studentById(i.studentId):null; return (
              <div key={i.id} className="flex items-center gap-2 text-sm border-b border-line pb-2 last:border-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{background:i.severity==='high'?STATUS.danger:i.severity==='medium'?STATUS.warn:STATUS.info}}/>
                <span className="font-medium truncate flex-1">{i.title}</span>
                {s&&<span className="text-muted text-xs">{s.name.split(' ')[0]}</span>}
                <Badge status={i.status}/>
              </div>) })}
            {d.incidents.length===0 && <EmptyState icon={<ShieldAlert size={22}/>} title="Aucun incident" sub="Tout est calme pour le moment."/>}
          </div>
        </Card>
      </div>
      <Link to="/app/incidents" className={`${BTN_PRIMARY} mt-4`}><ShieldAlert size={17}/> Signaler un incident</Link></>)
  }

  // schooladmin / admin
  const fc={paid:0,pending:0,overdue:0,due:0}; Object.values(d.payments).forEach(arr=>arr.forEach(p=>fc[p.status]++))
  const pie=[['Payés',STATUS.ok],['En attente',STATUS.warn],['En retard',STATUS.danger],['Impayés',STATUS.neutral]].map(([n,c],i)=>({name:n,value:Object.values(fc)[i],color:c}))
  const totalFees=pie.reduce((s,p)=>s+p.value,0); const collected=fc.paid
  const collectRate=totalFees?Math.round((collected/totalFees)*100):0
  // présence réelle : agrégation des appels enregistrés (14 derniers jours d'école)
  const attDays={}
  for(const key in (d.attendance||{})){ const iso=key.slice(key.indexOf('_')+1)
    const day=attDays[iso]=attDays[iso]||{present:0,absent:0,late:0}
    Object.values(d.attendance[key]).forEach(v=>{ day[v]!=null&&day[v]++ }) }
  const attDates=Object.keys(attDays).sort()
  const attend=attDates.slice(-14).map(iso=>({m:new Date(iso).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}),present:attDays[iso].present,absent:attDays[iso].absent+attDays[iso].late}))
  // « Ce matin » : l'essentiel de la journée pour la direction
  const latestAtt=attDates[attDates.length-1]
  const absToday=latestAtt?attDays[latestAtt].absent:0, lateToday=latestAtt?attDays[latestAtt].late:0
  const todayIso=new Date().toISOString().slice(0,10)
  const eventsToday=d.events.filter(e=>e.date===todayIso)
  const openInc=d.incidents.filter(i=>i.status==='open').length
  const pendReq=d.requests.filter(r=>r.status==='pending').length
  // effectif par cycle
  const GC=['#6366F1','#36C5F0','#8B5CF6','#2BD9A8','#FFA62B','#FF6B81']
  const cycleData=d.classes.map((c,i)=>({name:c.name,value:d.students.filter(s=>s.classId===c.id).length,color:GC[i%GC.length]})).filter(x=>x.value>0)
  const radial=[{name:'Recouvrement',value:collectRate,fill:STATUS.ok}]
  return (<><PageHead title={greet} sub="Vue d'ensemble de l'école."/>
    {/* Ce matin — l'essentiel en 30 secondes */}
    <Card className="p-4 mb-5">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2.5 shrink-0">
          <IconTile icon={<Sunrise size={19}/>} tint="butter" size={42}/>
          <div><div className="font-extrabold leading-tight">Ce matin</div>
            <div className="text-xs text-muted capitalize">{new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div></div>
        </div>
        <div className="h-9 w-px bg-line hidden md:block"/>
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <BriefChip to="/app/attendance" icon={<UserX size={14}/>} color={absToday?STATUS.danger:STATUS.ok}
            label={absToday?`${absToday} absent${absToday>1?'s':''}${lateToday?` · ${lateToday} retard${lateToday>1?'s':''}`:''}`:'Aucun absent'}/>
          <BriefChip to="/app/incidents" icon={<ShieldAlert size={14}/>} color={openInc?STATUS.warn:STATUS.ok}
            label={openInc?`${openInc} incident${openInc>1?'s':''} ouvert${openInc>1?'s':''}`:'Aucun incident'}/>
          <BriefChip to="/app/requests" icon={<FileText size={14}/>} color={pendReq?STATUS.info:STATUS.ok}
            label={pendReq?`${pendReq} demande${pendReq>1?'s':''} à traiter`:'Demandes à jour'}/>
          <BriefChip to="/app/events" icon={<CalendarDays size={14}/>} color={eventsToday.length?'#6366F1':STATUS.neutral}
            label={eventsToday.length?`Aujourd'hui : ${eventsToday[0].title}${eventsToday.length>1?` +${eventsToday.length-1}`:''}`:"Aucun événement aujourd'hui"}/>
        </div>
      </div>
    </Card>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard label="Élèves" value={d.students.length} tint="grape" icon={<Users/>} to="/app/students"/>
      <StatCard label="Enseignants" value={d.teachers.length} tint="butter" icon={<GraduationCap/>} to="/app/teachers"/>
      <StatCard label="Incidents ouverts" value={d.incidents.filter(i=>i.status==='open').length} tint="coral" icon={<ShieldAlert/>} to="/app/incidents"/>
      <StatCard label="Demandes en attente" value={d.requests.filter(r=>r.status==='pending').length} tint="sky" icon={<FileText/>} to="/app/requests"/>
    </div>
    <div className="grid lg:grid-cols-3 gap-4 mb-4">
      <Card className="p-5"><h3 className="font-bold mb-1">État des frais</h3><p className="text-xs text-muted mb-2">Tous mois confondus</p>
        <div className="h-48 relative">
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2}>{pie.map((p,i)=><Cell key={i} fill={p.color}/>)}</Pie><Tooltip {...chartTip}/></PieChart></ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center pointer-events-none"><div className="text-center"><div className="text-2xl font-extrabold">{collectRate}%</div><div className="text-[10px] text-muted">recouvrés</div></div></div>
        </div>
        <div className="flex flex-wrap gap-2.5 justify-center mt-1">{pie.map(p=><span key={p.name} className="text-[11px] flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full" style={{background:p.color}}/>{p.name} · {p.value}</span>)}</div>
      </Card>
      <Card className="p-5 lg:col-span-2"><h3 className="font-bold mb-1">Présence hebdomadaire</h3><p className="text-xs text-muted mb-2">Présents vs absents</p>
        <div className="h-52"><ResponsiveContainer width="100%" height="100%"><AreaChart data={attend} margin={{left:-20}}>
          <defs><linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#36C5F0" stopOpacity={.35}/><stop offset="100%" stopColor="#36C5F0" stopOpacity={0}/></linearGradient></defs>
          <XAxis dataKey="m" tick={{fontSize:11,fill:'#8A93A6'}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:'#8A93A6'}} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/>
          <Area type="monotone" dataKey="present" name="Présents" stroke="#36C5F0" strokeWidth={2.5} fill="url(#gP)"/>
          <Area type="monotone" dataKey="absent" name="Absents" stroke={STATUS.danger} strokeWidth={2} fill="transparent"/>
        </AreaChart></ResponsiveContainer></div>
      </Card>
    </div>
    <div className="grid lg:grid-cols-3 gap-4">
      {cycleData.length>0 && <Card className="p-5"><h3 className="font-bold mb-3">Effectif par classe</h3>
        <div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={cycleData}><XAxis dataKey="name" tick={{fontSize:11,fill:'#8A93A6'}} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/><Bar dataKey="value" radius={[6,6,0,0]}>{cycleData.map((p,i)=><Cell key={i} fill={p.color}/>)}</Bar></BarChart></ResponsiveContainer></div>
      </Card>}
      <Card className="p-5"><h3 className="font-bold mb-3">Taux de recouvrement</h3>
        <div className="h-44"><ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="65%" outerRadius="100%" data={radial} startAngle={90} endAngle={90-(collectRate*3.6)}><RadialBar background={{fill:'#EDEFF5'}} dataKey="value" cornerRadius={10}/></RadialBarChart></ResponsiveContainer></div>
        <div className="text-center -mt-24 mb-12"><div className="text-3xl font-extrabold">{collectRate}%</div><div className="text-xs text-muted">{collected} / {totalFees} mois</div></div>
      </Card>
      <Card className="p-5"><h3 className="font-bold mb-3">Prochains événements</h3>
        <div className="space-y-2.5">
          {[...d.events].filter(e=>e.date>=new Date().toISOString().slice(0,10)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4).map(e=>(<Link key={e.id} to="/app/events" className="flex items-center gap-3 text-sm group">
            <IconTile icon={<CalendarCheck size={16}/>} tint="brand" size={40} radius="rounded-xl"/>
            <div className="min-w-0"><div className="font-medium truncate group-hover:accent-text">{e.title}</div><div className="text-xs text-muted">{e.date} · {e.type}</div></div>
          </Link>))}
          {d.events.length===0 && <EmptyState icon={<CalendarCheck size={22}/>} title="Aucun événement" sub="Les prochains événements de l'école apparaîtront ici."/>}
        </div>
      </Card>
    </div>
    <Card className="p-5 mt-4"><div className="flex items-center justify-between mb-3"><h3 className="font-bold flex items-center gap-1.5"><ClipboardCheck size={16}/> Évaluations enregistrées</h3><span className="text-xs text-muted">{d.evaluations.length} au total</span></div>
      {d.evaluations.length? <div className="overflow-x-auto scroll-thin -mx-5 -mb-5"><table className="w-full text-sm"><thead><tr className="text-left text-[11px] uppercase tracking-wide text-muted bg-canvas"><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Classe</th><th className="px-4 py-3 font-semibold">Matière</th><th className="px-4 py-3 font-semibold">Enseignant</th><th className="px-4 py-3 font-semibold text-center">Élèves notés</th><th className="px-4 py-3 font-semibold text-center">Moyenne</th></tr></thead>
        <tbody className="divide-y divide-line">{d.evaluations.slice(0,8).map(ev=>{ const cls=d.classes.find(c=>c.id===ev.classId); const studs=d.students.filter(s=>s.classId===ev.classId); const scores=studs.map(s=>studentSummary(ev,s.id).score).filter(x=>x!=null); const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null; const m=mentionFor(avg)
        return (<tr key={ev.id}><td className="px-4 py-3 text-muted whitespace-nowrap">{new Date(ev.at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</td><td className="px-4 py-3 font-medium">{ev.className||cls?.name}</td><td className="px-4 py-3">{ev.subject}</td><td className="px-4 py-3 text-muted">{ev.teacher}</td><td className="px-4 py-3 text-center">{scores.length}</td><td className="px-4 py-3 text-center font-bold" style={{color:m.color}}>{avg!=null?`${avg}/100`:'—'}</td></tr>) })}</tbody></table></div>
       : <EmptyState icon={<ClipboardCheck size={22}/>} title="Aucune évaluation enregistrée" sub="Les évaluations des enseignants apparaîtront ici."/>}
    </Card></>)
}

// Console Kogia Group — la plateforme vue par le fournisseur, pas par l'école.
function PlatformDashboard({ d, greet }){
  const schools=d.schools||[]
  const count=s=>s.live?d.students.length:s.studentCount
  const actives=schools.filter(s=>s.status==='active'), trials=schools.filter(s=>s.status==='trial')
  const mrr=actives.reduce((n,s)=>n+s.price,0)
  const totalStudents=schools.filter(s=>s.status!=='suspended').reduce((n,s)=>n+count(s),0)
  const planPie=[
    {name:'Plan Pro',value:actives.filter(s=>s.plan==='Pro').length,color:'#6366F1'},
    {name:'Plan Essentiel',value:actives.filter(s=>s.plan==='Essentiel').length,color:'#0BA5D8'},
    {name:'En essai',value:trials.length,color:STATUS.warn},
  ].filter(x=>x.value>0)
  const STL={active:['Active',STATUS.ok],trial:["Essai",STATUS.warn],suspended:['Suspendue',STATUS.neutral]}
  return (<><PageHead title={greet} sub="Console plateforme — vos écoles clientes en un coup d'œil."/>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard label="Écoles clientes" value={schools.filter(s=>s.status!=='suspended').length} tint="brand" icon={<Building2/>} to="/app/schools"/>
      <StatCard label="Élèves gérés" value={totalStudents} tint="sky" icon={<Users/>}/>
      <StatCard label="Revenu mensuel" value={`${mrr} DT`} sub="abonnements actifs" tint="mint" icon={<Wallet/>}/>
      <StatCard label="En essai" value={trials.length} tint="butter" icon={<FileText/>}/>
    </div>
    <div className="grid lg:grid-cols-[340px_1fr] gap-4">
      <Card className="p-5"><h3 className="font-bold mb-1">Répartition des abonnements</h3><p className="text-xs text-muted mb-2">Écoles actives et en essai</p>
        <div className="h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={planPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>{planPie.map((p,i)=><Cell key={i} fill={p.color}/>)}</Pie><Tooltip {...chartTip}/></PieChart></ResponsiveContainer></div>
        <div className="space-y-1.5 mt-1">{planPie.map(p=><span key={p.name} className="flex items-center gap-1.5 text-xs"><i className="w-2.5 h-2.5 rounded-full" style={{background:p.color}}/><span className="text-muted">{p.name}</span><b className="ml-auto">{p.value}</b></span>)}</div>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3"><h3 className="font-bold">Écoles clientes</h3>
          <Link to="/app/schools" className="text-xs font-semibold accent-text inline-flex items-center gap-1">Gérer les écoles <ArrowRight size={13}/></Link></div>
        <div className="divide-y divide-line">
          {schools.map(sc=>{ const [lbl,col]=STL[sc.status]||STL.active
            return (<Link key={sc.id} to="/app/schools" className="flex items-center gap-3 py-2.5 group">
              <IconTile icon={<Building2 size={16}/>} tint={sc.live?'brand':'slate'} size={38} radius="rounded-xl"/>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate group-hover:accent-text">{sc.name}</span>
                <span className="block text-[11px] text-muted">{sc.city} · {count(sc)} élèves · depuis {sc.since}</span></span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{background:col+'1E',color:col}}>{lbl}</span>
              <span className="text-sm font-extrabold w-20 text-right">{sc.status==='active'?`${sc.price} DT/m`:'—'}</span>
            </Link>) })}
        </div>
      </Card>
    </div>
  </>)
}

function BriefChip({ to, icon, color, label }){
  return <Link to={to} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full border border-line bg-white hover:shadow-sm transition"
    style={{color}}>{icon}{label}<ChevronRight size={12} className="opacity-60"/></Link>
}

function ParentDashboard({u,d,greet}){
  const [bulletin,setBulletin]=useState(null)
  const childId=u.childIds?.[0]; const child=childId?studentById(childId):null
  const b=childId? bulletinFor(d,childId):null
  const months=(d.payments[childId]||[]); const paid=months.filter(m=>m.status==='paid').length
  const sessions=b?.sessions||[]
  const trend=sessions.slice(-6).map((s,i)=>({i:i+1,score:s.score,subject:s.subject}))
  const cls=child?classById(child.classId):null
  const sw=childId?strengthsWeaknesses(d.evaluations.filter(e=>e.classId===child?.classId),childId):{strong:[],weak:[]}
  const ns=nowState()
  const phase=!ns.realWeekday?'weekend':ns.nowMin<480?'before':ns.nowMin>900?'after':'live'
  const preview=phase==='live'?ns.nowMin:phase==='after'?900:phase==='before'?480:630
  const pillTxt=phase==='live'?`EN DIRECT · ${fmt(preview)}`:phase==='after'?'Journée terminée':phase==='before'?'Ouvre à 08:00':'Week-end'
  const live=cls?statusAt(child.classId,ns.dayIdx,preview,false):null
  const larea=live?AREAS[live.place]:null
  const pm=live?placeMeta(live):null
  return (<><PageHead title={greet} sub="Votre enfant, en un coup d'œil."/>
    {child&&live&&<Link to="/app/live" className="relative block rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition mb-5 group text-white" style={{background:`linear-gradient(120deg, ${larea.color} 0%, #10162B 100%)`}}>
      <div className="relative flex items-center gap-4 p-5 min-h-[124px]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{background:phase==='live'?STATUS.live:'rgba(255,255,255,.25)'}}><Radio size={11}/> {pillTxt}</span>
            <span className="opacity-80 uppercase tracking-wide">Suivi en direct</span>
          </div>
          <div className="text-2xl font-extrabold mt-1.5 leading-tight">{live.title}</div>
          <div className="opacity-90 text-sm">{child.name.split(' ')[0]} · {live.sub}</div>
          <div className="inline-flex items-center gap-1 text-xs font-bold mt-2 bg-white text-ink px-3 py-1.5 rounded-full group-hover:gap-2 transition-all">Voir le parcours de la journée <ArrowRight size={13}/></div>
        </div>
        <span className="ml-auto w-16 h-16 rounded-full grid place-items-center shrink-0 mr-2 group-hover:scale-110 transition" style={{background:pm.color+'16',color:pm.color}}><pm.Icon size={30}/></span>
      </div>
    </Link>}
    <div className="grid sm:grid-cols-4 gap-4 mb-5">
      <StatCard label="Moyenne générale" value={b?.overall!=null?`${b.overall}/100`:'—'} sub={b?.mention.label} tint="mint" icon={<Star/>}/>
      <StatCard label="Mois payés" value={`${paid}/${months.length}`} tint="sky" icon={<CreditCard/>}/>
      <StatCard label="Présence" value={b?.attRate!=null?`${b.attRate}%`:'—'} tint="grape" icon={<CalendarCheck/>}/>
      <StatCard label="Notifications" value={d.notifications.filter(n=>n.role==='parent'||n.to===u.id).length} tint="butter" icon={<Bell/>}/>
    </div>
    <div className="grid lg:grid-cols-2 gap-4 mb-4">
      <Card className="p-5"><div className="flex items-center justify-between mb-3"><h3 className="font-bold">Évolution des notes</h3>{child&&<Btn variant="soft" onClick={()=>setBulletin(child)}><FileText size={15}/> Bulletin</Btn>}</div>
        {trend.length>0? <div className="h-48"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{left:-20}}>
          <defs><linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={STATUS.ok} stopOpacity={.35}/><stop offset="100%" stopColor={STATUS.ok} stopOpacity={0}/></linearGradient></defs>
          <XAxis dataKey="i" tick={{fontSize:11,fill:'#8A93A6'}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={{fontSize:11,fill:'#8A93A6'}} axisLine={false} tickLine={false}/><Tooltip {...chartTip} formatter={(v,_n,p)=>[`${v}/100`,p.payload.subject]}/>
          <Area type="monotone" dataKey="score" stroke={STATUS.ok} strokeWidth={2.5} fill="url(#gScore)"/>
        </AreaChart></ResponsiveContainer></div>
        : <EmptyState icon={<TrendingUp size={22}/>} title="Aucune évaluation" sub="L'évolution des notes de votre enfant apparaîtra ici."/>}
      </Card>
      <Card className="p-5"><h3 className="font-bold mb-3">Moyennes par matière</h3>
        {b?.subjects.length? <div className="space-y-3">
          {b.subjects.map(s=>{ const m=mentionFor(s.avg); return (
            <div key={s.subject}><div className="flex justify-between text-sm mb-1"><span className="font-medium">{s.subject}</span><span className="font-bold" style={{color:m.color}}>{s.avg}/100</span></div>
              <div className="h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full" style={{width:`${s.avg}%`,background:m.color}}/></div></div>) })}
        </div> : <EmptyState icon={<Star size={22}/>} title="Aucune note disponible" sub="Les moyennes par matière apparaîtront ici."/>}
      </Card>
    </div>
    {(sw.strong.length>0||sw.weak.length>0) && <Card className="p-5 mb-4">
      <h3 className="font-bold mb-1">Où en est {child?.name.split(' ')[0]} ?</h3>
      <p className="text-xs text-muted mb-3">Par leçon, d'après les évaluations des enseignants — pour l'aider là où ça compte.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><div className="text-xs font-bold uppercase tracking-wide mb-2" style={{color:STATUS.ok}}>Points forts</div>
          <div className="space-y-1.5">{sw.strong.map(l=>(
            <div key={l.subject+l.lesson} className="flex items-center justify-between text-sm rounded-xl px-3 py-2" style={{background:STATUS.ok+'10'}}>
              <span className="font-medium truncate">{l.lesson} <span className="text-muted text-xs">· {l.subject}</span></span>
              <span className="font-bold shrink-0" style={{color:STATUS.ok}}>{l.avg}/100</span></div>))}
            {sw.strong.length===0&&<div className="text-xs text-muted">Encore un peu tôt — les points forts apparaîtront ici.</div>}</div></div>
        <div><div className="text-xs font-bold uppercase tracking-wide mb-2" style={{color:STATUS.warn}}>À renforcer</div>
          <div className="space-y-1.5">{sw.weak.map(l=>(
            <div key={l.subject+l.lesson} className="flex items-center justify-between text-sm rounded-xl px-3 py-2" style={{background:STATUS.warn+'12'}}>
              <span className="font-medium truncate">{l.lesson} <span className="text-muted text-xs">· {l.subject}</span></span>
              <span className="font-bold shrink-0" style={{color:STATUS.warn}}>{l.avg}/100</span></div>))}
            {sw.weak.length===0&&<div className="text-xs text-muted">Rien à signaler — tout est au vert !</div>}</div></div>
      </div>
    </Card>}
    <div className="flex gap-3 flex-wrap">
      <Link to="/app/payments" className={BTN_PRIMARY}>Voir les paiements</Link>
      <Link to="/app/homework" className={BTN_DEFAULT}>Devoirs</Link>
      <Link to="/app/notices" className={BTN_DEFAULT}>Annonces</Link>
    </div>
    <Bulletin student={bulletin} onClose={()=>setBulletin(null)}/>
  </>)
}
