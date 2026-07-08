import { useState, useEffect } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid } from '../db.js'
import { notify } from '../notify.js'
import { PageHead, Card, StatCard, SectionCard, Btn, Modal, Field, Input, Select, Textarea, EmptyState, Whale, STATUS } from '../components/ui.jsx'
import { LogIn, LogOut, Clock, CalendarCheck, Plane, Plus, Hourglass, Timer } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

/* ── Pointage : la badgeuse personnelle de chaque membre du personnel ────── */
const LEAVE_TYPES={annuel:'Congé annuel',maladie:'Maladie',exceptionnel:'Exceptionnel',permission:'Permission (heures)'}
const QUOTA=30, LATE='08:05'
const isoOf=d=>d.toISOString().slice(0,10)
const hm=d=>format(d,'HH:mm')
const toMin=t=>{ const [h,m]=String(t).split(':').map(Number); return h*60+m }
const fmtH=min=>`${Math.floor(min/60)} h ${String(min%60).padStart(2,'0')}`

export default function Pointage(){
  const u=current(); const d=db()
  const id=u.teacherId||u.id
  const [,force]=useState(0); const refresh=()=>force(x=>x+1)
  const [now,setNow]=useState(()=>new Date())
  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),30000); return ()=>clearInterval(t) },[])
  const today=isoOf(now)
  const clock=(d.staffClock||{})[today]?.[id]||null
  const working = clock&&clock.in&&!clock.out
  const elapsed = working ? toMin(hm(now))-toMin(clock.in) : (clock&&clock.out ? toMin(clock.out)-toMin(clock.in) : 0)

  const checkIn=()=>{
    const t=hm(new Date())
    mutate(db=>{ db.staffClock=db.staffClock||{}; db.staffClock[today]=db.staffClock[today]||{}
      db.staffClock[today][id]={in:t,out:null}
      db.staffAttendance=db.staffAttendance||{}; db.staffAttendance[today]=db.staffAttendance[today]||{}
      db.staffAttendance[today][id]= t>LATE ? 'late' : 'present' })
    toast.success(t>LATE?`Arrivée pointée à ${t} — retard enregistré`:`Bonne journée ! Arrivée pointée à ${t}`)
    refresh()
  }
  const checkOut=()=>{
    const t=hm(new Date())
    mutate(db=>{ const c=db.staffClock?.[today]?.[id]; if(c) c.out=t })
    toast.success(`Sortie pointée à ${t} — à demain !`); refresh()
  }

  // mon mois : jours, heures, retards
  const month=today.slice(0,7); let days=0, minutes=0, lates=0
  const history=[]
  Object.keys(d.staffClock||{}).sort().reverse().forEach(iso=>{
    const c=d.staffClock[iso]?.[id]; if(!c) return
    const mins=c.out?toMin(c.out)-toMin(c.in):null
    if(iso.startsWith(month)){ days++; if(mins)minutes+=mins; if(c.in>LATE)lates++ }
    if(history.length<10) history.push({iso,...c,mins})
  })
  const myLeaves=(d.staffLeaves||[]).filter(l=>l.staffId===id).sort((a,b)=>b.at-a.at)
  const year=now.getFullYear()
  const used=myLeaves.filter(l=>l.status==='approved'&&l.type==='annuel'&&new Date(l.from).getFullYear()===year).reduce((n,l)=>n+l.days,0)
  const stLv={approved:['Approuvé',STATUS.ok],pending:['En attente',STATUS.warn],rejected:['Refusé',STATUS.danger]}
  const [open,setOpen]=useState(false)

  return (<>
    <PageHead title="Mon pointage" sub="Votre badgeuse : arrivées, sorties, heures et demandes de congé."
      action={<Btn variant="soft" onClick={()=>setOpen(true)}><Plus size={15}/> Demander un congé</Btn>}/>

    <div className="grid lg:grid-cols-[380px_1fr] gap-4 mb-4">
      <Card className="p-6 text-center">
        <div className="floaty mx-auto w-fit mb-1"><Whale size={44} from="var(--accent)" to="var(--accent-2,var(--accent))"/></div>
        {!clock && <>
          <div className="text-lg font-extrabold">Prêt pour la journée ?</div>
          <p className="text-sm text-muted mt-1 capitalize">{format(now,'EEEE d MMMM · HH:mm',{locale:fr})}</p>
          <Btn size="lg" className="mt-4 w-full" onClick={checkIn}><LogIn size={17}/> Pointer l'arrivée</Btn>
          <p className="text-[11px] text-muted mt-2">Après {LATE}, l'arrivée est comptée en retard.</p></>}
        {working && <>
          <div className="text-lg font-extrabold">Dans l'école depuis {clock.in}</div>
          <div className="text-3xl font-extrabold accent-text mt-1 tabular-nums">{fmtH(elapsed)}</div>
          <p className="text-xs text-muted">temps de travail aujourd'hui</p>
          <Btn size="lg" variant="soft" className="mt-4 w-full" onClick={checkOut}><LogOut size={17}/> Pointer la sortie</Btn></>}
        {clock&&clock.out && <>
          <div className="text-lg font-extrabold">Journée terminée</div>
          <p className="text-sm text-muted mt-1">{clock.in} → {clock.out} · {fmtH(elapsed)}</p>
          <p className="text-xs text-muted mt-3">Merci pour aujourd'hui — à demain !</p></>}
      </Card>
      <div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard tint="mint"  icon={<CalendarCheck size={20}/>} value={days} label="Jours pointés" sub={format(now,'MMMM',{locale:fr})}/>
          <StatCard tint="sky"   icon={<Timer size={20}/>}        value={fmtH(minutes)} label="Heures travaillées"/>
          <StatCard tint="butter" icon={<Clock size={20}/>}       value={lates} label="Retards"/>
          <StatCard tint="grape" icon={<Plane size={20}/>}        value={`${Math.max(0,QUOTA-used)} j`} label="Congé annuel restant"/>
        </div>
        <SectionCard icon={<Hourglass size={16}/>} tint="sky" title="Mes derniers pointages" bodyClass="p-3">
          {history.length===0 ? <EmptyState title="Aucun pointage" sub="Votre historique apparaîtra ici dès votre première arrivée."/>
          : <div className="grid sm:grid-cols-2 gap-1.5">{history.map(h=>(
            <div key={h.iso} className="flex items-center justify-between px-3 py-2 rounded-xl border border-line text-sm">
              <span className="text-muted capitalize">{format(new Date(h.iso),'EEE d MMM',{locale:fr})}</span>
              <span className="font-semibold">{h.in} → {h.out||'—'}</span>
              <span className="font-bold" style={{color:h.in>LATE?STATUS.warn:STATUS.ok}}>{h.mins?fmtH(h.mins):'en cours'}</span>
            </div>))}</div>}
        </SectionCard>
      </div>
    </div>

    <SectionCard icon={<Plane size={16}/>} tint="grape" title="Mes demandes de congé & permissions" bodyClass="p-3">
      {myLeaves.length===0 ? <EmptyState title="Aucune demande" sub="Demandez un congé ou une permission — la Direction est notifiée immédiatement."/>
      : myLeaves.map(lv=>{ const [lbl,col]=stLv[lv.status]
        return (
        <div key={lv.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-canvas">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{LEAVE_TYPES[lv.type]}{lv.type==='permission'&&lv.hours?` · ${lv.hours} h`:''}</span>
            <span className="block text-[11px] text-muted">{lv.from===lv.to?lv.from:`${lv.from} → ${lv.to}`}{lv.reason?` · « ${lv.reason} »`:''}</span></span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{background:col+'1E',color:col}}>{lbl}</span>
        </div>)})}
    </SectionCard>

    <RequestModal open={open} onClose={()=>setOpen(false)} staffId={id} name={u.name} onDone={refresh}/>
  </>)
}

function RequestModal({ open, onClose, staffId, name, onDone }){
  const BLANK={type:'annuel',from:'',to:'',hours:2,reason:''}
  const [f,setF]=useState(BLANK)
  const perm=f.type==='permission'
  const submit=()=>{
    if(!f.from) return toast.error('Choisissez une date')
    const to=perm?f.from:(f.to||f.from)
    if(to<f.from) return toast.error('La date de fin précède le début')
    const days=perm?0:Math.max(1,Math.round((new Date(to)-new Date(f.from))/86400000)+1)
    mutate(db=>{ db.staffLeaves=db.staffLeaves||[]
      db.staffLeaves.push({id:uid('lv'),staffId,type:f.type,from:f.from,to,days:perm?0:days,hours:perm?Number(f.hours)||1:null,reason:f.reason.trim(),status:'pending',at:Date.now(),by:null}) })
    notify({role:'schooladmin',kind:'info',actor:name,title:'Nouvelle demande de congé',
      body:`${name} demande : ${LEAVE_TYPES[f.type]}${perm?` (${f.hours} h)`:''} · ${f.from}${!perm&&to!==f.from?` → ${to}`:''}.`,link:'/app/staff'})
    toast.success('Demande envoyée — la Direction a été notifiée')
    setF(BLANK); onClose(); onDone()
  }
  return (
    <Modal open={open} onClose={onClose} title="Demander un congé ou une permission"
      footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={submit}>Envoyer la demande</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Type"><Select value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{Object.entries(LEAVE_TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</Select></Field>
        {perm
          ? <Field label="Durée (heures)"><Input type="number" min="1" max="8" value={f.hours} onChange={e=>setF({...f,hours:e.target.value})}/></Field>
          : <span/>}
        <Field label={perm?'Date':'Du'}><Input type="date" value={f.from} onChange={e=>setF({...f,from:e.target.value})}/></Field>
        {!perm && <Field label="Au"><Input type="date" value={f.to} onChange={e=>setF({...f,to:e.target.value})}/></Field>}
        <div className="sm:col-span-2"><Field label="Motif"><Textarea value={f.reason} onChange={e=>setF({...f,reason:e.target.value})} className="h-16" placeholder="Optionnel — visible par la Direction"/></Field></div>
      </div>
    </Modal>
  )
}
