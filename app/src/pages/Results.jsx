import { useState, useMemo } from 'react'
import { db, classById } from '../db.js'
import { BUCKETS } from '../data.js'
import { studentSummary, mentionFor, lessonBreakdown } from '../results.js'
import { PageHead, StatCard, SectionCard, EmptyState, Avatar, Tabs, Chip, SearchInput, Table, Modal, STATUS } from '../components/ui.jsx'
import GradeHistory from '../components/GradeHistory.jsx'
import { ClipboardCheck, Gauge, Users, LifeBuoy, Trophy, TrendingUp, TrendingDown, Minus, ChevronRight, BarChart3, Search } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, startOfDay, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'

const PERIODS=[{value:'day',label:'Jour'},{value:'week',label:'Semaine'},{value:'month',label:'Mois'},{value:'year',label:'Année'}]
const CUT={day:1,week:7,month:30,year:365}
const DAY=86400000

// group evaluations into chart points depending on the period granularity
function trendPoints(evals, period){
  const bucket = period==='year' ? at=>format(new Date(at),'MMM',{locale:fr})
    : period==='month' ? at=>format(startOfWeek(new Date(at),{weekStartsOn:1}),'d MMM',{locale:fr})
    : at=>format(new Date(at),'EEE d',{locale:fr})
  const order={}, acc={}
  ;[...evals].sort((a,b)=>a.at-b.at).forEach(e=>{ const key=bucket(e.at)
    if(!(key in acc)){ acc[key]=[]; order[key]=e.at }
    acc[key].push(e.avg) })
  return Object.keys(acc).sort((a,b)=>order[a]-order[b])
    .map(k=>({name:k, moyenne:Math.round(acc[k].reduce((s,x)=>s+x,0)/acc[k].length)}))
}

