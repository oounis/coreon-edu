import { useState } from 'react'
import { Ic } from '../icons.jsx'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts'
import { SoftBars, SoftBarsH, Gauge, DistributionBar } from '../components/charts.jsx'
import { SERIES, LEVELS, axis as chartAxis, grid as chartGrid, tooltip as chartTip } from '@core/charts.js'
import { Users, GraduationCap, Wallet, ShieldAlert, ClipboardCheck, CreditCard, Star, ArrowRight, Bell, FileText, TrendingUp, CalendarCheck, Radio, Stethoscope, UserX, CalendarDays, ChevronRight, Building2, Search, CheckCircle2 } from 'lucide-react'
import { current } from '@core/auth.js'
import { db, FEE_MONTHS, studentById, classById, settings, attParts } from '@core/db.js'
import { money } from '@core/accounting.js'
import { decisionsFor } from '@core/workbench.js'
import { menuFor } from '@core/nav.js'
import { t, dateLocale } from '@core/i18n.js'
import { StatCard, Card, PageHead, Badge, Avatar, Btn, IconTile, EmptyState, STATUS } from '../components/ui.jsx'
import { currentClass, classForSlot, SCHEDULE } from '@core/data.js'
import { studentSummary, bulletinFor, mentionFor, strengthsWeaknesses, lessonBreakdown } from '@core/results.js'
import LessonMap from '../components/LessonMap.jsx'
import { statusAt, AREAS, fmt, nowState, schoolPhase } from '@core/livestatus.js'
import { subjectMeta, PLACES } from '../subjects.jsx'
import Bulletin from '../components/Bulletin.jsx'
import { todayIso as todayIsoLocal } from '@core/clock.js'
import { rentreeLabel, DemoLiveButton } from '../components/Summer.jsx'
import { unreadFor } from '@core/notify.js'
import { needsSecurity, isNightEvent } from '@core/social.js'
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


