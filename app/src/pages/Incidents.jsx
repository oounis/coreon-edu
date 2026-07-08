import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid, studentById } from '../db.js'
import { notify } from '../notify.js'
import { PageHead, Card, Btn, Modal, Field, Input, Select, Badge, IconTile, EmptyState } from '../components/ui.jsx'
import { ShieldAlert, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
const TYPES=['Bagarre','Santé','Comportement','Sécurité','Autre']
const SEV_TINT={low:'sky',medium:'butter',high:'coral'}
const SEV_FR={low:'Faible',medium:'Moyenne',high:'Élevée'}
export default function Incidents(){
  const u=current(); const canReport=['supervisor','admin','schooladmin'].includes(u.role)
  const canResolve=['admin','schooladmin'].includes(u.role)
  const [,force]=useState(0); const [open,setOpen]=useState(false)
  const [f,setF]=useState({type:'Bagarre',studentId:'',title:'',body:'',severity:'medium'})
  const d=db()
  const report=()=>{
    if(!f.title.trim())return
    const id=uid('inc'); const s=f.studentId?studentById(f.studentId):null
    mutate(db=>{ db.incidents.unshift({id,at:Date.now(),by:u.name,studentId:f.studentId||null,type:f.type,title:f.title.trim(),body:f.body.trim(),severity:f.severity,status:'open'}) })
    notify({role:'admin',kind:'incident',title:`Incident : ${f.type}`,body:`${u.name} a signalé : ${f.title}${s?` (${s.name})`:''}`})
    notify({role:'schooladmin',kind:'incident',title:`Incident : ${f.type}`,body:`${f.title}${s?` (${s.name})`:''}`})
    if(s?.parentId) notify({to:s.parentId,kind:'incident',title:'Note de l\'école concernant votre enfant',body:`${f.type} : ${f.title}`})
    toast.success('Incident signalé · personnes notifiées'); setOpen(false); setF({type:'Bagarre',studentId:'',title:'',body:'',severity:'medium'}); force(x=>x+1)
  }
  const resolve=(id)=>{ mutate(db=>{ const i=db.incidents.find(x=>x.id===id); if(i)i.status='resolved' }); toast.success('Marqué comme résolu'); force(x=>x+1) }
  return (<>
    <PageHead title="Incidents" sub="Signalez et suivez ce qui se passe à l'école." action={canReport&&<Btn onClick={()=>setOpen(true)}><Plus size={16}/> Signaler un incident</Btn>}/>
    <div className="space-y-3">
      {d.incidents.length? d.incidents.map(i=>{ const s=i.studentId?studentById(i.studentId):null; return (
        <Card key={i.id} className="p-4 flex items-start gap-3">
          <IconTile icon={<ShieldAlert size={18}/>} tint={SEV_TINT[i.severity]} size={40} radius="rounded-xl"/>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap"><b>{i.title}</b><span className="text-[11px] font-bold px-2 py-0.5 rounded-full accent-soft accent-text">{i.type}</span><Badge status={i.status}/></div>
            <div className="text-sm text-muted">{i.body}</div>
            <div className="text-[11px] text-muted mt-1">par {i.by}{s&&` · ${s.name}`} · {formatDistanceToNow(i.at,{addSuffix:true,locale:fr})}</div>
          </div>
          {canResolve&&i.status==='open'&&<Btn variant="soft" onClick={()=>resolve(i.id)}>Résoudre</Btn>}
        </Card>) }) : <Card><EmptyState icon={<ShieldAlert size={26}/>} title="Aucun incident" sub="Aucun incident signalé pour le moment."/></Card>}
    </div>
    <Modal open={open} onClose={()=>setOpen(false)} title="Signaler un incident" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={report}>Signaler & notifier</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{TYPES.map(t=><option key={t}>{t}</option>)}</Select></Field>
          <Field label="Gravité"><Select value={f.severity} onChange={e=>setF({...f,severity:e.target.value})}>{['low','medium','high'].map(s=><option key={s} value={s}>{SEV_FR[s]}</option>)}</Select></Field>
        </div>
        <Field label="Élève (facultatif)"><Select value={f.studentId} onChange={e=>setF({...f,studentId:e.target.value})}><option value="">— aucun —</option>{d.students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Titre"><Input value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="ex. Bagarre dans la cour / Élève malade"/></Field>
        <Field label="Détails"><Input value={f.body} onChange={e=>setF({...f,body:e.target.value})} placeholder="Ce qui s'est passé + mesure prise"/></Field>
      </div>
    </Modal>
  </>)
}