export default function Results(){
  const d=db()
  const [period,setPeriod]=useState('month')
  const [classId,setClassId]=useState('all')
  const [q,setQ]=useState('')
  const [view,setView]=useState(null) // student for the history modal

  const data=useMemo(()=>{
    const since=Date.now()-CUT[period]*DAY
    const evals=d.evaluations
      .filter(e=>e.at>=(period==='day'?startOfDay(new Date()).getTime():since))
      .filter(e=>classId==='all'||e.classId===classId)
      .map(e=>{
        const scores=[]
        const sids=new Set(); Object.values(e.placements||{}).forEach(p=>Object.keys(p||{}).forEach(id=>sids.add(id)))
        sids.forEach(sid=>{ const s=studentSummary(e,sid); if(s.score!=null) scores.push({sid,score:s.score}) })
        return {...e, scores, avg: scores.length?Math.round(scores.reduce((s,x)=>s+x.score,0)/scores.length):null}
      }).filter(e=>e.avg!=null)
    // per-student aggregation (chronological, for the trend arrow)
    const perStudent={}
    ;[...evals].sort((a,b)=>a.at-b.at).forEach(e=>e.scores.forEach(({sid,score})=>{ (perStudent[sid]=perStudent[sid]||[]).push(score) }))
    const students=Object.entries(perStudent).map(([sid,arr])=>{
      const s=d.students.find(x=>x.id===sid); if(!s) return null
      const avg=Math.round(arr.reduce((a,x)=>a+x,0)/arr.length)
      const half=Math.floor(arr.length/2)
      const trend = arr.length<3 ? 0 : Math.round(arr.slice(half).reduce((a,x)=>a+x,0)/(arr.length-half) - arr.slice(0,half).reduce((a,x)=>a+x,0)/half)
      return { s, count:arr.length, avg, trend, mention:mentionFor(avg) }
    }).filter(Boolean)
    const dist=Object.fromEntries(BUCKETS.map(b=>[b.key,0]))
    evals.forEach(e=>Object.values(e.placements||{}).forEach(p=>Object.values(p||{}).forEach(k=>{ if(k in dist) dist[k]++ })))
    const overall=evals.length?Math.round(evals.reduce((s,e)=>s+e.avg,0)/evals.length):null
    return { evals, students, dist, overall }
  },[d,period,classId])

  const ranked=[...data.students].sort((a,b)=>b.avg-a.avg || b.count-a.count)
  const top=ranked.slice(0,5)
  const low=[...ranked].reverse().slice(0,5)
  const struggling=data.students.filter(x=>x.avg<40).length
  const trend=trendPoints(data.evals, period)
  const pie=BUCKETS.map(b=>({name:b.label,value:data.dist[b.key],color:b.color})).filter(x=>x.value>0)
  const classes = classId==='all' ? d.classes : d.classes.filter(c=>c.id===classId)
  const classAvgs=classes.map(c=>{ const list=data.students.filter(x=>x.s.classId===c.id)
    return { c, n:list.length, avg:list.length?Math.round(list.reduce((s,x)=>s+x.avg,0)/list.length):null } }).filter(x=>x.avg!=null)
  const query=q.trim().toLowerCase()
  const rows=ranked.filter(x=>!query||x.s.name.toLowerCase().includes(query))

  return (<>
    <PageHead title="Suivi des élèves" sub="Toutes les évaluations, les élèves à féliciter et ceux à accompagner."
      action={<div className="flex items-center gap-2 flex-wrap">
        <Chip active={classId==='all'} onClick={()=>setClassId('all')}>Toutes les classes</Chip>
        {d.classes.map(c=><Chip key={c.id} active={classId===c.id} onClick={()=>setClassId(c.id)}>{c.name}</Chip>)}
      </div>}/>
    <div className="mb-5"><Tabs tabs={PERIODS} value={period} onChange={setPeriod}/></div>

    {data.evals.length===0 ? (
      <SectionCard headless><EmptyState icon={<BarChart3 size={26}/>} title="Aucune évaluation sur cette période"
        sub="Élargissez la période ou choisissez une autre classe."/></SectionCard>
    ) : (<>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard tint="brand"  icon={<ClipboardCheck size={20}/>} value={data.evals.length} label="Évaluations"/>
        <StatCard tint="mint"   icon={<Gauge size={20}/>}          value={data.overall!=null?`${data.overall}/100`:'—'} label="Moyenne générale"/>
        <StatCard tint="sky"    icon={<Users size={20}/>}          value={data.students.length} label="Élèves évalués"/>
        <StatCard tint="coral"  icon={<LifeBuoy size={20}/>}       value={struggling} label="En difficulté" sub="moy. < 40"/>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 mb-5">
        <SectionCard icon={<TrendingUp size={16}/>} tint="brand" title="Évolution de la moyenne" sub={`Moyenne des évaluations · ${PERIODS.find(p=>p.value===period).label.toLowerCase()}`}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{top:6,right:6,left:-18,bottom:0}}>
                <defs><linearGradient id="gAvg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366F1" stopOpacity={.25}/><stop offset="100%" stopColor="#6366F1" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="name" tick={{fontSize:11,fill:'#8A93A6'}} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{fontSize:11,fill:'#8A93A6'}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{borderRadius:12,border:'1px solid #EDEFF5',fontSize:12}} formatter={v=>[`${v}/100`,'Moyenne']}/>
                <Area type="monotone" dataKey="moyenne" stroke="#6366F1" strokeWidth={2.5} fill="url(#gAvg)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard icon={<Gauge size={16}/>} tint="grape" title="Répartition des niveaux" sub="Toutes réponses confondues">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={pie} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {pie.map(x=><Cell key={x.name} fill={x.color}/>)}</Pie>
                <Tooltip contentStyle={{borderRadius:12,border:'1px solid #EDEFF5',fontSize:12}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {BUCKETS.map(b=><span key={b.key} className="flex items-center gap-1.5 text-xs"><i className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:b.color}}/><span className="text-muted">{b.label}</span><b className="ml-auto">{data.dist[b.key]}</b></span>)}
          </div>
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        <SectionCard icon={<Trophy size={16}/>} tint="mint" title="Top élèves" sub="Les meilleures moyennes de la période" bodyClass="p-3">
          {top.map((x,i)=><RankRow key={x.s.id} x={x} i={i} onOpen={()=>setView(x.s)} best/>)}
        </SectionCard>
        <SectionCard icon={<LifeBuoy size={16}/>} tint="coral" title="À accompagner" sub="Les moyennes les plus fragiles — à suivre de près" bodyClass="p-3">
          {low.map((x,i)=><RankRow key={x.s.id} x={x} i={i} onOpen={()=>setView(x.s)}/>)}
        </SectionCard>
      </div>

      {classAvgs.length>1 && (
        <SectionCard icon={<Users size={16}/>} tint="sky" title="Moyenne par classe" className="mb-5">
          <div className="space-y-3">
            {classAvgs.sort((a,b)=>b.avg-a.avg).map(({c,n,avg})=>{ const m=mentionFor(avg); return (
              <div key={c.id} className="flex items-center gap-3">
                <span className="w-20 text-sm font-bold shrink-0">{c.name}</span>
                <div className="flex-1 h-2.5 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full" style={{width:`${avg}%`,background:m.color}}/></div>
                <span className="w-16 text-right text-sm font-extrabold" style={{color:m.color}}>{avg}/100</span>
                <span className="w-16 text-right text-xs text-muted">{n} élèves</span>
              </div>) })}
          </div>
        </SectionCard>
      )}

      <SectionCard icon={<ClipboardCheck size={16}/>} tint="brand" title="Tous les élèves évalués" sub="Cliquez sur un élève pour ouvrir son historique complet"
        action={<SearchInput value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un élève…" className="w-56"/>} bodyClass="p-0">
        {rows.length===0 ? <EmptyState icon={<Search size={24}/>} title="Aucun élève ne correspond"/> : (
        <div className="overflow-x-auto scroll-thin"><table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wide text-muted bg-canvas">
            {['#','Élève','Classe','Évaluations','Moyenne','Mention','Tendance',''].map((h,i)=><th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((x,i)=>(
              <tr key={x.s.id} onClick={()=>setView(x.s)} className="hover:bg-canvas cursor-pointer">
                <td className="px-4 py-2.5 text-muted font-bold w-10">{i+1}</td>
                <td className="px-4 py-2.5"><span className="flex items-center gap-2.5"><Avatar name={x.s.name} seed={x.s.id} size={30}/><span className="font-semibold">{x.s.name}</span></span></td>
                <td className="px-4 py-2.5 text-muted">{classById(x.s.classId)?.name}</td>
                <td className="px-4 py-2.5 text-muted">{x.count}</td>
                <td className="px-4 py-2.5 font-extrabold" style={{color:x.mention.color}}>{x.avg}/100</td>
                <td className="px-4 py-2.5"><span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{background:x.mention.color+'1E',color:x.mention.color}}>{x.mention.label}</span></td>
                <td className="px-4 py-2.5"><TrendArrow t={x.trend}/></td>
                <td className="px-4 py-2.5 text-muted"><ChevronRight size={15}/></td>
              </tr>))}
          </tbody>
        </table></div>)}
      </SectionCard>
    </>)}

    <Modal open={!!view} onClose={()=>setView(null)} title={view?`Historique — ${view.name}`:''} size="2xl">
      {view&&<>
        <div className="flex items-center gap-3 mb-4"><Avatar name={view.name} seed={view.id} size={44}/>
          <div><div className="font-bold">{view.name}</div><div className="text-xs text-muted">{classById(view.classId)?.name} · {classById(view.classId)?.cycle}</div></div></div>
        <LessonMap d={d} sid={view.id}/>
        <GradeHistory studentId={view.id}/>
      </>}
    </Modal>
  </>)
}

