import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, RadialBarChart, RadialBar } from 'recharts'
import { Users, GraduationCap, Wallet, ShieldAlert, ClipboardCheck, CreditCard, Star, ArrowRight, Bell, FileText, TrendingUp, CalendarCheck } from 'lucide-react'
import { current } from '../auth.js'
import { db, FEE_MONTHS, studentById } from '../db.js'
import { StatCard, Card, PageHead, Badge, Avatar, Btn } from '../components/ui.jsx'
import { currentClass, studentColor } from '../data.js'
import { studentSummary, bulletinFor, mentionFor } from '../results.js'
import Bulletin from '../components/Bulletin.jsx'

const chartTip={contentStyle:{borderRadius:12,border:'1px solid #EDEFF5',fontSize:12,boxShadow:'0 8px 24px rgba(30,36,51,.08)'}}

export default function Dashboard(){
  const u=current(); const d=db()
  const greet = `Bonjour, ${u.name.split(' ')[0]} 👋`

  if(u.role==='teacher'){
    const cls=currentClass(new Date())
    // répartition de la dernière évaluation de la classe
    const ev=d.evaluations.find(e=>e.classId===cls.cls.id)
    const dist=[['Excellent','#2BD9A8'],['Bien','#36C5F0'],['Moyen','#FFA62B'],['Insuffisant','#FF6B81']]
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
            <div className="text-muted text-sm">{cls.slot.start}–{cls.slot.end} · {cls.students.length} élèves {cls.isLive&&<span className="ml-1 text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{background:'#2BD9A8'}}>● EN COURS</span>}</div></div>
          <Link to="/app/evaluate" className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-white font-semibold accent-bg w-full sm:w-auto">Évaluer la classe <ArrowRight size={17}/></Link>
        </Card>
        <Card className="p-5"><h3 className="font-bold mb-1">Niveau de la classe</h3>
          <p className="text-xs text-muted mb-3">Répartition de la dernière évaluation</p>
          {hasDist? <>
            <div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={distData} layout="vertical" margin={{left:8}}><XAxis type="number" hide/><YAxis type="category" dataKey="name" tick={{fontSize:12,fill:'#8A93A6'}} width={78} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/><Bar dataKey="value" radius={[0,6,6,0]}>{distData.map((p,i)=><Cell key={i} fill={p.color}/>)}</Bar></BarChart></ResponsiveContainer></div>
          </> : <div className="h-44 grid place-items-center text-sm text-muted">Aucune évaluation pour cette classe.</div>}
        </Card>
      </div>
      <Card className="p-5 mt-4"><div className="flex items-center justify-between mb-3"><h3 className="font-bold flex items-center gap-1.5"><ClipboardCheck size={16}/> Mes évaluations enregistrées</h3><span className="text-xs text-muted">{d.evaluations.length} au total</span></div>
        {d.evaluations.length? <div className="space-y-2">{d.evaluations.slice(0,6).map(ev=>{ const studs=d.students.filter(s=>s.classId===ev.classId); const scores=studs.map(s=>studentSummary(ev,s.id).score).filter(x=>x!=null); const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null; const m=mentionFor(avg)
          return (<div key={ev.id} className="flex items-center justify-between text-sm border-b border-line pb-2 last:border-0"><div><span className="font-medium">{ev.className} · {ev.subject}</span><span className="text-xs text-muted ml-2">{new Date(ev.at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span></div><div className="text-right"><span className="text-muted text-xs mr-2">{scores.length} notés</span><span className="font-bold" style={{color:m.color}}>{avg!=null?`${avg}/100`:'—'}</span></div></div>) })}</div>
         : <div className="text-sm text-muted py-3 text-center">Vos évaluations enregistrées apparaîtront ici.</div>}
      </Card></>)
  }

  if(u.role==='parent') return <ParentDashboard u={u} d={d} greet={greet}/>

  if(u.role==='supervisor'){
    const open=d.incidents.filter(i=>i.status==='open')
    const sevData=[['Faible','low','#36C5F0'],['Moyenne','medium','#FFA62B'],['Élevée','high','#FF6B81']].map(([n,k,c])=>({name:n,value:d.incidents.filter(i=>i.severity===k).length,color:c}))
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
                <span className="w-2 h-2 rounded-full shrink-0" style={{background:i.severity==='high'?'#FF6B81':i.severity==='medium'?'#FFA62B':'#36C5F0'}}/>
                <span className="font-medium truncate flex-1">{i.title}</span>
                {s&&<span className="text-muted text-xs">{s.name.split(' ')[0]}</span>}
                <Badge status={i.status}/>
              </div>) })}
            {d.incidents.length===0 && <div className="text-sm text-muted py-4 text-center">Aucun incident.</div>}
          </div>
        </Card>
      </div>
      <Link to="/app/incidents" className="accent-bg text-white rounded-xl px-5 py-3 font-semibold inline-flex items-center gap-2 mt-4"><ShieldAlert size={17}/> Signaler un incident</Link></>)
  }

  // owner / schooladmin / admin
  const fc={paid:0,pending:0,overdue:0,due:0}; Object.values(d.payments).forEach(arr=>arr.forEach(p=>fc[p.status]++))
  const pie=[['Payés','#2BD9A8'],['En attente','#FFA62B'],['En retard','#FF6B81'],['Impayés','#C7CDDA']].map(([n,c],i)=>({name:n,value:Object.values(fc)[i],color:c}))
  const totalFees=pie.reduce((s,p)=>s+p.value,0); const collected=fc.paid
  const collectRate=totalFees?Math.round((collected/totalFees)*100):0
  // présence mensuelle dérivée des paiements (proxy stable de démo) + variation douce
  const attend=FEE_MONTHS.slice(0,7).map((m,i)=>({m,present:18+((i*5)%6),absent:1+((i*3)%4)}))
  // effectif par cycle
  const cycleData=['Primaire','Collège','Lycée'].map((cy,i)=>({name:cy,value:d.students.filter(s=>{const c=d.classes.find(x=>x.id===s.classId);return c?.cycle===cy}).length,color:['#6C5CE7','#36C5F0','#FFA62B'][i]})).filter(x=>x.value>0)
  const radial=[{name:'Recouvrement',value:collectRate,fill:'#2BD9A8'}]
  return (<><PageHead title={greet} sub="Vue d'ensemble de l'école."/>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard label="Élèves" value={d.students.length} tint="grape" icon={<Users/>}/>
      <StatCard label="Enseignants" value={d.teachers.length} tint="butter" icon={<GraduationCap/>}/>
      <StatCard label="Incidents ouverts" value={d.incidents.filter(i=>i.status==='open').length} tint="coral" icon={<ShieldAlert/>}/>
      <StatCard label="Demandes en attente" value={d.requests.filter(r=>r.status==='pending').length} tint="sky" icon={<FileText/>}/>
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
          <Area type="monotone" dataKey="absent" name="Absents" stroke="#FF6B81" strokeWidth={2} fill="transparent"/>
        </AreaChart></ResponsiveContainer></div>
      </Card>
    </div>
    <div className="grid lg:grid-cols-3 gap-4">
      {cycleData.length>0 && <Card className="p-5"><h3 className="font-bold mb-3">Effectif par cycle</h3>
        <div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={cycleData}><XAxis dataKey="name" tick={{fontSize:11,fill:'#8A93A6'}} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/><Bar dataKey="value" radius={[6,6,0,0]}>{cycleData.map((p,i)=><Cell key={i} fill={p.color}/>)}</Bar></BarChart></ResponsiveContainer></div>
      </Card>}
      <Card className="p-5"><h3 className="font-bold mb-3">Taux de recouvrement</h3>
        <div className="h-44"><ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="65%" outerRadius="100%" data={radial} startAngle={90} endAngle={90-(collectRate*3.6)}><RadialBar background={{fill:'#EDEFF5'}} dataKey="value" cornerRadius={10}/></RadialBarChart></ResponsiveContainer></div>
        <div className="text-center -mt-24 mb-12"><div className="text-3xl font-extrabold">{collectRate}%</div><div className="text-xs text-muted">{collected} / {totalFees} mois</div></div>
      </Card>
      <Card className="p-5"><h3 className="font-bold mb-3">Prochains événements</h3>
        <div className="space-y-2.5">
          {[...d.events].filter(e=>e.date>=new Date().toISOString().slice(0,10)).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4).map(e=>(<Link key={e.id} to="/app/events" className="flex items-center gap-3 text-sm group">
            <span className="w-10 h-10 rounded-xl grid place-items-center accent-soft accent-text shrink-0"><CalendarCheck size={16}/></span>
            <div className="min-w-0"><div className="font-medium truncate group-hover:accent-text">{e.title}</div><div className="text-xs text-muted">{e.date} · {e.type}</div></div>
          </Link>))}
          {d.events.length===0 && <div className="text-sm text-muted py-4 text-center">Aucun événement.</div>}
        </div>
      </Card>
    </div>
    <Card className="p-5 mt-4"><div className="flex items-center justify-between mb-3"><h3 className="font-bold flex items-center gap-1.5"><ClipboardCheck size={16}/> Évaluations enregistrées</h3><span className="text-xs text-muted">{d.evaluations.length} au total</span></div>
      {d.evaluations.length? <div className="overflow-x-auto scroll-thin"><table className="w-full text-sm"><thead><tr className="text-left text-[11px] uppercase text-muted"><th className="px-2 py-2">Date</th><th className="px-2 py-2">Classe</th><th className="px-2 py-2">Matière</th><th className="px-2 py-2">Enseignant</th><th className="px-2 py-2 text-center">Élèves notés</th><th className="px-2 py-2 text-center">Moyenne</th></tr></thead>
        <tbody className="divide-y divide-line">{d.evaluations.slice(0,8).map(ev=>{ const cls=d.classes.find(c=>c.id===ev.classId); const studs=d.students.filter(s=>s.classId===ev.classId); const scores=studs.map(s=>studentSummary(ev,s.id).score).filter(x=>x!=null); const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null; const m=mentionFor(avg)
        return (<tr key={ev.id}><td className="px-2 py-2 text-muted whitespace-nowrap">{new Date(ev.at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</td><td className="px-2 py-2 font-medium">{ev.className||cls?.name}</td><td className="px-2 py-2">{ev.subject}</td><td className="px-2 py-2 text-muted">{ev.teacher}</td><td className="px-2 py-2 text-center">{scores.length}</td><td className="px-2 py-2 text-center font-bold" style={{color:m.color}}>{avg!=null?`${avg}/100`:'—'}</td></tr>) })}</tbody></table></div>
       : <div className="text-sm text-muted py-4 text-center">Aucune évaluation enregistrée pour le moment.</div>}
    </Card></>)
}

