import { useState } from 'react'
import { current } from '../auth.js'
import { db, mutate, studentsOfClass, classById } from '../db.js'
import { PageHead, Card, Avatar, Btn } from '../components/ui.jsx'
import { studentColor, currentClass } from '../data.js'
import { Check } from 'lucide-react'
import toast from 'react-hot-toast'
const CYCLE={present:'absent',absent:'late',late:'present'}
const COL={present:'#2BD9A8',absent:'#FF6B81',late:'#FFA62B'}
export default function Attendance(){
  const cls=currentClass(new Date()); const today=new Date().toISOString().slice(0,10)
  const key=cls.cls.id+'_'+today
  const [marks,setMarks]=useState(()=> db().attendance[key] || Object.fromEntries(cls.students.map(s=>[s.id,'present'])))
  const counts=Object.values(marks).reduce((a,v)=>{a[v]++;return a},{present:0,absent:0,late:0})
  const save=()=>{ mutate(db=>{db.attendance[key]=marks}); toast.success('Attendance saved') }
  return (<>
    <PageHead title="Attendance" sub={`${cls.cls.name} · ${cls.slot.subject} · ${today}`} action={<Btn onClick={save}><Check size={16}/> Save</Btn>}/>
    <div className="flex gap-3 mb-4">{Object.entries(counts).map(([k,v])=><div key={k} className="card px-4 py-2 text-sm"><span className="font-bold" style={{color:COL[k]}}>{v}</span> <span className="text-muted capitalize">{k}</span></div>)}</div>
    <Card className="p-3"><div className="grid sm:grid-cols-2 gap-2">
      {cls.students.map(s=>(<button key={s.id} onClick={()=>setMarks(m=>({...m,[s.id]:CYCLE[m[s.id]]}))} className="flex items-center gap-3 p-2 rounded-xl border border-line hover:bg-canvas">
        <Avatar name={s.name} color={studentColor(s.id)} size={32}/><span className="flex-1 text-left text-sm font-medium">{s.name}</span>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white capitalize" style={{background:COL[marks[s.id]]}}>{marks[s.id]}</span></button>))}
    </div><p className="text-xs text-muted mt-2 px-1">Tap a student to cycle present → absent → late.</p></Card>
  </>)
}