function LessonMap({ d, sid }){
  const bk=lessonBreakdown(d.evaluations.filter(e=>{const s=d.students.find(x=>x.id===sid);return s&&e.classId===s.classId}),sid)
  if(!bk.length) return null
  return (<div className="mb-5">
    <h3 className="text-sm font-bold uppercase tracking-wide accent-text mb-2">Par matière & leçon</h3>
    <div className="grid sm:grid-cols-2 gap-2.5">
      {bk.map(s=>{ const m=mentionFor(s.avg); return (
        <div key={s.subject} className="rounded-xl border border-line p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-sm">{s.subject}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{background:m.color+'1E',color:m.color}}>{s.avg}/100</span></div>
          <div className="space-y-1">
            {s.lessons.map(l=>{ const lm=mentionFor(l.avg); return (
              <div key={l.lesson} className="flex items-center gap-2 text-xs">
                <span className="w-24 truncate text-muted shrink-0">{l.lesson}</span>
                <div className="flex-1 h-1.5 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full" style={{width:`${l.avg}%`,background:lm.color}}/></div>
                <span className="font-bold w-8 text-right" style={{color:lm.color}}>{l.avg}</span>
              </div>)})}
          </div>
        </div>)})}
    </div>
  </div>)
}

function TrendArrow({ t }){
  if(t>2)  return <span className="inline-flex items-center gap-1 text-xs font-bold" style={{color:STATUS.ok}}><TrendingUp size={14}/>+{t}</span>
  if(t<-2) return <span className="inline-flex items-center gap-1 text-xs font-bold" style={{color:STATUS.danger}}><TrendingDown size={14}/>{t}</span>
  return <span className="inline-flex items-center gap-1 text-xs font-bold" style={{color:STATUS.neutral}}><Minus size={14}/> stable</span>
}
function RankRow({ x, i, onOpen, best }){
  const medal=best&&i<3
  return (
    <button onClick={onOpen} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas text-left">
      <span className="w-7 h-7 rounded-full grid place-items-center text-xs font-extrabold shrink-0"
        style={medal?{background:['#FFF4DD','#EEF1F6','#FCEEE2'][i],color:['#E59A12','#64748B','#B45309'][i]}:{background:'#EEF1F6',color:'#64748B'}}>{i+1}</span>
      <Avatar name={x.s.name} seed={x.s.id} size={34}/>
      <span className="min-w-0 flex-1"><span className="block font-semibold truncate leading-tight">{x.s.name}</span>
        <span className="block text-[11px] text-muted">{classById(x.s.classId)?.name} · {x.count} évaluation{x.count>1?'s':''}</span></span>
      <TrendArrow t={x.trend}/>
      <span className="text-sm font-extrabold w-14 text-right" style={{color:x.mention.color}}>{x.avg}/100</span>
    </button>
  )
}