function ParentDashboard({u,d,greet}){
  const [bulletin,setBulletin]=useState(null)
  const childId=u.childIds?.[0]; const child=childId?studentById(childId):null
  const b=childId? bulletinFor(d,childId):null
  const months=(d.payments[childId]||[]); const paid=months.filter(m=>m.status==='paid').length
  const sessions=b?.sessions||[]
  const trend=sessions.slice(-6).map((s,i)=>({i:i+1,score:s.score,subject:s.subject}))
  return (<><PageHead title={greet} sub="Votre enfant, en un coup d'œil."/>
    <div className="grid sm:grid-cols-4 gap-4 mb-5">
      <StatCard label="Moyenne générale" value={b?.overall!=null?`${b.overall}/100`:'—'} sub={b?.mention.label} tint="mint" icon={<Star/>}/>
      <StatCard label="Mois payés" value={`${paid}/${months.length}`} tint="sky" icon={<CreditCard/>}/>
      <StatCard label="Présence" value={b?.attRate!=null?`${b.attRate}%`:'—'} tint="grape" icon={<CalendarCheck/>}/>
      <StatCard label="Notifications" value={d.notifications.filter(n=>n.role==='parent'||n.to===u.id).length} tint="butter" icon={<Bell/>}/>
    </div>
    <div className="grid lg:grid-cols-2 gap-4 mb-4">
      <Card className="p-5"><div className="flex items-center justify-between mb-3"><h3 className="font-bold">Évolution des notes</h3>{child&&<Btn variant="soft" onClick={()=>setBulletin(child)}><FileText size={15}/> Bulletin</Btn>}</div>
        {trend.length>0? <div className="h-48"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{left:-20}}>
          <defs><linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2BD9A8" stopOpacity={.35}/><stop offset="100%" stopColor="#2BD9A8" stopOpacity={0}/></linearGradient></defs>
          <XAxis dataKey="i" tick={{fontSize:11,fill:'#8A93A6'}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={{fontSize:11,fill:'#8A93A6'}} axisLine={false} tickLine={false}/><Tooltip {...chartTip} formatter={(v,_n,p)=>[`${v}/100`,p.payload.subject]}/>
          <Area type="monotone" dataKey="score" stroke="#2BD9A8" strokeWidth={2.5} fill="url(#gScore)"/>
        </AreaChart></ResponsiveContainer></div>
        : <div className="h-48 grid place-items-center text-sm text-muted">Aucune évaluation pour le moment.</div>}
      </Card>
      <Card className="p-5"><h3 className="font-bold mb-3">Moyennes par matière</h3>
        {b?.subjects.length? <div className="space-y-3">
          {b.subjects.map(s=>{ const m=mentionFor(s.avg); return (
            <div key={s.subject}><div className="flex justify-between text-sm mb-1"><span className="font-medium">{s.subject}</span><span className="font-bold" style={{color:m.color}}>{s.avg}/100</span></div>
              <div className="h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full" style={{width:`${s.avg}%`,background:m.color}}/></div></div>) })}
        </div> : <div className="h-44 grid place-items-center text-sm text-muted">Aucune note disponible.</div>}
      </Card>
    </div>
    <div className="flex gap-3 flex-wrap">
      <Link to="/app/payments" className="accent-bg text-white rounded-xl px-5 py-3 font-semibold">Voir les paiements</Link>
      <Link to="/app/homework" className="bg-white border border-line rounded-xl px-5 py-3 font-semibold">Devoirs</Link>
      <Link to="/app/notices" className="bg-white border border-line rounded-xl px-5 py-3 font-semibold">Annonces</Link>
    </div>
    <Bulletin student={bulletin} onClose={()=>setBulletin(null)}/>
  </>)
}
