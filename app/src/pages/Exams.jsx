import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid } from '../db.js'
import { notify } from '../notify.js'
import { PageHead, Table, Btn, Modal, Field, Input, Select, IconTile, EmptyState, SectionCard } from '../components/ui.jsx'
import { GraduationCap, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
export default function Exams(){
  const u=current(); const canEdit=['schooladmin','admin','teacher'].includes(u.role)
  const d=db()
  const [,force]=useState(0); const [open,setOpen]=useState(false)
  const [f,setF]=useState({class:d.classes[0]?.name||'5ème A',subject:'Mathématiques',date:'',total:100})
  const add=()=>{ if(!f.date){toast.error('Choisissez une date');return}
    mutate(db=>{db.exams.unshift({...f,id:uid('x'),total:Number(f.total)||100})})
    notify({role:'parent',kind:'notice',title:'Nouvel examen programmé',body:`${f.subject} · ${f.class} le ${f.date}`,link:'/app/exams'})
    notify({role:'teacher',kind:'info',title:'Examen ajouté au calendrier',body:`${f.subject} · ${f.class} le ${f.date}`,link:'/app/exams'})
    toast.success('Examen programmé · parents notifiés'); setOpen(false); force(x=>x+1) }
  const sorted=[...d.exams].sort((a,b)=>(a.date||'').localeCompare(b.date||''))
  return (<>
    <PageHead title="Examens" sub="Calendrier des prochains examens" action={canEdit&&<Btn onClick={()=>setOpen(true)}><Plus size={16}/> Programmer un examen</Btn>}/>
    {sorted.length===0 ? <SectionCard headless bodyClass=""><EmptyState icon={<GraduationCap size={26}/>} title="Aucun examen programmé" sub="Les prochains examens apparaîtront ici une fois planifiés."/></SectionCard>
    : <Table head={['Classe','Matière','Date','Barème']}>
      {sorted.map(x=>(<tr key={x.id} className="hover:bg-canvas">
        <td className="px-4 py-3"><div className="flex items-center gap-3"><IconTile icon={<GraduationCap size={16}/>} tint="brand" size={36} radius="rounded-lg"/><span className="font-medium">{x.class}</span></div></td>
        <td className="px-4 py-3">{x.subject}</td><td className="px-4 py-3 text-muted">{x.date}</td><td className="px-4 py-3 text-muted">{x.total}</td></tr>))}
    </Table>}
    <Modal open={open} onClose={()=>setOpen(false)} title="Programmer un examen" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={add}>Programmer</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Classe"><Select value={f.class} onChange={e=>setF({...f,class:e.target.value})}>{d.classes.map(c=><option key={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Matière"><Input value={f.subject} onChange={e=>setF({...f,subject:e.target.value})}/></Field>
        <Field label="Date"><Input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})}/></Field>
        <Field label="Barème"><Input type="number" value={f.total} onChange={e=>setF({...f,total:e.target.value})}/></Field>
      </div>
    </Modal>
  </>)
}
