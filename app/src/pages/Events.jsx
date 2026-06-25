import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid } from '../db.js'
import { notify } from '../notify.js'
import { PageHead, Card, Btn, Modal, Field, Input, Select } from '../components/ui.jsx'
import { CalendarDays, Plus } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
const TINT={Meeting:'#36C5F0',Event:'#6C5CE7',Exam:'#FF6B81',Holiday:'#2BD9A8'}
export default function Events(){
  const u=current(); const canAdd=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const [open,setOpen]=useState(false); const [f,setF]=useState({date:'',title:'',type:'Event',desc:''})
  const d=db(); const sorted=[...d.events].sort((a,b)=>a.date.localeCompare(b.date))
  const add=()=>{ if(!f.title.trim())return; mutate(db=>{db.events.push({...f,id:uid('e')})})
    notify({role:'parent',kind:'notice',title:'New school event',body:`${f.title} · ${f.date}`,link:'/app/events'}); toast.success('Event added'); setOpen(false); setF({date:'',title:'',type:'Event',desc:''}); force(x=>x+1) }
  return (<>
    <PageHead title="Events & calendar" sub="What's coming up." action={canAdd&&<Btn onClick={()=>setOpen(true)}><Plus size={16}/> Add event</Btn>}/>
    <div className="space-y-3">
      {sorted.map(e=>(<Card key={e.id} className="p-4 flex items-center gap-4">
        <div className="w-14 text-center shrink-0"><div className="text-2xl font-extrabold" style={{color:TINT[e.type]}}>{e.date.slice(8,10)}</div><div className="text-xs text-muted uppercase">{format(new Date(e.date),'MMM')}</div></div>
        <div className="flex-1"><div className="font-semibold">{e.title}</div><div className="text-sm text-muted">{e.desc}</div></div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{background:TINT[e.type]+'22',color:TINT[e.type]}}>{e.type}</span></Card>))}
    </div>
    <Modal open={open} onClose={()=>setOpen(false)} title="Add event" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn><Btn onClick={add}>Add</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3"><Field label="Date"><Input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></Field>
        <Field label="Type"><Select value={f.type} onChange={e=>setF({...f,type:e.target.value})}>{['Event','Meeting','Exam','Holiday'].map(t=><option key={t}>{t}</option>)}</Select></Field>
        <Field label="Title"><Input value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></Field><Field label="Description"><Input value={f.desc} onChange={e=>setF({...f,desc:e.target.value})}/></Field></div>
    </Modal>
  </>)
}