export default function Dashboard(){
  const u=current(); const d=db()
  const greet = `${t('Bonjour')}, ${u.name.split(' ')[0]}`

  if(u.role==='teacher'){
    // currentClass() renvoie null hors séance (soir, week-end) : on retombe alors sur
    // la prochaine séance du planning plutôt que de planter ou de mentir « en cours ».
    const cls=currentClass()||classForSlot(SCHEDULE[0])
    // répartition de la dernière évaluation de la classe
    const ev=d.evaluations.find(e=>e.classId===cls.cls.id)
    const dist=[['Excellent',LEVELS[0]],['Bien',LEVELS[1]],['Moyen',LEVELS[2]],['Insuffisant',LEVELS[3]]]
    const buckets=['excellent','good','average','weak']
    const distData=dist.map(([n,c],i)=>{ let v=0; if(ev) cls.students.forEach(s=>{ const sum=studentSummary(ev,s.id); if(sum.score!=null){ const k=sum.score>=85?0:sum.score>=60?1:sum.score>=40?2:3; if(k===i)v++ } }); return {name:n,value:v,color:c} })
    const hasDist=distData.some(x=>x.value>0)
    // « Mes évaluations » : celles de CET enseignant — la liste affichait toutes
    // les évaluations de l'école, y compris celles des collègues.
    const myEvals=d.evaluations.filter(e=>e.teacher===u.name)
    const decisions=decisionsFor(u)   // le travail qui m'est confié (requests.js)
    return (<><PageHead title={greet} sub="Votre journée d'enseignement en un coup d'œil."/>
      {decisions.length>0&&<Workbench items={decisions} className="mb-5"/>}
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatCard label={cls.isLive?"Classe en cours":"Prochaine séance"} value={cls.cls.name} sub={cls.slot.subject} tint="mint" icon={<ClipboardCheck/>} to="/app/evaluate"/>
        <StatCard label={t('Élèves')} value={cls.students.length} tint="sky" icon={<Users/>} to="/app/students"/>
        <StatCard label="Mes demandes" value={d.requests.filter(r=>r.by===u.id).length} tint="butter" icon={<FileText/>} to="/app/requests"/>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-6 flex flex-col justify-between gap-4">
          <div><div className="text-xs font-bold uppercase accent-text">{cls.isLive?'Cours en direct':'Prochain cours'}</div>
            <div className="text-xl font-extrabold">{cls.cls.name} · {cls.slot.subject}</div>
            <div className="text-muted text-sm">{cls.slot.start}–{cls.slot.end} · {cls.students.length} élèves {cls.isLive&&<span className="ml-1 text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{background:STATUS.live}}>● EN COURS</span>}</div></div>
          <Link to="/app/evaluate" className={`${BTN_PRIMARY} w-full sm:w-auto`}>Évaluer la classe <ArrowRight size={17}/></Link>
        </Card>
        <Card className="p-5"><h3 className="font-bold mb-1">Niveau de la classe</h3>
          <p className="text-xs text-muted mb-3">Répartition de la dernière évaluation</p>
          {hasDist? <SoftBarsH data={distData} height={176}/>
           : <EmptyState icon={<ClipboardCheck size={22}/>} title="Aucune évaluation" sub="Évaluez cette classe pour voir la répartition des niveaux."/>}
        </Card>
      </div>
      <Card className="p-5 mt-4"><div className="flex items-center justify-between mb-3"><h3 className="font-bold flex items-center gap-1.5"><ClipboardCheck size={16}/> Mes évaluations enregistrées</h3><span className="text-xs text-muted">{myEvals.length} au total</span></div>
        {myEvals.length? <div className="space-y-2">{myEvals.slice(0,6).map(ev=>{ const studs=d.students.filter(s=>s.classId===ev.classId); const scores=studs.map(s=>studentSummary(ev,s.id).score).filter(x=>x!=null); const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null; const m=mentionFor(avg)
          return (<div key={ev.id} className="flex items-center justify-between text-sm border-b border-line pb-2 last:border-0"><div><span className="font-medium">{ev.className} · {ev.subject}</span><span className="text-xs text-muted ml-2">{new Date(ev.at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div><div className="text-right"><span className="text-muted text-xs mr-2">{scores.length} notés</span><span className="font-bold" style={{color:m.color}}>{avg!=null?`${avg}/100`:'—'}</span></div></div>) })}</div>
         : <EmptyState icon={<ClipboardCheck size={22}/>} title="Aucune évaluation enregistrée" sub="Vos évaluations enregistrées apparaîtront ici."/>}
      </Card></>)
  }

  if(u.role==='parent') return <ParentDashboard u={u} d={d} greet={greet}/>

  if(u.role==='owner') return <PlatformDashboard d={d} greet={greet}/>

  // L'agent de sécurité : ce soir, qui est dans l'école, la dernière ronde.
  if(u.role==='security'){
    const today=todayIsoLocal()
    const toCover=(d.socialEvents||[]).filter(e=>e.status==='approuve'&&e.date>=today&&needsSecurity(e))
      .sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))
    const tonight=toCover.filter(e=>e.date===today)
    const inside=(d.visitors||[]).filter(v=>v.date===today&&v.inAt&&!v.outAt)
    const lastRound=(d.rounds||[]).filter(r=>r.date===today).sort((a,b)=>(b.startAt||'').localeCompare(a.startAt||''))[0]
    const open=d.incidents.filter(i=>i.status==='open')
    const decisions=decisionsFor(u)
    return (<><PageHead title={greet} sub="Le poste de sécurité, en un coup d'œil."/>
      {decisions.length>0&&<Workbench items={decisions} className="mb-5"/>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="À couvrir ce soir" value={tonight.length} sub={tonight.length?tonight[0].time:'rien de prévu'} tint="brand" icon={<ShieldAlert/>} to="/app/security"/>
        <StatCard label="Visiteurs dans l'école" value={inside.length} tint="grape" icon={<Users/>} to="/app/security"/>
        <StatCard label="Dernière ronde" value={lastRound?lastRound.startAt:'—'} sub={lastRound?`${lastRound.points.length} zones`:'aucune aujourd\'hui'} tint="sky" icon={<CalendarCheck/>} to="/app/security"/>
        <StatCard label={t('Incidents ouverts')} value={open.length} tint="coral" icon={<ShieldAlert/>} to="/app/incidents"/>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5"><h3 className="font-bold mb-1">Prochains événements à couvrir</h3>
          <p className="text-xs text-muted mb-3">Approuvés par la Direction — soirées, affluence, personnes extérieures</p>
          {toCover.length? <div className="space-y-2">{toCover.slice(0,5).map(e=>(
            <Link key={e.id} to="/app/security" className="flex items-center gap-3 text-sm border-b border-line pb-2 last:border-0 hover:bg-canvas rounded-lg px-1 transition">
              <span className="text-muted"><Ic n={isNightEvent(e) ? 'Moon' : 'Sun'} size={17} /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold truncate">{e.title}</span>
                <span className="block text-xs text-muted">{e.date} · {e.time} · {e.place}</span></span>
              <ChevronRight size={15} className="text-muted"/>
            </Link>))}</div>
           : <EmptyState icon={<CalendarCheck size={22}/>} title="Aucun événement à couvrir" sub="Les activités approuvées apparaîtront ici."/>}
        </Card>
        <Card className="p-5"><h3 className="font-bold mb-1">Visiteurs actuellement dans l'école</h3>
          <p className="text-xs text-muted mb-3">Entrés, badge remis, pas encore sortis</p>
          {inside.length? <div className="space-y-2">{inside.map(v=>(
            <div key={v.id} className="flex items-center gap-3 text-sm border-b border-line pb-2 last:border-0">
              <Avatar name={v.name} seed={v.id} size={30}/>
              <span className="min-w-0 flex-1"><span className="block font-semibold truncate">{v.name}</span>
                <span className="block text-xs text-muted">{v.purpose} · reçu par {v.hostName}</span></span>
              <span className="text-xs font-bold tabular-nums">{v.inAt}</span>
            </div>))}</div>
           : <EmptyState icon={<Users size={22}/>} title="Personne dans l'école" sub="Aucun visiteur enregistré à cette heure."/>}
        </Card>
      </div></>)
  }

  if(u.role==='supervisor'){
    const open=d.incidents.filter(i=>i.status==='open')
    const sevData=[['Faible','low',STATUS.info],['Moyenne','medium',STATUS.warn],['Élevée','high',STATUS.danger]].map(([n,k,c])=>({name:n,value:d.incidents.filter(i=>i.severity===k).length,color:c}))
    const decisions=decisionsFor(u)
    return (<><PageHead title={greet} sub="Gardez l'école sûre et informée."/>
      {decisions.length>0&&<Workbench items={decisions} className="mb-5"/>}
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatCard label={t('Incidents ouverts')} value={open.length} tint="coral" icon={<ShieldAlert/>} to="/app/incidents"/>
        <StatCard label={t('Élèves')} value={d.students.length} tint="sky" icon={<Users/>} to="/app/students"/>
        <StatCard label="Signalés par moi" value={d.incidents.filter(i=>i.by===u.name).length} tint="butter" icon={<ShieldAlert/>} to="/app/incidents"/>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5"><h3 className="font-bold mb-3">Incidents par gravité</h3>
          <SoftBars data={sevData} height={176} showValues/>
        </Card>
        <Card className="p-5"><h3 className="font-bold mb-3">Incidents récents</h3>
          <div className="space-y-2">
            {d.incidents.slice(0,4).map(i=>{ const s=i.studentId?studentById(i.studentId):null; return (
              <Link to="/app/incidents" key={i.id} className="flex items-center gap-2 text-sm border-b border-line pb-2 last:border-0 hover:bg-canvas rounded-lg px-1 transition">
                <span className="w-2 h-2 rounded-full shrink-0" style={{background:i.severity==='high'?STATUS.danger:i.severity==='medium'?STATUS.warn:STATUS.info}}/>
                <span className="font-medium truncate flex-1">{i.title}</span>
                {s&&<span className="text-muted text-xs">{s.name.split(' ')[0]}</span>}
                <Badge status={i.status}/>
              </Link>) })}
            {d.incidents.length===0 && <EmptyState icon={<ShieldAlert size={22}/>} title="Aucun incident" sub="Tout est calme pour le moment."/>}
          </div>
        </Card>
      </div>
      <Link to="/app/incidents" className={`${BTN_PRIMARY} mt-4`}><ShieldAlert size={17}/> Signaler un incident</Link></>)
  }

  // schooladmin / admin — L'ATELIER, PAS LA VITRINE (recherche vérifiée 3-0 :
  // l'accueil administrateur de PowerSchool est un champ de recherche ; les KPI
  // vivent sous Reports). L'ordre de l'écran est l'ordre du travail :
  // ① ce qui attend MA décision  ② la recherche  ③ aujourd'hui  ④ le métier.
  // Les chiffres existent toujours — en second rang, où ils doivent vivre.
  const decisions=decisionsFor(u)
  const fc={paid:0,pending:0,overdue:0,due:0}; Object.values(d.payments).forEach(arr=>arr.forEach(p=>fc[p.status]++))
  // « À confirmer » = versements signalés par les parents, pas encore encaissés :
  // ils ne comptent PAS dans le recouvrement (collected = fc.paid).
  const pie=[[t('Payés'),STATUS.ok],[t('À confirmer'),STATUS.warn],[t('En retard'),STATUS.danger],[t('Impayés'),STATUS.neutral]].map(([n,c],i)=>({name:n,value:Object.values(fc)[i],color:c}))
  const totalFees=pie.reduce((s,p)=>s+p.value,0); const collected=fc.paid
  const collectRate=totalFees?Math.round((collected/totalFees)*100):0
  // présence réelle : agrégation des appels enregistrés (14 derniers jours d'école)
  const attDays={}
  for(const key in (d.attendance||{})){ const {iso}=attParts(key)
    const day=attDays[iso]=attDays[iso]||{present:0,absent:0,late:0}
    Object.values(d.attendance[key]).forEach(v=>{ day[v]!=null&&day[v]++ }) }
  const attDates=Object.keys(attDays).sort()
  const attend=attDates.slice(-14).map(iso=>({m:new Date(iso).toLocaleDateString(dateLocale(),{day:'2-digit',month:'short'}),present:attDays[iso].present,absent:attDays[iso].absent+attDays[iso].late}))
  const latestAtt=attDates[attDates.length-1]
  const absToday=latestAtt?attDays[latestAtt].absent:0, lateToday=latestAtt?attDays[latestAtt].late:0
  const todayIso=todayIsoLocal()
  const eventsToday=d.events.filter(e=>e.date===todayIso)
  const nextEvents=[...d.events].filter(e=>e.date>=todayIso).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3)
  const openInc=d.incidents.filter(i=>i.status==='open').length
  // les raccourcis du métier : ce que CE rôle ouvre pour travailler — depuis le
  // menu (nav.js), donc filtrés par rôle ET par les niveaux de l'école.
  const menu=menuFor(u.role, settings())
  const navItems=[...menu.pinned,...menu.groups.flatMap(g=>g.items)]
  const WANT=['/app/admissions','/app/students','/app/attendance','/app/accidents','/app/hr','/app/accounting','/app/requests','/app/facilities']
  const shortcuts=WANT.map(to=>navItems.find(n=>n.to===to)).filter(Boolean)
  // effectif par cycle
  // Effectif par classe : une seule grandeur (un nombre d'élèves), donc UNE seule
  // couleur. Peindre chaque barre différemment laissait croire à quatre catégories.
  const cycleData=d.classes.map(c=>({name:c.name,value:d.students.filter(s=>s.classId===c.id).length,color:SERIES[0]})).filter(x=>x.value>0)
  return (<><PageHead title={greet} sub={t('Votre atelier — ce qui attend votre décision passe en premier.')}/>
    <HeroSearch/>
    <div className="grid lg:grid-cols-3 gap-4 mb-4">
      <Workbench items={decisions} className="lg:col-span-2"/>
      <Card className="p-5">
        <h3 className="font-bold mb-0.5">{t("Aujourd'hui")}</h3>
        <p className="text-xs text-muted capitalize mb-3">{new Date().toLocaleDateString(dateLocale(),{weekday:'long',day:'numeric',month:'long'})}</p>
        <div className="space-y-1">
          <TodayRow to="/app/attendance" icon={<UserX size={15}/>} color={absToday?STATUS.danger:STATUS.ok}
            label={absToday?`${absToday} absent${absToday>1?'s':''}${lateToday?` · ${lateToday} retard${lateToday>1?'s':''}`:''}`:t('Aucun absent')}/>
          <TodayRow to="/app/incidents" icon={<ShieldAlert size={15}/>} color={openInc?STATUS.warn:STATUS.ok}
            label={openInc?`${openInc} incident${openInc>1?'s':''} ouvert${openInc>1?'s':''}`:t('Aucun incident ouvert')}/>
          <TodayRow to="/app/events" icon={<CalendarDays size={15}/>} color={eventsToday.length?'#7539E4':STATUS.neutral}
            label={eventsToday.length?`${eventsToday[0].title}${eventsToday.length>1?` +${eventsToday.length-1}`:''}`:t("Aucun événement aujourd'hui")}/>
        </div>
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-muted mt-4 mb-2">{t('À venir')}</div>
        <div className="space-y-2">
          {nextEvents.map(e=>(<Link key={e.id} to="/app/events" className="flex items-center gap-2.5 text-sm group">
            <IconTile icon={<CalendarCheck size={14}/>} tint="brand" size={32} radius="rounded-lg"/>
            <span className="min-w-0"><span className="block font-medium truncate group-hover:accent-text">{e.title}</span>
              <span className="block text-[11px] text-muted">{e.date} · {e.type}</span></span></Link>))}
          {nextEvents.length===0&&<div className="text-xs text-muted">{t('Aucun événement planifié.')}</div>}
        </div>
      </Card>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
      {shortcuts.map(s=>(<Link key={s.to} to={s.to} className="card px-2 py-3 flex flex-col items-center gap-1.5 text-center hover:shadow-md hover:-translate-y-0.5 transition group">
        <span className="w-9 h-9 grid place-items-center rounded-xl bg-canvas text-muted group-hover:accent-soft group-hover:accent-text transition"><Ic n={s.icon} size={17}/></span>
        <span className="text-[12px] font-semibold leading-tight">{t(s.label)}</span></Link>))}
    </div>
    {/* ── Les chiffres — en second rang, comme il se doit ─────────────────── */}
    <div className="flex items-baseline gap-2 mb-3"><h2 className="text-lg font-extrabold">{t('Les chiffres')}</h2>
      <span className="text-xs text-muted">{t("l'état de l'école, pour qui veut regarder")}</span></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard label={t('Élèves')} value={d.students.length} tint="grape" icon={<Users/>} to="/app/students"/>
      <StatCard label={t('Enseignants')} value={d.teachers.length} tint="butter" icon={<GraduationCap/>} to="/app/teachers"/>
      <StatCard label={t('Incidents ouverts')} value={openInc} tint="coral" icon={<ShieldAlert/>} to="/app/incidents"/>
      <StatCard label={t('Demandes en attente')} value={d.requests.filter(r=>r.status==='pending').length} tint="sky" icon={<FileText/>} to="/app/requests"/>
    </div>
    <div className="grid lg:grid-cols-3 gap-4 mb-4">
      {/* Cette carte montre la RÉPARTITION des mois ; la jauge du taux de recouvrement
          vit sur sa propre carte plus bas — deux jauges affichant 40 % faisaient doublon. */}
      <Link to="/app/finance" className="card p-5 block hover:shadow-lg hover:-translate-y-0.5 transition group"><h3 className="font-bold mb-1 flex items-center justify-between">{t('État des frais')} <ChevronRight size={15} className="text-muted group-hover:accent-text"/></h3><p className="text-xs text-muted mb-5">{t('Tous mois confondus')}</p>
        {/* un camembert force à comparer des angles ; une barre empilée compare des longueurs */}
        <div className="mb-1"><div className="text-3xl font-extrabold tabular-nums leading-none">{collected}<span className="text-base font-semibold text-muted"> / {totalFees} {t('mois')}</span></div>
          <div className="text-xs text-muted mt-1">{t('réglés à ce jour')}</div></div>
        <div className="mt-5"><DistributionBar items={pie}/></div>
      </Link>
      <Link to="/app/attendance" className="card p-5 lg:col-span-2 block hover:shadow-lg hover:-translate-y-0.5 transition group"><h3 className="font-bold mb-1 flex items-center justify-between">{t('Présence hebdomadaire')} <ChevronRight size={15} className="text-muted group-hover:accent-text"/></h3><p className="text-xs text-muted mb-2">{t('Présents vs absents')}</p>
        <div className="h-52"><ResponsiveContainer width="100%" height="100%"><AreaChart data={attend} margin={{top:8,right:8,left:-4,bottom:0}}>
          <defs><linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={SERIES[0]} stopOpacity={.22}/><stop offset="100%" stopColor={SERIES[0]} stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid {...chartGrid}/>
          <XAxis dataKey="m" {...chartAxis}/><YAxis {...chartAxis} width={42}/><Tooltip {...chartTip}/>
          <Area type="monotone" dataKey="present" name={t('Présents')} stroke={SERIES[0]} strokeWidth={2} fill="url(#gP)" dot={false} activeDot={{r:4,strokeWidth:2,stroke:'#fff'}}/>
          <Area type="monotone" dataKey="absent" name={t('Absents')} stroke={STATUS.danger} strokeWidth={2} fill="transparent" dot={false} activeDot={{r:4,strokeWidth:2,stroke:'#fff'}}/>
        </AreaChart></ResponsiveContainer></div>
        <div className="flex gap-4 mt-2 justify-center">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted"><i className="w-2.5 h-2.5 rounded-full" style={{background:SERIES[0]}}/>{t('Présents')}</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted"><i className="w-2.5 h-2.5 rounded-full" style={{background:STATUS.danger}}/>{t('Absents')}</span>
        </div>
      </Link>
    </div>
    <div className="grid lg:grid-cols-3 gap-4">
      {cycleData.length>0 && <Link to="/app/students" className="card p-5 block lg:col-span-2 hover:shadow-lg hover:-translate-y-0.5 transition group"><h3 className="font-bold mb-3 flex items-center justify-between">{t('Effectif par classe')} <ChevronRight size={15} className="text-muted group-hover:accent-text"/></h3>
        <SoftBars data={cycleData} height={176} showValues/>
      </Link>}
      <Link to="/app/finance" className="card p-5 block hover:shadow-lg hover:-translate-y-0.5 transition group"><h3 className="font-bold mb-3 flex items-center justify-between">{t('Taux de recouvrement')} <ChevronRight size={15} className="text-muted group-hover:accent-text"/></h3>
        <div className="grid place-items-center h-44"><Gauge value={collectRate} color={STATUS.ok} label={`${collected} / ${totalFees} ${t('mois')}`} size={142}/></div>
      </Link>
    </div>
    <Card className="p-5 mt-4"><div className="flex items-center justify-between mb-3"><h3 className="font-bold flex items-center gap-1.5"><ClipboardCheck size={16}/> {t('Évaluations enregistrées')}</h3><Link to="/app/results" className="text-xs font-semibold accent-text inline-flex items-center gap-1">{t('Suivi élèves')} <ChevronRight size={13}/></Link></div>
      {d.evaluations.length? <div className="overflow-x-auto scroll-thin -mx-5 -mb-5"><table className="w-full text-sm"><thead><tr className="text-left text-[12px] uppercase tracking-wide text-muted bg-canvas"><th className="px-4 py-3 font-semibold">{t('Date')}</th><th className="px-4 py-3 font-semibold">{t('Classe')}</th><th className="px-4 py-3 font-semibold">{t('Matière')}</th><th className="px-4 py-3 font-semibold">{t('Leçon')}</th><th className="px-4 py-3 font-semibold">{t('Enseignant')}</th><th className="px-4 py-3 font-semibold text-center">{t('Élèves notés')}</th><th className="px-4 py-3 font-semibold text-center">{t('Moyenne')}</th></tr></thead>
        <tbody className="divide-y divide-line">{d.evaluations.slice(0,8).map(ev=>{ const cls=d.classes.find(c=>c.id===ev.classId); const studs=d.students.filter(s=>s.classId===ev.classId); const scores=studs.map(s=>studentSummary(ev,s.id).score).filter(x=>x!=null); const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null; const m=mentionFor(avg)
        return (<tr key={ev.id}><td className="px-4 py-3 text-muted whitespace-nowrap">{new Date(ev.at).toLocaleDateString(dateLocale(),{day:'2-digit',month:'short'})}</td><td className="px-4 py-3 font-medium">{ev.className||cls?.name}</td><td className="px-4 py-3">{ev.subject}</td><td className="px-4 py-3 text-muted">{ev.lesson||"—"}</td><td className="px-4 py-3 text-muted">{ev.teacher}</td><td className="px-4 py-3 text-center">{scores.length}</td><td className="px-4 py-3 text-center font-bold" style={{color:m.color}}>{avg!=null?`${avg}/100`:'—'}</td></tr>) })}</tbody></table></div>
       : <EmptyState icon={<ClipboardCheck size={22}/>} title={t('Aucune évaluation enregistrée')} sub={t('Les évaluations des enseignants apparaîtront ici.')}/>}
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
    {name:'Plan Pro',value:actives.filter(s=>s.plan==='Pro').length,color:'#7539E4'},
    {name:'Plan Essentiel',value:actives.filter(s=>s.plan==='Essentiel').length,color:'#0BA5D8'},
    {name:'En essai',value:trials.length,color:STATUS.warn},
  ].filter(x=>x.value>0)
  const STL={active:['Active',STATUS.ok],trial:["Essai",STATUS.warn],suspended:['Suspendue',STATUS.neutral]}
  return (<><PageHead title={greet} sub="Console plateforme — vos écoles clientes en un coup d'œil."/>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard label="Écoles clientes" value={schools.filter(s=>s.status!=='suspended').length} tint="brand" icon={<Building2/>} to="/app/schools"/>
      <StatCard label="Élèves gérés" value={totalStudents} tint="sky" icon={<Users/>}/>
      <StatCard label="Revenu mensuel" value={money(mrr)} sub="abonnements actifs" tint="mint" icon={<Wallet/>}/>
      <StatCard label="En essai" value={trials.length} tint="butter" icon={<FileText/>}/>
    </div>
    <div className="grid lg:grid-cols-[340px_1fr] gap-4">
      <Card className="p-5"><h3 className="font-bold mb-1">Répartition des abonnements</h3><p className="text-xs text-muted mb-4">Écoles actives et en essai</p>
        <SoftBarsH data={planPie} height={150} width={92}/>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3"><h3 className="font-bold">Écoles clientes</h3>
          <Link to="/app/schools" className="text-xs font-semibold accent-text inline-flex items-center gap-1">Gérer les écoles <ArrowRight size={13}/></Link></div>
        <div className="divide-y divide-line">
          {schools.map(sc=>{ const [lbl,col]=STL[sc.status]||STL.active
            return (<Link key={sc.id} to="/app/schools" className="flex items-center gap-3 py-2.5 group">
              <IconTile icon={<Building2 size={16}/>} tint={sc.live?'brand':'slate'} size={38} radius="rounded-xl"/>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate group-hover:accent-text">{sc.name}</span>
                <span className="block text-[12px] text-muted">{sc.city} · {count(sc)} élèves · depuis {sc.since}</span></span>
              <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{background:col+'1E',color:col}}>{lbl}</span>
              <span className="text-sm font-extrabold w-20 text-right">{sc.status==='active'?`${money(sc.price)}/m`:'—'}</span>
            </Link>) })}
        </div>
      </Card>
    </div>
  </>)
}

