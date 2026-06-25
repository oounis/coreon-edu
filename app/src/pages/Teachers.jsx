import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid } from '../db.js'
import { PageHead, Table, Avatar, Btn, Modal, Field, Input, Select, Section } from '../components/ui.jsx'
import { studentColor } from '../data.js'
import { GOVERNORATES, DOC_TYPES, validCIN } from '../tunisia.js'
import Attach from '../components/Attach.jsx'
import { UserPlus, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
const BLANK={name:'',gender:'Male',dob:'',subject:'',qualification:'',experience:'',joiningDate:'',designation:'Teacher',phone:'',email:'',address:'',salary:'',cin:'',governorate:'Tunis',attachments:[]}
export default function Teachers(){
  const u=current(); const canEdit=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const [open,setOpen]=useState(false); const [view,setView]=useState(null); const [f,setF]=useState(BLANK)
  const d=db()
  const add=()=>{ if(!f.name.trim())return toast.error('Name is required')
    mutate(db=>{db.teachers.push({...f,id:uid('t'),classes:[],experience:Number(f.experience)||0,salary:Number(f.salary)||0})})
    toast.success('Teacher added'); setOpen(false); setF(BLANK); force(x=>x+1) }
  return (<>
    <PageHead title="Teachers & staff" sub={`${d.teachers.length} on staff`} action={canEdit&&<Btn onClick={()=>{setF(BLANK);setOpen(true)}}><UserPlus size={16}/> Add teacher</Btn>}/>
    <Table head={['Teacher','Subject','Designation','Experience','']}>
      {d.teachers.map(t=>(
        <tr key={t.id} className="hover:bg-canvas">
          <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={t.name} color={studentColor(t.id)}/><div><div className="font-medium">{t.name}</div><div className="text-xs text-muted">{t.email}</div></div></div></td>
          <td className="px-4 py-3">{t.subject}</td><td className="px-4 py-3 text-muted">{t.designation}</td>
          <td className="px-4 py-3 text-muted">{t.experience} yrs</td>
          <td className="px-4 py-3"><button onClick={()=>setView(t)} className="text-muted hover:accent-text"><Eye size={17}/></button></td>
        </tr>
      ))}
    </Table>
    <Modal open={open} onClose={()=>setOpen(false)} title="Add teacher / staff" size="2xl" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn><Btn onClick={add}>Add</Btn></>}>
      <Section title="Personal">
        <Field label="Full name *"><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field>
        <Field label="Gender"><Select value={f.gender} onChange={e=>setF({...f,gender:e.target.value})}><option>Male</option><option>Female</option></Select></Field>
        <Field label="Date of birth"><Input type="date" value={f.dob} onChange={e=>setF({...f,dob:e.target.value})}/></Field>
        <Field label="CIN (8 chiffres)"><Input value={f.cin} onChange={e=>setF({...f,cin:e.target.value})} maxLength={8}/></Field>
        <Field label="Gouvernorat"><Select value={f.governorate} onChange={e=>setF({...f,governorate:e.target.value})}>{GOVERNORATES.map(g=><option key={g}>{g}</option>)}</Select></Field>
      </Section>
      <Section title="Professional">
        <Field label="Subject"><Input value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} placeholder="Mathematics"/></Field>
        <Field label="Designation"><Select value={f.designation} onChange={e=>setF({...f,designation:e.target.value})}>{['Teacher','Senior Teacher','Head of Dept.','Coordinator','Lab Assistant'].map(x=><option key={x}>{x}</option>)}</Select></Field>
        <Field label="Qualification"><Input value={f.qualification} onChange={e=>setF({...f,qualification:e.target.value})} placeholder="M.Sc."/></Field>
        <Field label="Experience (years)"><Input type="number" value={f.experience} onChange={e=>setF({...f,experience:e.target.value})}/></Field>
        <Field label="Joining date"><Input type="date" value={f.joiningDate} onChange={e=>setF({...f,joiningDate:e.target.value})}/></Field>
      </Section>
      <Section title="Contact & payroll">
        <Field label="Phone"><Input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></Field>
        <Field label="Email"><Input value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></Field>
        <Field label="Address"><Input value={f.address} onChange={e=>setF({...f,address:e.target.value})}/></Field>
        <Field label="Monthly salary (DT)"><Input type="number" value={f.salary} onChange={e=>setF({...f,salary:e.target.value})}/></Field>
      </Section>
      <div className="mt-1"><div className="text-xs font-bold uppercase tracking-wide accent-text mb-2">Pièces à fournir</div>
        <Attach types={DOC_TYPES.teacher} value={f.attachments} onChange={a=>setF({...f,attachments:a})}/></div>
    </Modal>
    <Modal open={!!view} onClose={()=>setView(null)} title="Staff profile" size="xl">
      {view&&(<div><div className="flex items-center gap-4 mb-5"><Avatar name={view.name} color={studentColor(view.id)} size={56}/><div><div className="text-xl font-extrabold">{view.name}</div><div className="text-muted text-sm">{view.designation} · {view.subject}</div></div></div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">{[['Gender',view.gender],['CIN',view.cin],['Gouvernorat',view.governorate],['Date of birth',view.dob],['Qualification',view.qualification],['Experience',`${view.experience} yrs`],['Joining date',view.joiningDate],['Phone',view.phone],['Email',view.email],['Address',view.address],['Salary',view.salary?`${view.salary} DT`:'—']].map(([k,v])=><div key={k} className="flex justify-between border-b border-line py-1.5"><span className="text-muted">{k}</span><span className="font-medium text-right">{v||'—'}</span></div>)}</div></div>)}
    </Modal>
  </>)
}
