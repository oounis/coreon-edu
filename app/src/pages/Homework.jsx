import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid, classById } from '../db.js'
import { notify } from '../notify.js'
import { PageHead, Card, Btn, Modal, Field, Input, Select, Textarea } from '../components/ui.jsx'
import { BookOpen, Plus, CalendarClock } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
export default function Homework(){
  const u=current(); const isTeacher=u.role==='teacher'
  const [,force]=useState(0); const [open,setOpen]=useState(false); const [f,setF]=useState({classId:'c7a',subject:'Mathematics',title:'',due:'',details:''})
  const d=db()
  const add=()=>{ if(!f.title.trim())return; mutate(db=>{db.homework.unshift({...f,id:uid('hw'),at:Date.now(),by:u.id})})
    notify({role:'parent',kind:'notice',title:'New homework',body:`${f.subject}: ${f.title} (due ${f.due||'soon'})`,link:'/app/homework'})
    toast.success('Homework posted'); setOpen(false); setF({classId:'c7a',subject:'Mathematics',title:'',due:'',details:''}); force(x=>x+1) }
  return (<>
    <PageHead title="Homework" sub="Assignments and due dates." action={isTeacher&&<Btn onClick={()=>setOpen(true)}><Plus size={16}/> Post homework</Btn>}/>
    <div className="grid md:grid-cols-2 gap-3">
      {d.homework.map(h=>(<Card key={h.id} className="p-4 flex gap-3"><span className="w-10 h-10 rounded-xl grid place-items-center accent-soft accent-text shrink-0"><BookOpen size={18}/></span>
        <div><div className="font-semibold">{h.title}</div><div className="text-sm text-muted">{h.subject} · {classById(h.classId)?.name}</div>
          {h.details&&<div className="text-sm mt-1">{h.details}</div>}
          <div className="text-xs text-muted mt-1 flex items-center gap-1"><CalendarClock size={12}/> Due {h.due||'—'}</div></div></Card>))}
    </div>
    <Modal open={open} onClose={()=>setOpen(false)} title="Post homework" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn><Btn onClick={add}>Post</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Class"><Select value={f.classId} onChange={e=>setF({...f,classId:e.target.value})}>{d.classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Subject"><Input value={f.subject} onChange={e=>setF({...f,subject:e.target.value})}/></Field>
        <Field label="Title"><Input value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></Field>
        <Field label="Due date"><Input type="date" value={f.due} onChange={e=>setF({...f,due:e.target.value})}/></Field>
      </div><div className="mt-3"><Field label="Details"><Textarea value={f.details} onChange={e=>setF({...f,details:e.target.value})} className="h-20"/></Field></div>
    </Modal>
  </>)
}
