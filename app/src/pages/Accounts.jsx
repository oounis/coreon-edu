import { useState } from 'react'
import { db, mutate, uid } from '../db.js'
import { ROLE } from '../theme.js'
import { notify } from '../notify.js'
import { PageHead, Table, Avatar, Btn, Modal, Field, Input, Select, Section } from '../components/ui.jsx'
import { studentColor } from '../data.js'
import { UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
const BLANK={role:'teacher',name:'',email:'',pw:'',phone:'',gender:'Male',address:'',occupation:'',subject:'',designation:'Teacher',childIds:[]}
export default function Accounts(){
  const [,force]=useState(0); const [open,setOpen]=useState(false); const [f,setF]=useState(BLANK)
  const d=db()
  const create=()=>{
    if(!f.name.trim()||!f.email.trim())return toast.error('Name and email are required')
    const id=uid('u')
    mutate(db=>{
      const user={id,role:f.role,name:f.name.trim(),email:f.email.trim(),pw:f.pw||'1234',phone:f.phone,gender:f.gender,address:f.address}
      if(f.role==='teacher'){ const tid=uid('t'); db.teachers.push({id:tid,name:user.name,subject:f.subject||'—',designation:f.designation,classes:[],experience:0,phone:f.phone,email:user.email}); user.teacherId=tid }
      if(f.role==='parent'){ user.occupation=f.occupation; user.childIds=f.childIds }
      db.users.push(user)
    })
    notify({to:id,kind:'info',title:'Welcome to Coreon Edu',body:`Your ${ROLE[f.role].label} account is ready.`,link:'/app'})
    toast.success(`${ROLE[f.role].label} account created`); setOpen(false); setF(BLANK); force(x=>x+1)
  }
  const toggleChild=sid=>setF(p=>({...p,childIds:p.childIds.includes(sid)?p.childIds.filter(x=>x!==sid):[...p.childIds,sid]}))
  return (<>
    <PageHead title="Accounts" sub="Create logins for staff and parents." action={<Btn onClick={()=>{setF(BLANK);setOpen(true)}}><UserPlus size={16}/> Create account</Btn>}/>
    <Table head={['User','Role','Email','Phone','Password']}>
      {d.users.filter(u=>u.role!=='owner').map(u=>(
        <tr key={u.id} className="hover:bg-canvas">
          <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={u.name} color={ROLE[u.role]?.color||studentColor(u.id)}/><span className="font-medium">{u.name}</span></div></td>
          <td className="px-4 py-3"><span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{background:ROLE[u.role]?.soft,color:ROLE[u.role]?.color}}>{ROLE[u.role]?.label}</span></td>
          <td className="px-4 py-3 text-muted">{u.email}</td><td className="px-4 py-3 text-muted">{u.phone||'—'}</td><td className="px-4 py-3 text-muted"><code>{u.pw}</code></td>
        </tr>
      ))}
    </Table>
    <Modal open={open} onClose={()=>setOpen(false)} title="Create account" size="xl" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn><Btn onClick={create}>Create account</Btn></>}>
      <Section title="Account">
        <Field label="Role"><Select value={f.role} onChange={e=>setF({...f,role:e.target.value})}>{['admin','teacher','supervisor','parent'].map(r=><option key={r} value={r}>{ROLE[r].label}</option>)}</Select></Field>
        <Field label="Full name *"><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field>
        <Field label="Email *"><Input value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="name@alnoor.edu"/></Field>
        <Field label="Temporary password"><Input value={f.pw} onChange={e=>setF({...f,pw:e.target.value})} placeholder="default 1234"/></Field>
      </Section>
      <Section title="Contact">
        <Field label="Phone"><Input value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></Field>
        <Field label="Gender"><Select value={f.gender} onChange={e=>setF({...f,gender:e.target.value})}><option>Male</option><option>Female</option></Select></Field>
        <Field label="Address"><Input value={f.address} onChange={e=>setF({...f,address:e.target.value})}/></Field>
      </Section>
      {f.role==='teacher'&&<Section title="Teaching"><Field label="Subject"><Input value={f.subject} onChange={e=>setF({...f,subject:e.target.value})}/></Field>
        <Field label="Designation"><Select value={f.designation} onChange={e=>setF({...f,designation:e.target.value})}>{['Teacher','Senior Teacher','Head of Dept.','Coordinator'].map(x=><option key={x}>{x}</option>)}</Select></Field></Section>}
      {f.role==='parent'&&<div className="mb-2"><div className="text-xs font-bold uppercase tracking-wide accent-text mb-2">Parent details</div>
        <Field label="Occupation"><Input value={f.occupation} onChange={e=>setF({...f,occupation:e.target.value})}/></Field>
        <div className="mt-2 text-xs font-semibold text-muted">Link children</div>
        <div className="flex flex-wrap gap-2 mt-1">{d.students.filter(s=>!s.parentId).map(s=>(
          <button key={s.id} onClick={()=>toggleChild(s.id)} className={`text-sm px-3 py-1.5 rounded-full border ${f.childIds.includes(s.id)?'accent-soft accent-text':'border-line'}`}>{s.name}</button>))}</div></div>}
    </Modal>
  </>)
}
