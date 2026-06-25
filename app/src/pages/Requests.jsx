import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid } from '../db.js'
import { notify } from '../notify.js'
import { PageHead, Card, Btn, Modal, Field, Input, Select, Badge } from '../components/ui.jsx'
import { FileText, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
const TYPES=['Salary Certificate','Leave Request','Document Request','Other']
export default function Requests(){
  const u=current(); const isTeacher=u.role==='teacher'; const canDecide=['admin','schooladmin'].includes(u.role)
  const [,force]=useState(0); const [open,setOpen]=useState(false); const [f,setF]=useState({type:'Salary Certificate',note:''})
  const d=db()
  const list = isTeacher ? d.requests.filter(r=>r.by===u.id) : d.requests
  const submit=()=>{ const id=uid('req'); mutate(db=>{db.requests.unshift({id,at:Date.now(),by:u.id,byName:u.name,type:f.type,note:f.note.trim(),status:'pending'})})
    notify({role:'admin',kind:'request',title:`New ${f.type.toLowerCase()} request`,body:`${u.name}: ${f.note||f.type}`})
    notify({role:'schooladmin',kind:'request',title:`New request`,body:`${u.name} · ${f.type}`})
    toast.success('Request submitted'); setOpen(false); setF({type:'Salary Certificate',note:''}); force(x=>x+1) }
  const decide=(id,status)=>{ let by; mutate(db=>{ const r=db.requests.find(x=>x.id===id); if(r){r.status=status; by=r.by} })
    if(by) notify({to:by,kind:'request',title:`Request ${status}`,body:`Your request was ${status} by the administration.`})
    toast.success(`Request ${status}`); force(x=>x+1) }
  return (<>
    <PageHead title="Requests" sub={isTeacher?'Ask the administration for documents or leave.':'Approve staff requests.'} action={isTeacher&&<Btn onClick={()=>setOpen(true)}><Plus size={16}/> New request</Btn>}/>
    <div className="space-y-3">
      {list.length? list.map(r=>(
        <Card key={r.id} className="p-4 flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl grid place-items-center accent-soft accent-text shrink-0"><FileText size={18}/></span>
          <div className="flex-1"><div className="flex items-center gap-2 flex-wrap"><b>{r.type}</b><Badge status={r.status}/></div>
            <div className="text-sm text-muted">{r.note||'—'}</div>
            <div className="text-[11px] text-muted mt-1">by {r.byName} · {formatDistanceToNow(r.at,{addSuffix:true})}</div></div>
          {canDecide&&r.status==='pending'&&<div className="flex gap-2"><Btn variant="soft" onClick={()=>decide(r.id,'approved')}>Approve</Btn><Btn variant="ghost" onClick={()=>decide(r.id,'rejected')}>Reject</Btn></div>}
        </Card>
      )) : <Card className="p-10 text-center text-muted">No requests yet.</Card>}
    </div>
    <Modal open={open} onClose={()=>setOpen(false)} title="New request" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn><Btn onClick={submit}>Submit</Btn></>}>
      <div className="space-y-3"><Field label="Type"><Select value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{TYPES.map(t=><option key={t}>{t}</option>)}</Select></Field>
        <Field label="Note"><Input value={f.note} onChange={e=>setF({...f,note:e.target.value})} placeholder="e.g. For a bank loan application"/></Field></div>
    </Modal>
  </>)
}