// ── L'atelier ────────────────────────────────────────────────────────────────
// La recherche d'abord : chez PowerSchool, l'accueil administrateur EST un champ
// de recherche. Ce bouton ouvre la même palette que Ctrl+K — une seule recherche.
function HeroSearch(){
  return (<button onClick={()=>window.dispatchEvent(new Event('coreon:open-palette'))}
    className="card w-full flex items-center gap-3 px-4 py-3.5 mb-4 text-left hover:shadow-md transition group">
    <Search size={18} className="text-muted group-hover:accent-text transition"/>
    <span className="flex-1 text-sm text-muted">{t('Rechercher un élève, un enseignant, une page…')}</span>
    <span className="hidden sm:flex items-center gap-1">
      <span className="text-[11px] font-bold text-muted border border-line rounded-md px-1.5 py-0.5 bg-canvas">Ctrl</span>
      <span className="text-[11px] font-bold text-muted border border-line rounded-md px-1.5 py-0.5 bg-canvas">K</span></span>
  </button>)
}

// « À décider » — la liste de travail calculée des FAITS (core/workbench.js).
// Vide, elle reste une information : l'école est à jour.
function Workbench({ items, className='' }){
  const TONE={danger:STATUS.danger,warn:STATUS.warn,info:STATUS.info}
  return (<Card className={`p-5 min-w-0 ${className}`}>
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-bold">{t('À décider')}</h3>
      {items.length>0&&<span className="text-xs font-bold px-2.5 py-0.5 rounded-full accent-soft accent-text tabular-nums">{items.reduce((s,i)=>s+i.count,0)}</span>}
    </div>
    {items.length===0
      ? <EmptyState icon={<CheckCircle2 size={22}/>} title={t("Rien n'attend votre décision")} sub={t("L'école est à jour. C'est une information, pas un écran vide.")}/>
      : <div className="divide-y divide-line">
          {items.map(it=>{ const c=TONE[it.tone]||STATUS.info
            return (<Link key={it.key} to={it.to} className="flex items-center gap-3 py-2.5 group">
              <span className="w-9 h-9 grid place-items-center rounded-xl shrink-0" style={{background:c+'16',color:c}}><Ic n={it.icon} size={17}/></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold group-hover:accent-text break-words">{it.label}</span>
                <span className="block text-[12px] text-muted truncate">{t(it.sub)}</span></span>
              <ChevronRight size={15} className="text-muted shrink-0 group-hover:accent-text"/>
            </Link>)})}
        </div>}
  </Card>)
}

