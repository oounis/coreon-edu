import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid, classById, userById } from '../db.js'
import { PageHead, Table, Avatar, Btn, Modal, Field, Input, Select, Textarea, Section } from '../components/ui.jsx'
import { studentColor } from '../data.js'
import { UserPlus, Eye, Phone, Mail, Droplet, MapPin, HeartPulse, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const BLANK={ name:'',gender:'Male',dob:'',bloodGroup:'O+',nationality:'Tunisian',classId:'c7a',rollNo:'',admissionDate:'',prevSchool:'',
  fatherName:'',motherName:'',guardianPhone:'',parentId:'',address:'',phone:'',email:'',medical:'None',allergies:'None',emergencyName:'',emergencyPhone:'' }

export default function Students(){
  const u=current(); const canEdit=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const refresh=()=>force(x=>x+1)
  const [open,setOpen]=useState(false); const [view,setView]=useState(null); const [q,setQ]=useState('')
  const [f,setF]=useState(BLANK)
  const d=db()
  const parents=d.users.filter(x=>x.role==='parent')
  const list=d.students.filter(s=>s.name.toLowerCase().includes(q.toLowerCase()))
  const add=()=>{ if(!f.name.trim())return toast.error('Name is required')
    mutate(db=>{ db.students.push({ ...f, id:uid('s'), name:f.name.trim(), initials:f.name.trim().split(' ').map(w=>w[0]).slice(0,2).join(''), parentId:f.parentId||null })
      // create monthly payments row
      db.payments[db.students[db.students.length-1].id]=db.payments[db.students[db.students.length-1].id]||["Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun"].map(m=>({month:m,status:'due'})) })
    toast.success('Student enrolled'); setOpen(false); setF(BLANK); refresh() }

  return (<>
    <PageHead title="Students" sub={`${d.students.length} enrolled`} action={canEdit&&<Btn onClick={()=>{setF(BLANK);setOpen(true)}}><UserPlus size={16}/> Add student</Btn>}/>
    <div className="card flex items-center gap-2 px-3 py-2 mb-4 max-w-sm"><Search size={16} className="text-muted"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search students…" className="bg-transparent outline-none text-sm w-full"/></div>
    <Table head={['Student','Class','Guardian','Blood','Status','']}>
      {list.map(s=>(
        <tr key={s.id} className="hover:bg-canvas">
          <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={s.name} color={studentColor(s.id)}/><div><div className="font-medium">{s.name}</div><div className="text-xs text-muted">{s.gender} · Roll {s.rollNo}</div></div></div></td>
          <td className="px-4 py-3">{classById(s.classId)?.name}</td>
          <td className="px-4 py-3 text-muted">{userById(s.parentId)?.name || s.fatherName || '—'}</td>
          <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-xs"><Droplet size={12} className="text-coral"/>{s.bloodGroup}</span></td>
          <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:'#E2FBF3',color:'#10B981'}}>Active</span></td>
          <td className="px-4 py-3"><button onClick={()=>setView(s)} className="text-muted hover:accent-text"><Eye size={17}/></button></td>
        </tr>
      ))}
    </Table>

    {/* Add form */}
    <Modal open={open} onClose={()=>setOpen(false)} title="Enroll new student" size="2xl"
      footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn><Btn onClick={add}>Enroll student</Btn></>}>
      <Section title="Personal information">
        <Field label="Full name *"><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Amira Ben Salah"/></Field>
        <Field label="Gender"><Select value={f.gender} onChange={e=>setF({...f,gender:e.target.value})}><option>Male</option><option>Female</option></Select></Field>
        <Field label="Date of birth"><Input type="date" value={f.dob} onChange={e=>setF({...f,dob:e.target.value})}/></Field>
        <Field label="Blood group"><Select value={f.bloodGroup} onChange={e=>setF({...f,bloodGroup:e.target.value})}>{['O+','O-','A+','A-','B+','B-','AB+','AB-'].map(b=><option key={b}>{b}</option>)}</Select></Field>
        <Field label="Nationality"><Input value={f.nationality} onChange={e=>setF({...f,nationality:e.target.value})}/></Field>
      </Section>
      <Section title="Academic">
        <Field label="Class"><Select value={f.classId} onChange={e=>setF({...f,classId:e.target.value})}>{d.classes.map(c=><option key={c.id} value={c.id}>{c.name} · {c.grade}</option>)}</Select></Field>
        <Field label="Roll number"><Input value={f.rollNo} onChange={e=>setF({...f,rollNo:e.target.value})}/></Field>
        <Field label="Admission date"><Input type="date" value={f.admissionDate} onChange={e=>setF({...f,admissionDate:e.target.value})}/></Field>
        <Field label="Previous school"><Input value={f.prevSchool} onChange={e=>setF({...f,prevSchool:e.target.value})}/></Field>
      </Section>
      <Section title="Guardian / parent">
        <Field label="Father's name"><Input value={f.fatherName} onChange={e=>setF({...f,fatherName:e.target.value})}/></Field>
        <Field label="Mother's name"><Input value={f.motherName} onChange={e=>setF({...f,motherName:e.target.value})}/></Field>
        <Field label="Guardian phone"><Input value={f.guardianPhone} onChange={e=>setF({...f,guardianPhone:e.target.value})}/></Field>
        <Field label="Link to parent account"><Select value={f.parentId} onChange={e=>setF({...f,parentId:e.target.value})}><option value="">— none —</option>{parents.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
      </Section>
      <Section title="Contact & address">
        <Field label="Phone"><Input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></Field>
        <Field label="Email"><Input value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></Field>
        <Field label="Address"><Input value={f.address} onChange={e=>setF({...f,address:e.target.value})}/></Field>
      </Section>
      <Section title="Medical & emergency">
        <Field label="Medical conditions"><Input value={f.medical} onChange={e=>setF({...f,medical:e.target.value})}/></Field>
        <Field label="Allergies"><Input value={f.allergies} onChange={e=>setF({...f,allergies:e.target.value})}/></Field>
        <Field label="Emergency contact name"><Input value={f.emergencyName} onChange={e=>setF({...f,emergencyName:e.target.value})}/></Field>
        <Field label="Emergency phone"><Input value={f.emergencyPhone} onChange={e=>setF({...f,emergencyPhone:e.target.value})}/></Field>
      </Section>
    </Modal>

    {/* Profile view */}
    <Modal open={!!view} onClose={()=>setView(null)} title="Student profile" size="xl">
      {view && (<div>
        <div className="flex items-center gap-4 mb-5"><Avatar name={view.name} color={studentColor(view.id)} size={56}/>
          <div><div className="text-xl font-extrabold">{view.name}</div><div className="text-muted text-sm">{classById(view.classId)?.name} · Roll {view.rollNo} · {view.gender}</div></div></div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[['Date of birth',view.dob],['Blood group',view.bloodGroup],['Nationality',view.nationality],['Admission',view.admissionDate],['Previous school',view.prevSchool],['Father',view.fatherName],['Mother',view.motherName],['Guardian phone',view.guardianPhone],['Parent account',userById(view.parentId)?.name||'—'],['Address',view.address],['Phone',view.phone],['Email',view.email||'—'],['Medical',view.medical],['Allergies',view.allergies],['Emergency',`${view.emergencyName} · ${view.emergencyPhone}`]].map(([k,v])=>(
            <div key={k} className="flex justify-between border-b border-line py-1.5"><span className="text-muted">{k}</span><span className="font-medium text-right">{v||'—'}</span></div>
          ))}
        </div>
      </div>)}
    </Modal>
  </>)
}
