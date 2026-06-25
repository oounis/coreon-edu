import { useState } from 'react'
import { db, mutate, uid } from '../db.js'
import { ROLE } from '../theme.js'
import { notify } from '../notify.js'
import { PageHead, Table, Avatar, Btn, Modal, Field, Input, Select, Badge } from '../components/ui.jsx'
import { studentColor } from '../data.js'
import { UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
export default function Accounts(){
  const [,force]=useState(0); const [open,setOpen]=useState(false)
  const [f,setF]=useState({role:'teacher',name:'',email:'',pw:''})
  const d=db()
  const create=()=>{
    if(!f.name.trim()||!f.email.trim())return
    const id=uid('u')
    mutate(db=>{
      const user={ id, role:f.role, name:f.name.trim(), email:f.email.trim(), pw:f.pw||'1234' }
      if(f.role==='teacher'){ const tid=uid('t'); db.teachers.push({id:tid,name:user.name,subject:'—',classes:[]}); user.teacherId=tid }
      db.users.push(user)
    })
    notify({to:id,kind:'info',title:'Welcome to Coreon Edu',body:`Your ${ROLE[f.role].label} account was created.`})
    toast.success(`${ROLE[f.role].label} account created`); setOpen(false); setF({role:'teacher',name:'',email:'',pw:''}); force(x=>x+1)
  }
  return (<>
    <PageHead title="Accounts" sub="Create and manage user accounts for your school." action={<Btn onClick={()=>setOpen(true)}><UserPlus size={16}/> Create account</Btn>}/>
    <Table head={['User','Role','Email','Password']}>
      {d.users.filter(u=>u.role!=='owner').map(u=>(
        <tr key={u.id} className="hover:bg-canvas">
          <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={u.name} color={ROLE[u.role]?.color||studentColor(u.id)}/><span className="font-medium">{u.name}</span></div></td>
          <td className="px-4 py-3"><span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{background:ROLE[u.role]?.soft,color:ROLE[u.role]?.color}}>{ROLE[u.role]?.label}</span></td>
          <td className="px-4 py-3 text-muted">{u.email}</td>
          <td className="px-4 py-3 text-muted"><code>{u.pw}</code></td>
        </tr>
      ))}
    </Table>
    <Modal open={open} onClose={()=>setOpen(false)} title="Create account" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn><Btn onClick={create}>Create</Btn></>}>
      <div className="space-y-3">
        <Field label="Role"><Select value={f.role} onChange={e=>setF({...f,role:e.target.value})}>{['admin','teacher','supervisor','parent'].map(r=><option key={r} value={r}>{ROLE[r].label}</option>)}</Select></Field>
        <Field label="Full name"><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field>
        <Field label="Email"><Input value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="name@alnoor.edu"/></Field>
        <Field label="Temporary password"><Input value={f.pw} onChange={e=>setF({...f,pw:e.target.value})} placeholder="default 1234"/></Field>
      </div>
    </Modal>
  </>)
}
