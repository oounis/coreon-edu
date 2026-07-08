import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid, classById } from '../db.js'
import { notify } from '../notify.js'
import { PageHead, Card, Btn, Modal, Field, Input, Select, Textarea, EmptyState } from '../components/ui.jsx'
import { SubjectDot } from '../subjects.jsx'
import { BookOpen, Plus, CalendarClock } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
export default function Homework(){
  const u=current(); const isTeacher=u.role==='teacher'
  const d=db()
  const [,force]=useState(0); const [open,setOpen]=useState(false); const [f,setF]=useState({classId:d.classes[0]?.id||'c5a',subject:'Mathématiques',title:'',due:'',details:''})
  const add=()=>{ if(!f.title.trim())return; mutate(db=>{db.homework.unshift({...f,id:uid('hw'),at:Date.now(),by:u.id})})
    notify({role:'parent',kind:'notice',title:'Nouveau devoir',body:`${f.subject} : ${f.title} (à rendre le ${f.due||'bientôt'})`,link:'/app/homework'})
    toast.success('Devoir publié'); setOpen(false); setF({classId:d.classes[0]?.id||'c5a',subject:'Mathématiques',title:'',due:'',details:''}); force(x=>x+1) }
  return (<>
    <PageHead title="Devoirs" sub="Travaux à faire et dates de remise." action={isTeacher&&<Btn onClick={()=>setOpen(true)}><Plus size={16}/> Publier un devoir</Btn>}/>
    <div className="grid md:grid-cols-2 gap-3">
      {d.homework.length? d.homework.map(h=>(<Card key={h.id} className="p-4 flex gap-3"><SubjectDot label={h.subject} size={40} iconSize={18}/>
        <div><div className="font-semibold">{h.title}</div><div className="text-sm text-muted">{h.subject} · {classById(h.classId)?.name}</div>
          {h.details&&<div className="text-sm mt-1">{h.details}</div>}
          <div className="text-xs text-muted mt-1 flex items-center gap-1"><CalendarClock size={12}/> À rendre le {h.due||'—'}</div></div></Card>))
       : <Card className="md:col-span-2"><EmptyState icon={<BookOpen size={26}/>} title="Aucun devoir publié" sub="Les devoirs et leurs dates de remise apparaîtront ici."/></Card>}
    </div>
    <Modal open={open} onClose={()=>setOpen(false)} title="Publier un devoir" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={add}>Publier</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Classe"><Select value={f.classId} onChange={e=>setF({...f,classId:e.target.value})}>{d.classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Matière"><Input value={f.subject} onChange={e=>setF({...f,subject:e.target.value})}/></Field>
        <Field label="Titre"><Input value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></Field>
        <Field label="Date de remise"><Input type="date" value={f.due} onChange={e=>setF({...f,due:e.target.value})}/></Field>
      </div><div className="mt-3"><Field label="Détails"><Textarea value={f.details} onChange={e=>setF({...f,details:e.target.value})} className="h-20"/></Field></div>
    </Modal>
  </>)
}
