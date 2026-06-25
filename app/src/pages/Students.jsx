import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, uid, classById } from '../db.js'
import { PageHead, Table, Avatar, Btn, Modal, Field, Input, Select } from '../components/ui.jsx'
import { studentColor } from '../data.js'
import { UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Students(){
  const u=current(); const canEdit=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const refresh=()=>force(x=>x+1)
  const [open,setOpen]=useState(false); const [f,setF]=useState({name:'',classId:'c7a'})
  const d=db()
  const add=()=>{ if(!f.name.trim())return; mutate(db=>{ db.students.push({id:uid('s'),name:f.name.trim(),initials:f.name.trim().split(' ').map(w=>w[0]).slice(0,2).join(''),classId:f.classId,parentId:null,dob:'2013-01-01'}) }); setOpen(false); setF({name:'',classId:'c7a'}); toast.success('Student added'); refresh() }
  return (<>
    <PageHead title="Students" sub={`${d.students.length} enrolled`} action={canEdit&&<Btn onClick={()=>setOpen(true)}><UserPlus size={16}/> Add student</Btn>}/>
    <Table head={['Student','Class','Parent','Date of birth']}>
      {d.students.map(s=>(
        <tr key={s.id} className="hover:bg-canvas">
          <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={s.name} color={studentColor(s.id)}/><span className="font-medium">{s.name}</span></div></td>
          <td className="px-4 py-3">{classById(s.classId)?.name}</td>
          <td className="px-4 py-3 text-muted">{d.users.find(x=>x.id===s.parentId)?.name || (s.parentId?'linked':'—')}</td>
          <td className="px-4 py-3 text-muted">{s.dob}</td>
        </tr>
      ))}
    </Table>
    <Modal open={open} onClose={()=>setOpen(false)} title="Add new student"
      footer={<><Btn variant="ghost" onClick={()=>setOpen(false)}>Cancel</Btn><Btn onClick={add}>Add student</Btn></>}>
      <div className="space-y-3">
        <Field label="Full name"><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="e.g. Amira Ben Salah"/></Field>
        <Field label="Class"><Select value={f.classId} onChange={e=>setF({...f,classId:e.target.value})}>{d.classes.map(c=><option key={c.id} value={c.id}>{c.name} · {c.grade}</option>)}</Select></Field>
      </div>
    </Modal>
  </>)
}
