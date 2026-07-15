import { useState, useMemo } from 'react'
import { db, mutate, uid } from '@core/db.js'
import { current } from '@core/auth.js'
import { ROLE } from '@core/theme.js'
import { notify } from '@core/notify.js'
import { PageHead, Card, StatCard, SectionCard, Avatar, Btn, Modal, Field, Input, Select, Textarea, Tabs, EmptyState, SearchInput, STATUS } from '../components/ui.jsx'
import { BriefcaseBusiness, Clock, UserX, Plane, Save, Download, ChevronLeft, ChevronRight, Check, X, Plus, TrendingUp, AlertTriangle, CalendarRange } from 'lucide-react'
import { SoftArea } from '../components/charts.jsx'
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

/* ── Personnel : le module RH de présence, propriété de la Direction ────── */
const ST={present:['Présent',STATUS.ok],late:['Retard',STATUS.warn],absent:['Absent',STATUS.danger],conge:['Congé','#8B5CF6']}
const NEXT={present:'late',late:'absent',absent:'conge',conge:'present'}
const LEAVE_TYPES={annuel:'Congé annuel',maladie:'Maladie',exceptionnel:'Exceptionnel',permission:'Permission (heures)'}
const QUOTA=30 // jours de congé annuel / an
import { isoOf } from '@core/clock.js'

function staffList(d){
  return [
    ...d.teachers.map(t=>({id:t.id,name:t.name,sub:`${t.designation||'Enseignant'} · ${t.subject||''}`})),
    ...d.users.filter(u=>['admin','supervisor'].includes(u.role)).map(u=>({id:u.id,name:u.name,sub:u.position||ROLE[u.role].label})),
  ]
}
// jours ouvrés (lun–ven) d'une plage
function workdays(from,to){
  try{ return eachDayOfInterval({start:new Date(from),end:new Date(to)}).filter(x=>!isWeekend(x)) }catch{ return [] }
}

export default function Staff(){
  const [tab,setTab]=useState('jour')
  const [,force]=useState(0); const refresh=()=>force(x=>x+1)
  const d=db(); const staff=staffList(d)
  return (<>
    <PageHead title="Personnel" sub="Présence, congés et fiabilité de l'équipe — le quotidien RH de l'école."
      action={<Tabs tabs={[{value:'jour',label:'Aujourd’hui'},{value:'mois',label:'Mois'},{value:'conges',label:'Congés',count:(d.staffLeaves||[]).filter(l=>l.status==='pending').length||undefined},{value:'analyse',label:'Analyse'}]} value={tab} onChange={setTab}/>}/>
    {tab==='jour'    && <DayTab d={d} staff={staff} refresh={refresh}/>}
    {tab==='mois'    && <MonthTab d={d} staff={staff}/>}
    {tab==='conges'  && <LeavesTab d={d} staff={staff} refresh={refresh}/>}
    {tab==='analyse' && <AnalyseTab d={d} staff={staff}/>}
  </>)
}

