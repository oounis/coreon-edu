import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid, studentById } from '../db.js'
import { notify } from '../notify.js'
import { PageHead, Card, Btn, Modal, Field, Input, Select, Badge, Avatar } from '../components/ui.jsx'
import { studentColor } from '../data.js'
import { ShieldAlert, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
const TYPES=['Fight','Health','Behaviour','Safety','Other']
const SEV={low:'#36C5F0',medium:'#FFA62B',high:'#FF6B81'}
export default function Incidents(){
  const u=current(); const canReport=['supervisor','admin','schooladmin'].includes(u.role)
  const canResolve=['admin','schooladmin'].includes(u.role)
  const [,force]=useState(0); const [open,setOpen]=useState(false)
  const [f,setF]=useState({type:'Fight',studentId:'',title:'',body:'',severity:'medium'})
  const d=db()
  const report=()=>{
    if(!f.title.trim())return
    const id=uid('inc'); const s=f.studentId?studentById(f.studentId):null
    mutate(db=>{ db.incidents.unshift({id,at:Date.now(),by:u.name,studentId:f.studentId||null,type:f.type,title:f.title.trim(),body:f.body.trim(),severity:f.severity,status:'open'}) })
    notify({role:'admin',kind:'incident',title:`Incident: ${f.type}`,body:`${u.name} reported: ${f.title}${s?` (${s.name})`:''}`})
    notify({role:'schooladmin',kind:'incident',title:`Incident: ${f.type}`,body:`${f.title}${s?` (${s.name})`:''}`})
    if(s?.parentId) notify({to:s.parentId,kind:'incident',title:'School note about your child',body:`${f.type}: ${f.title}`})
    toast.success('Incident reported & people notified'); setOpen(false); setF({type:'Fight',studentId:'',title:'',body:'',severity:'medium'}); force(x=>x+1)
  }
  const resolve=(id)=>{ mutate(db=>{ const i=db.incidents.find(x=>x.id===id); if(i)i.status='resolved' }); toast.success('Marked resolved'); force(x=>x+1) }
  return (<>
    <PageHead title="Incidents" sub="Report and track what happens in school." action={canReport&&<Btn onClick={()=>setOpen(true)}><Plus size={16}/> Report incident</Btn>}/>
    <div className="space-y-3">
      {d.incidents.length? d.incidents.map(i=>{ const s=i.studentId?studentById(i.studentId):null; return (
        <Card key={i.id} className="p-4 flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0" style={{background:SEV[i.severity]}}><ShieldAlert size={18}/></span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap"><b>{i.title}</b><span className="text-[11px] font-bold px-2 py-0.5 rounded-full accent-soft accent-text">{i.type}</span><Badge status={i.status}/></div>
            <div className="text-sm text-muted">{i.body}</div>
            <div className="text-[11px] text-muted mt-1">by {i.by}{s&&` · ${s.name}`} · {formatDistanceToNow(i.at,{addSuffix:true})}</div>
          </div>
          {canResolve&&i.status==='open'&&<Btn variant="soft" onClick={()=>resolve(i.id)}>Resolve</Btn>}
        </Card>) }) : <Card className="p-10 text-center text-muted">No incidents reported.</Card>}
    </div>
    <Modal open={open} onClose={()=>setOpen(false)} title="Report an incident" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn><Btn onClick={report}>Report & notify</Btn></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{TYPES.map(t=><option key={t}>{t}</option>)}</Select></Field>
          <Field label="Severity"><Select value={f.severity} onChange={e=>setF({...f,severity:e.target.value})}>{['low','medium','high'].map(s=><option key={s} value={s}>{s}</option>)}</Select></Field>
        </div>
        <Field label="Student (optional)"><Select value={f.studentId} onChange={e=>setF({...f,studentId:e.target.value})}><option value="">— none —</option>{d.students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Title"><Input value={f.title} onChange={e=>setF({...f,title:e.target.value})} placeholder="e.g. Fight in the yard / Student felt sick"/></Field>
        <Field label="Details"><Input value={f.body} onChange={e=>setF({...f,body:e.target.value})} placeholder="What happened + action taken"/></Field>
      </div>
    </Modal>
  </>)
}
