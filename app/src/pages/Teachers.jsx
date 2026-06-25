import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid } from '../db.js'
import { PageHead, Table, Avatar, Btn, Modal, Field, Input } from '../components/ui.jsx'
import { studentColor } from '../data.js'
import { UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
export default function Teachers(){
  const u=current(); const canEdit=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const [open,setOpen]=useState(false); const [f,setF]=useState({name:'',subject:''})
  const d=db()
  const add=()=>{ if(!f.name.trim())return; mutate(db=>{db.teachers.push({id:uid('t'),name:f.name.trim(),subject:f.subject||'—',classes:[]})}); setOpen(false); setF({name:'',subject:''}); toast.success('Teacher added'); force(x=>x+1) }
  return (<>
    <PageHead title="Teachers" sub={`${d.teachers.length} on staff`} action={canEdit&&<Btn onClick={()=>setOpen(true)}><UserPlus size={16}/> Add teacher</Btn>}/>
    <Table head={['Teacher','Subject','Classes']}>
      {d.teachers.map(t=>(
        <tr key={t.id} className="hover:bg-canvas">
          <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={t.name} color={studentColor(t.id)}/><span className="font-medium">{t.name}</span></div></td>
          <td className="px-4 py-3">{t.subject}</td>
          <td className="px-4 py-3 text-muted">{t.classes.map(c=>d.classes.find(x=>x.id===c)?.name).filter(Boolean).join(', ')||'—'}</td>
        </tr>
      ))}
    </Table>
    <Modal open={open} onClose={()=>setOpen(false)} title="Add new teacher" footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn><Btn onClick={add}>Add teacher</Btn></>}>
      <div className="space-y-3"><Field label="Full name"><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></Field>
        <Field label="Subject"><Input value={f.subject} onChange={e=>setF({...f,subject:e.target.value})} placeholder="e.g. Mathematics"/></Field></div>
    </Modal>
  </>)
}