function TodayRow({ to, icon, color, label }){
  return <Link to={to} className="flex items-center gap-2.5 text-sm font-semibold rounded-xl px-2.5 py-2 -mx-1 hover:bg-canvas transition"
    style={{color}}>{icon}<span className="flex-1 min-w-0 truncate">{label}</span><ChevronRight size={13} className="opacity-60"/></Link>
}

function ParentDashboard({u,d,greet}){
  const [bulletin,setBulletin]=useState(null)
  // un parent de plusieurs enfants ne voyait que le premier : il peut désormais choisir
  const kids=(u.childIds||[]).map(studentById).filter(Boolean)
  const [pickedId,setPickedId]=useState(kids[0]?.id)
  const child=kids.find(k=>k.id===pickedId)||kids[0]||null
  const childId=child?.id
  const b=childId? bulletinFor(d,childId):null
  const months=(d.payments[childId]||[]); const paid=months.filter(m=>m.status==='paid').length
  const sessions=b?.sessions||[]
  const trend=sessions.slice(-6).map((s,i)=>({i:i+1,score:s.score,subject:s.subject}))
  const cls=child?classById(child.classId):null
  const childEvals=childId?d.evaluations.filter(e=>e.classId===child?.classId):[]
  const sw=childId?strengthsWeaknesses(childEvals,childId):{strong:[],weak:[]}
  const bk=childId?lessonBreakdown(childEvals,childId):[]
  const recentEvals=childEvals.map(e=>({id:e.id,at:e.at,subject:e.subject,lesson:e.lesson,score:studentSummary(e,childId).score}))
    .filter(x=>x.score!=null).sort((a,b)=>b.at-a.at).slice(0,6)
  const ns=nowState()
  const phase=schoolPhase(new Date())
  const preview=phase==='live'?ns.nowMin:phase==='after'?900:phase==='before'?480:630
  const pillTxt=phase==='live'?`EN DIRECT · ${fmt(preview)}`:phase==='after'?'Journée terminée':phase==='before'?'Ouvre à 08:00':phase==='vacances'?"Vacances d'été":'Week-end'
  const live=cls?statusAt(child.classId,ns.dayIdx,preview,false):null
  const larea=live?AREAS[live.place]:null
  const pm=live?placeMeta(live):null
  // ce qui attend LA décision du parent : signer un accident, régler un retard
  const decisions=decisionsFor(u)
  if(!child) return <Card><EmptyState icon={<Users size={26}/>} title="Aucun enfant associé" sub="Demandez à la direction de lier votre compte à votre enfant."/></Card>
  return (<><PageHead title={greet} sub="Votre enfant, en un coup d'œil."
      action={kids.length>1&&<select aria-label="Choisir l'enfant" value={child.id} onChange={e=>setPickedId(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold">{kids.map(k=><option key={k.id} value={k.id}>{k.name}</option>)}</select>}/>
    {decisions.length>0&&<Workbench items={decisions} className="mb-5"/>}
    {child&&live&&<Link to="/app/live" className="relative block rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition mb-5 group text-white" style={{background:`linear-gradient(120deg, ${larea.color} 0%, #0E2135 100%)`}}>
      <div className="relative flex items-center gap-4 p-5 min-h-[124px]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-bold">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{background:phase==='live'?STATUS.live:'rgba(255,255,255,.25)'}}><Radio size={11}/> {pillTxt}</span>
            <span className="opacity-80 uppercase tracking-wide">Suivi en direct</span>
          </div>
          <div className="text-2xl font-extrabold mt-1.5 leading-tight">{phase==='vacances'?"Vacances d'été":live.title}</div>
          <div className="opacity-90 text-sm">{child.name.split(' ')[0]} · {phase==='vacances'?`Reprise le ${rentreeLabel()}`:live.sub}</div>
          <div className="inline-flex items-center gap-1 text-xs font-bold mt-2 bg-white text-ink px-3 py-1.5 rounded-full group-hover:gap-2 transition-all">Voir le parcours de la journée <ArrowRight size={13}/></div>
        </div>
        <span className="ml-auto w-16 h-16 rounded-full grid place-items-center shrink-0 mr-2 group-hover:scale-110 transition" style={{background:pm.color+'16',color:pm.color}}><pm.Icon size={30}/></span>
      </div>
    </Link>}
    <div className="grid sm:grid-cols-4 gap-4 mb-5">
      <StatCard label="Moyenne générale" value={b?.overall!=null?`${b.overall}/100`:'—'} sub={b?.mention.label} tint="mint" icon={<Star/>} onClick={()=>child&&setBulletin(child)}/>
      <StatCard label="Mois payés" value={`${paid}/${months.length}`} tint="sky" icon={<CreditCard/>} to="/app/payments"/>
      <StatCard label="Présence" value={b?.attRate!=null?`${b.attRate}%`:'—'} tint="grape" icon={<CalendarCheck/>} to="/app/live"/>
      {/* comptait toutes les notifications (lues comprises) et supposait le rôle parent */}
      <StatCard label="Non lues" value={unreadFor(u)} tint="butter" icon={<Bell/>} to="/app/notifications"/>
    </div>
    <div className="grid lg:grid-cols-2 gap-4 mb-4">
      <Card className="p-5"><div className="flex items-center justify-between mb-3"><h3 className="font-bold">Évolution des notes</h3>{child&&<Btn variant="soft" onClick={()=>setBulletin(child)}><FileText size={15}/> Bulletin</Btn>}</div>
        {trend.length>0? <div className="h-48"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{top:8,right:8,left:-4,bottom:0}}>
          <defs><linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={SERIES[0]} stopOpacity={.22}/><stop offset="100%" stopColor={SERIES[0]} stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid {...chartGrid}/>
          <XAxis dataKey="i" {...chartAxis}/><YAxis domain={[0,100]} {...chartAxis} width={42}/><Tooltip {...chartTip} formatter={(v,_n,p)=>[`${v}/100`,p.payload.subject]}/>
          <Area type="monotone" dataKey="score" stroke={SERIES[0]} strokeWidth={2} fill="url(#gScore)" dot={false} activeDot={{r:4,strokeWidth:2,stroke:'#fff'}}/>
        </AreaChart></ResponsiveContainer></div>
        : <EmptyState icon={<TrendingUp size={22}/>} title="Aucune évaluation" sub="L'évolution des notes de votre enfant apparaîtra ici."/>}
      </Card>
      <Card className="p-5"><h3 className="font-bold mb-3 flex items-center justify-between">Moyennes par matière <button onClick={()=>child&&setBulletin(child)} className="text-xs font-semibold accent-text inline-flex items-center gap-1">Bulletin <ChevronRight size={13}/></button></h3>
        {b?.subjects.length? <div className="space-y-3">
          {b.subjects.map(s=>{ const m=mentionFor(s.avg); return (
            <div key={s.subject}><div className="flex justify-between text-sm mb-1"><span className="font-medium">{s.subject}</span><span className="font-bold" style={{color:m.color}}>{s.avg}/100</span></div>
              <div className="h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full" style={{width:`${s.avg}%`,background:m.color}}/></div></div>) })}
        </div> : <EmptyState icon={<Star size={22}/>} title="Aucune note disponible" sub="Les moyennes par matière apparaîtront ici."/>}
      </Card>
    </div>
    {recentEvals.length>0 && <Card className="p-5 mb-4">
      <div className="flex items-center justify-between mb-3"><h3 className="font-bold">Dernières évaluations</h3>
        <span className="text-xs text-muted">{childEvals.length} au total</span></div>
      <div className="divide-y divide-line">
        {recentEvals.map(e=>{ const m=mentionFor(e.score); return (
          <button key={e.id} onClick={()=>child&&setBulletin(child)} className="flex items-center gap-3 py-2 text-sm w-full text-left hover:bg-canvas rounded-lg px-1 transition">
            <span className="min-w-0 flex-1"><span className="font-semibold">{e.subject}</span>
              {e.lesson&&<span className="ml-1.5 text-[12px] font-bold px-2 py-0.5 rounded-full accent-soft accent-text">{e.lesson}</span>}
              <span className="block text-[12px] text-muted">{new Date(e.at).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</span></span>
            <span className="font-extrabold" style={{color:m.color}}>{e.score}/100</span>
            <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{background:m.color+'1E',color:m.color}}>{m.label}</span>
          </button>)})}
      </div>
    </Card>}
    {bk.length>0 && <Card className="p-5 mb-4">
      <h3 className="font-bold mb-1 flex items-center justify-between">Par matière & leçon <button onClick={()=>child&&setBulletin(child)} className="text-xs font-semibold accent-text inline-flex items-center gap-1">Bulletin <ChevronRight size={13}/></button></h3>
      <p className="text-xs text-muted mb-3">La progression de {child?.name.split(' ')[0]}, leçon par leçon.</p>
      <LessonMap data={bk} compact/>
    </Card>}
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
      <Link to="/app/social" className={BTN_DEFAULT}><Ic n="Sparkles" size={15} /> Espace parents</Link>
      <Link to="/app/notices" className={BTN_DEFAULT}>Annonces</Link>
    </div>
    <Bulletin student={bulletin} onClose={()=>setBulletin(null)}/>
  </>)
}