/* ── 1) Aujourd'hui : l'appel quotidien ── */
function DayTab({ d, staff, refresh }){
  const today=isoOf(new Date())
  const sa=d.staffAttendance||{}
  const [marks,setMarks]=useState(()=>({...(sa[today]||Object.fromEntries(staff.map(x=>[x.id,'present'])))}))
  const counts=Object.values(marks).reduce((a,v)=>{a[v]=(a[v]||0)+1;return a},{present:0,late:0,absent:0,conge:0})
  const cutoff=isoOf(new Date(Date.now()-30*86400000))
  const hist={}
  for(const iso in sa){ if(iso<cutoff) continue
    for(const [id,st] of Object.entries(sa[iso])){ const h=hist[id]=hist[id]||{absent:0,late:0,conge:0}; if(h[st]!=null)h[st]++ } }
  const save=()=>{ mutate(db=>{ db.staffAttendance=db.staffAttendance||{}; db.staffAttendance[today]={...marks} })
    toast.success('Présence du personnel enregistrée'); refresh() }
  const dayLabel=format(new Date(),'EEEE d MMMM',{locale:fr})
  // Chaque tuile s'ouvre : derrière « 2 absents » il y a des noms.
  const [tile,setTile]=useState(null) // present | late | absent | conge
  return (<>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard tint="mint"   icon={<BriefcaseBusiness size={20}/>} value={counts.present} label="Présents" sub={dayLabel} onClick={()=>setTile('present')}/>
      <StatCard tint="butter" icon={<Clock size={20}/>}             value={counts.late}    label="Retards" onClick={()=>setTile('late')}/>
      <StatCard tint="coral"  icon={<UserX size={20}/>}             value={counts.absent}  label="Absents" onClick={()=>setTile('absent')}/>
      <StatCard tint="grape"  icon={<Plane size={20}/>}             value={counts.conge}   label="En congé" onClick={()=>setTile('conge')}/>
    </div>

    {tile && (()=>{ const [lbl,col]=ST[tile]; const rows=staff.filter(x=>(marks[x.id]||'present')===tile)
      return (
      <Modal open onClose={()=>setTile(null)} title={`${lbl} · ${dayLabel}`} size="xl"
        footer={<Btn variant="ghost" onClick={()=>setTile(null)}>Fermer</Btn>}>
        {rows.length===0 ? <EmptyState title={`Personne n'est « ${lbl.toLowerCase()} »`} sub="Rien à afficher pour ce statut aujourd'hui."/>
        : <div className="space-y-1.5">
          {rows.map(x=>{ const h=hist[x.id]
            return (
            <div key={x.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
              <Avatar name={x.name} seed={x.id} size={34}/>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{x.name}</span>
                <span className="block text-[12px] text-muted truncate">{x.sub}{h?` · 30 j : ${h.absent} abs · ${h.late} ret · ${h.conge} congés`:''}</span></span>
              <span className="text-[12px] font-bold px-3 py-1.5 rounded-full" style={{background:col+'1E',color:col}}>{lbl}</span>
            </div>)})}
        </div>}
      </Modal>) })()}
    <ClockBoard d={d} staff={staff}/>
    <SectionCard icon={<BriefcaseBusiness size={16}/>} tint="brand" title={`Appel du personnel · ${dayLabel}`} className="mt-4"
      sub="Touchez un statut pour le changer : présent → retard → absent → congé"
      action={<Btn onClick={save}><Save size={15}/> Enregistrer</Btn>} bodyClass="p-3">
      <div className="grid sm:grid-cols-2 gap-2">
        {staff.map(x=>{ const st=marks[x.id]||'present'; const [lbl,col]=ST[st]; const h=hist[x.id]
          return (
          <div key={x.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-line hover:bg-canvas">
            <Avatar name={x.name} seed={x.id} size={36}/>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold truncate leading-tight">{x.name}</span>
              <span className="block text-[12px] text-muted truncate">{x.sub}{h?` · 30 j : ${h.absent} abs · ${h.late} ret · ${h.conge} congés`:''}</span>
            </span>
            <button onClick={()=>setMarks(m=>({...m,[x.id]:NEXT[st]}))}
              className="text-[12px] font-bold px-3 py-1.5 rounded-full transition" style={{background:col+'1E',color:col}}>{lbl}</button>
          </div>) })}
      </div>
    </SectionCard>
  </>)
}

/* ── Badgeuse du jour : qui est dans l'école, en ce moment ── */
function ClockBoard({ d, staff }){
  const today=isoOf(new Date())
  const clk=(d.staffClock||{})[today]||{}
  const inside=staff.filter(x=>clk[x.id]&&!clk[x.id].out)
  const done=staff.filter(x=>clk[x.id]&&clk[x.id].out)
  const missing=staff.filter(x=>!clk[x.id])
  return (
    <SectionCard icon={<Clock size={16}/>} tint="mint" title={`Badgeuse — en ce moment`}
      sub={`${inside.length} dans l'école · ${done.length} journée(s) terminée(s) · ${missing.length} non pointé(s)`} bodyClass="p-3">
      <div className="flex flex-wrap gap-2">
        {staff.map(x=>{ const c=clk[x.id]
          const state=!c?['non pointé',STATUS.neutral]:c.out?[`${c.in} → ${c.out}`,'#8B5CF6']:[`arrivé ${c.in}`,c.in>'08:05'?STATUS.warn:STATUS.ok]
          return (
          <span key={x.id} className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-line bg-white text-sm">
            <Avatar name={x.name} seed={x.id} size={26}/>
            <span className="font-semibold">{x.name.split(' ')[0]}</span>
            <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{background:state[1]+'1E',color:state[1]}}>
              {c&&!c.out&&<span className="inline-block w-1.5 h-1.5 rounded-full mr-1 animate-pulse" style={{background:state[1]}}/>}{state[0]}</span>
          </span>)})}
      </div>
    </SectionCard>
  )
}

/* ── 2) Mois : la grille mensuelle + export CSV ── */
function MonthTab({ d, staff }){
  const [month,setMonth]=useState(()=>startOfMonth(new Date()))
  const sa=d.staffAttendance||{}
  const days=eachDayOfInterval({start:startOfMonth(month),end:endOfMonth(month)}).filter(x=>!isWeekend(x)&&x<=new Date())
  const rows=staff.map(x=>{
    const c={present:0,late:0,absent:0,conge:0}
    const cells=days.map(day=>{ const st=(sa[isoOf(day)]||{})[x.id]||null; if(st&&c[st]!=null)c[st]++; return st })
    const total=c.present+c.late+c.absent+c.conge
    return {...x,cells,c,rate:total?Math.round((c.present+c.late)/total*100):null}
  })
  const monthLabel=format(month,'MMMM yyyy',{locale:fr})
  const exportCSV=()=>{
    const head=['Employé','Fonction','Jours travaillés','Présents','Retards','Absents','Congés','Taux de présence']
    const lines=rows.map(r=>[r.name,r.sub.replace(/;/g,','),r.cells.filter(Boolean).length,r.c.present,r.c.late,r.c.absent,r.c.conge,r.rate!=null?r.rate+'%':'—'])
    const csv=[head,...lines].map(l=>l.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n')
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}))
    a.download=`presence-personnel-${format(month,'yyyy-MM')}.csv`; a.click(); URL.revokeObjectURL(a.href)
    toast.success(`Rapport ${monthLabel} exporté`)
  }
  return (
    <SectionCard icon={<CalendarRange size={16}/>} tint="sky" title={`Présence mensuelle · ${monthLabel}`}
      sub="Jours ouvrés écoulés — chaque case est un jour"
      action={<div className="flex items-center gap-2">
        <Btn variant="ghost" size="sm" onClick={()=>setMonth(m=>addMonths(m,-1))} aria-label="Mois précédent"><ChevronLeft size={15}/></Btn>
        <Btn variant="ghost" size="sm" onClick={()=>setMonth(m=>addMonths(m,1))} disabled={startOfMonth(addMonths(month,1))>new Date()} aria-label="Mois suivant"><ChevronRight size={15}/></Btn>
        <Btn variant="soft" size="sm" onClick={exportCSV}><Download size={14}/> Export CSV</Btn>
      </div>} bodyClass="p-0">
      {days.length===0 ? <EmptyState title="Aucun jour ouvré écoulé" sub="Ce mois n'a pas encore commencé."/> : (
      <div className="overflow-x-auto scroll-thin"><table className="w-full text-sm">
        <thead><tr className="text-left text-[12px] uppercase tracking-wide text-muted bg-canvas">
          <th className="px-4 py-3 font-semibold">Employé</th>
          <th className="px-2 py-3 font-semibold">Jours</th>
          {['Prés.','Ret.','Abs.','Congés','Taux'].map(h=><th key={h} className="px-2 py-3 font-semibold text-center">{h}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-line">
          {rows.map(r=>(
            <tr key={r.id} className="hover:bg-canvas">
              <td className="px-4 py-2.5"><span className="flex items-center gap-2.5 min-w-[170px]"><Avatar name={r.name} seed={r.id} size={30}/>
                <span className="min-w-0"><span className="block font-semibold truncate leading-tight">{r.name}</span><span className="block text-[11px] text-muted truncate">{r.sub}</span></span></span></td>
              <td className="px-2 py-2.5"><span className="flex gap-[3px] flex-wrap max-w-[340px]">
                {r.cells.map((st,i)=>{ const col=st?ST[st][1]:'#E2E8F0'
                  return <i key={i} title={`${format(days[i],'EEE d MMM',{locale:fr})} · ${st?ST[st][0]:'non pointé'}`}
                    className="w-3 h-3 rounded-[4px] inline-block" style={{background:st?col:'#EEF1F6',outline:st?'none':'1px dashed #D8DEE9'}}/>})}
              </span></td>
              <td className="px-2 py-2.5 text-center font-bold" style={{color:STATUS.ok}}>{r.c.present}</td>
              <td className="px-2 py-2.5 text-center font-bold" style={{color:STATUS.warn}}>{r.c.late}</td>
              <td className="px-2 py-2.5 text-center font-bold" style={{color:STATUS.danger}}>{r.c.absent}</td>
              <td className="px-2 py-2.5 text-center font-bold" style={{color:'#8B5CF6'}}>{r.c.conge}</td>
              <td className="px-2 py-2.5 text-center font-extrabold">{r.rate!=null?`${r.rate}%`:'—'}</td>
            </tr>))}
        </tbody>
      </table>
      <div className="flex items-center gap-4 px-4 py-3 border-t border-line text-[12px] text-muted flex-wrap">
        {Object.entries(ST).map(([k,[lbl,col]])=><span key={k} className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-[4px]" style={{background:col}}/>{lbl}</span>)}
        <span className="inline-flex items-center gap-1.5"><i className="w-3 h-3 rounded-[4px]" style={{background:'#EEF1F6',outline:'1px dashed #D8DEE9'}}/>non pointé</span>
      </div></div>)}
    </SectionCard>
  )
}

/* ── 3) Congés : demandes, approbation, soldes ── */
const BLANK_LV={staffId:'',type:'annuel',from:'',to:'',reason:''}
function LeavesTab({ d, staff, refresh }){
  const [open,setOpen]=useState(false); const [f,setF]=useState(BLANK_LV)
  const leaves=[...(d.staffLeaves||[])].sort((a,b)=>b.at-a.at)
  const pending=leaves.filter(l=>l.status==='pending')
  const year=new Date().getFullYear()
  const usedAnnual=id=>leaves.filter(l=>l.staffId===id&&l.status==='approved'&&l.type==='annuel'&&new Date(l.from).getFullYear()===year)
    .reduce((n,l)=>n+l.days,0)
  const nameOf=id=>staff.find(x=>x.id===id)?.name||id

  const applyLeave=(lv)=>{ // congé approuvé → la présence se remplit toute seule
    mutate(db=>{ db.staffAttendance=db.staffAttendance||{}
      workdays(lv.from,lv.to).forEach(day=>{ const k=isoOf(day)
        db.staffAttendance[k]=db.staffAttendance[k]||{}; db.staffAttendance[k][lv.staffId]='conge' }) })
  }
  // Accorder un congé est une prérogative de la DIRECTION : un admin de bureau
  // pouvait approuver les congés des enseignants — et surtout LE SIEN, déposé
  // depuis sa propre badgeuse. Deux verrous : le rôle, et « pas soi-même ».
  const me=current()
  const isDirection=me.role==='schooladmin'
  const myStaffId=me.teacherId||me.id
  const canDecide=lv=> isDirection && lv.staffId!==myStaffId

  const decide=(lv,status)=>{
    if(!canDecide(lv)) return toast.error(lv.staffId===myStaffId
      ? "Vous ne pouvez pas décider de votre propre congé"
      : "Seule la Direction peut accorder un congé")
    mutate(db=>{ const x=(db.staffLeaves||[]).find(y=>y.id===lv.id); if(x&&x.status==='pending'){ x.status=status; x.by=me.name } })
    if(status==='approved'&&lv.type!=='permission') applyLeave(lv)   // une permission de quelques heures ne remplit pas la journée
    notify({to:lv.staffId,kind:'info',actor:'Direction',title:status==='approved'?'Congé approuvé':'Congé refusé',
      body:`${LEAVE_TYPES[lv.type]} du ${lv.from} au ${lv.to} : ${status==='approved'?'accordé. Bon repos !':'refusé — voir la direction.'}`})
    toast.success(status==='approved'?`Congé de ${nameOf(lv.staffId)} approuvé — présence remplie automatiquement`:'Demande refusée')
    refresh()
  }
  const add=()=>{
    if(!isDirection) return toast.error("Seule la Direction peut enregistrer un congé")
    if(!f.staffId||!f.from||!f.to) return toast.error('Employé et dates requis')
    if(f.staffId===myStaffId) return toast.error("Déposez votre propre congé depuis « Mon pointage » : la Direction le validera")
    if(f.to<f.from) return toast.error('La date de fin précède le début')
    const days=workdays(f.from,f.to).length
    if(days===0) return toast.error('La plage ne contient aucun jour ouvré')
    const lv={id:uid('lv'),staffId:f.staffId,type:f.type,from:f.from,to:f.to,days,reason:f.reason.trim(),status:'approved',at:Date.now(),by:me.name}
    mutate(db=>{ db.staffLeaves=db.staffLeaves||[]; db.staffLeaves.push(lv) })
    applyLeave(lv)
    toast.success(`Congé enregistré (${days} j ouvrés) — présence remplie automatiquement`)
    setOpen(false); setF(BLANK_LV); refresh()
  }
  const stLv={approved:['Approuvé',STATUS.ok],pending:['En attente',STATUS.warn],rejected:['Refusé',STATUS.danger]}
  return (<>
    <div className="grid lg:grid-cols-[1fr_320px] gap-4">
      <div className="space-y-4">
        <SectionCard icon={<AlertTriangle size={16}/>} tint="butter" title="Demandes à traiter" sub="Approuver remplit automatiquement la présence en « congé »" bodyClass="p-3">
          {pending.length===0 ? <EmptyState title="Aucune demande en attente" sub="Les nouvelles demandes de congé apparaîtront ici."/>
          : pending.map(lv=>(
            <div key={lv.id} className="flex items-center gap-3 p-3 rounded-xl border border-line">
              <Avatar name={nameOf(lv.staffId)} seed={lv.staffId} size={38}/>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{nameOf(lv.staffId)} · {LEAVE_TYPES[lv.type]}</span>
                <span className="block text-xs text-muted">{lv.type==='permission'?`${lv.from}${lv.hours?` · ${lv.hours} h`:''}`:`${lv.from} → ${lv.to} · ${lv.days} j ouvrés`}{lv.reason?` · « ${lv.reason} »`:''}</span>
              </span>
              {canDecide(lv)
                ? <><Btn size="sm" onClick={()=>decide(lv,'approved')}><Check size={14}/> Approuver</Btn>
                    <Btn size="sm" variant="danger" onClick={()=>decide(lv,'rejected')}><X size={14}/></Btn></>
                : <span className="text-[12px] font-semibold text-muted text-right shrink-0">
                    {lv.staffId===myStaffId ? 'Votre demande —\nla Direction décide' : 'Décision réservée\nà la Direction'}
                  </span>}
            </div>))}
        </SectionCard>
        <SectionCard icon={<Plane size={16}/>} tint="grape" title="Historique des congés"
          action={isDirection&&<Btn size="sm" onClick={()=>{setF(BLANK_LV);setOpen(true)}}><Plus size={14}/> Enregistrer un congé</Btn>} bodyClass="p-3">
          {leaves.filter(l=>l.status!=='pending').length===0 ? <EmptyState title="Aucun congé enregistré"/>
          : leaves.filter(l=>l.status!=='pending').map(lv=>{ const [lbl,col]=stLv[lv.status]
            return (
            <div key={lv.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-canvas">
              <Avatar name={nameOf(lv.staffId)} seed={lv.staffId} size={30}/>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{nameOf(lv.staffId)} · {LEAVE_TYPES[lv.type]}</span>
                <span className="block text-[12px] text-muted">{lv.from} → {lv.to} · {lv.days} j</span></span>
              <span className="text-[12px] font-bold px-2.5 py-1 rounded-full" style={{background:col+'1E',color:col}}>{lbl}</span>
            </div>)})}
        </SectionCard>
      </div>
      <SectionCard icon={<BriefcaseBusiness size={16}/>} tint="mint" title="Soldes de congé annuel" sub={`Quota ${QUOTA} j / an · ${year}`} bodyClass="p-4">
        <div className="space-y-3">
          {staff.map(x=>{ const used=usedAnnual(x.id); const left=Math.max(0,QUOTA-used)
            const col=left>10?STATUS.ok:left>4?STATUS.warn:STATUS.danger
            return (
            <div key={x.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-semibold truncate">{x.name}</span>
                <span className="font-extrabold" style={{color:col}}>{left} j</span></div>
              <div className="h-2 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full" style={{width:`${(left/QUOTA)*100}%`,background:col}}/></div>
            </div>)})}
        </div>
      </SectionCard>
    </div>

    <Modal open={open} onClose={()=>setOpen(false)} title="Enregistrer un congé"
      footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={add}>Enregistrer & remplir la présence</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Employé *"><Select value={f.staffId} onChange={e=>setF({...f,staffId:e.target.value})}><option value="">— choisir —</option>{staff.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>
        <Field label="Type"><Select value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{Object.entries(LEAVE_TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Du *"><Input type="date" value={f.from} onChange={e=>setF({...f,from:e.target.value})}/></Field>
        <Field label="Au *"><Input type="date" value={f.to} onChange={e=>setF({...f,to:e.target.value})}/></Field>
        <div className="sm:col-span-2"><Field label="Motif"><Textarea value={f.reason} onChange={e=>setF({...f,reason:e.target.value})} className="h-16" placeholder="Optionnel"/></Field></div>
      </div>
      <p className="text-xs text-muted mt-2">Les jours ouvrés de la plage seront automatiquement marqués « congé » dans la présence.</p>
    </Modal>
  </>)
}

/* ── 4) Analyse : tendance, fiabilité, alertes ── */
function AnalyseTab({ d, staff }){
  const sa=d.staffAttendance||{}
  const A=useMemo(()=>{
    const dates=Object.keys(sa).sort()
    const trend=dates.slice(-20).map(iso=>{ const rec=sa[iso]; let p=0,t=0
      Object.values(rec).forEach(st=>{ t++; if(st==='present'||st==='late')p++ })
      return {name:format(new Date(iso),'d MMM',{locale:fr}), taux:t?Math.round(p/t*100):100} })
    const cutoff=isoOf(new Date(Date.now()-30*86400000))
    const per={}
    for(const iso in sa){ if(iso<cutoff) continue
      for(const [id,st] of Object.entries(sa[iso])){ const h=per[id]=per[id]||{present:0,late:0,absent:0,conge:0,total:0}; if(h[st]!=null)h[st]++; h.total++ } }
    return {trend,per}
  },[d])
  const rows=staff.map(x=>{ const h=A.per[x.id]||{present:0,late:0,absent:0,conge:0,total:0}
    const rate=h.total?Math.round((h.present+h.late)/h.total*100):null
    return {...x,...h,rate} }).sort((a,b)=>(a.rate??101)-(b.rate??101))
  const alerts=rows.filter(x=>x.absent>=3)
  return (<>
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      <SectionCard icon={<TrendingUp size={16}/>} tint="mint" title="Taux de présence du personnel" sub="20 derniers jours pointés">
        <SoftArea data={A.trend} dataKey="taux" color={STATUS.ok} id="gStaff" unit="%" domain={[60,100]} height={224}/>
      </SectionCard>
      <SectionCard icon={<AlertTriangle size={16}/>} tint="coral" title="À surveiller" sub="3 absences ou plus sur 30 jours" bodyClass="p-3">
        {alerts.length===0 ? <EmptyState title="Aucune alerte" sub="Toute l'équipe est assidue ce mois-ci."/>
        : alerts.map(x=>(
          <div key={x.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
            <Avatar name={x.name} seed={x.id} size={34}/>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{x.name}</span>
              <span className="block text-[12px] text-muted">{x.absent} absences · {x.late} retards · 30 j</span></span>
            <span className="text-sm font-extrabold" style={{color:STATUS.danger}}>{x.rate}%</span>
          </div>))}
      </SectionCard>
    </div>
    <SectionCard icon={<BriefcaseBusiness size={16}/>} tint="sky" title="Fiabilité par employé" sub="Taux de présence (présent + retard) sur 30 jours" className="mt-4">
      <div className="space-y-3">
        {rows.map(x=>{ const col=x.rate==null?STATUS.neutral:x.rate>=95?STATUS.ok:x.rate>=88?STATUS.warn:STATUS.danger
          return (
          <div key={x.id} className="flex items-center gap-3">
            <Avatar name={x.name} seed={x.id} size={30}/>
            <span className="w-40 text-sm font-semibold truncate shrink-0">{x.name}</span>
            <div className="flex-1 h-2.5 rounded-full bg-canvas overflow-hidden"><div className="h-full rounded-full" style={{width:`${x.rate??0}%`,background:col}}/></div>
            <span className="w-12 text-right text-sm font-extrabold" style={{color:col}}>{x.rate!=null?`${x.rate}%`:'—'}</span>
            <span className="w-28 text-right text-[12px] text-muted">{x.absent} abs · {x.late} ret · {x.conge} congés</span>
          </div>)})}
      </div>
    </SectionCard>
  </>)
}
