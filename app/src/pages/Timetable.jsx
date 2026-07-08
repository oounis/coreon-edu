import { useState } from 'react'
import { current } from '../auth.js'
import { db, studentById, setTimetableCell, TT_SUBJECTS } from '../db.js'
import { DAYS, PERIODS, timetableFor, teacherTimetable } from '../data.js'
import { PageHead, Card, Select, Field, Modal, Btn, StatCard } from '../components/ui.jsx'
import { CalendarClock, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ROOMS=['Salle 12','Salle 8','Salle 21','Salle 5','Labo','Gymnase','Salle Info','Salle de musique']

export default function Timetable(){
  const u=current(); const d=db()
  const canEdit=['schooladmin','admin'].includes(u.role)
  const [,force]=useState(0); const bump=()=>force(x=>x+1)
  let classes=d.classes, teacher=null
  if(u.role==='teacher'){ teacher=d.teachers.find(t=>t.id===(u.teacherId||u.id)); classes=d.classes.filter(c=>(teacher?.classes||[]).includes(c.id)) }
  if(u.role==='parent'){ const kids=(u.childIds||[]).map(studentById).filter(Boolean); classes=d.classes.filter(c=>kids.some(k=>k.classId===c.id)) }

  const [mode,setMode]=useState(u.role==='teacher'?'me':'class')
  const [classId,setClassId]=useState(classes[0]?.id||d.classes[0]?.id)
  const [edit,setEdit]=useState(null) // {pi,di,subject,room}
  const editable = canEdit && mode==='class'
  const grid = mode==='me'&&teacher ? teacherTimetable(teacher) : timetableFor(classId)
  const clsName = d.classes.find(c=>c.id===classId)?.name

  const openCell=(pi,di,cell)=>{ if(!editable) return; setEdit({pi,di,subject:cell?.subject||'',room:cell?.room||ROOMS[0]}) }
  const saveCell=()=>{
    const s=TT_SUBJECTS.find(([n])=>n===edit.subject)
    setTimetableCell(classId, edit.pi, edit.di, s?{subject:s[0],color:s[1],room:edit.room}:null)
    toast.success('Emploi du temps mis à jour'); setEdit(null); bump()
  }
  const clearCell=()=>{ setTimetableCell(classId, edit.pi, edit.di, null); toast.success('Case libérée'); setEdit(null); bump() }

  return (<>
    <PageHead title="Emploi du temps" sub={editable?'Cliquez sur une case pour la modifier.':'La semaine, d’un coup d’œil.'}
      action={
        <div className="flex items-end gap-3">
          {u.role==='teacher' && <Field label="Vue"><Select value={mode} onChange={e=>setMode(e.target.value)}><option value="me">Mon emploi du temps</option><option value="class">Par classe</option></Select></Field>}
          {(mode==='class') && <Field label="Classe"><Select value={classId} onChange={e=>setClassId(e.target.value)}>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}
        </div>
      }/>

    {editable && <div className="flex items-center gap-2 text-xs font-semibold text-white px-3 py-2 rounded-xl mb-4 w-fit" style={{background:'var(--accent)'}}><Pencil size={13}/> Mode édition (Direction) — construisez l’emploi du temps de {clsName}</div>}

    <Card className="p-4 overflow-x-auto scroll-thin">
      <div className="min-w-[720px]">
        <div className="grid" style={{gridTemplateColumns:'84px repeat(5,1fr)',gap:'6px'}}>
          <div/>
          {DAYS.map(day=><div key={day} className="text-center text-sm font-bold py-2 rounded-lg bg-canvas">{day}</div>)}
          {grid.map((row,pi)=>(
            <FragmentRow key={pi} row={row} pi={pi} editable={editable} onCell={openCell}/>
          ))}
        </div>
        <div className="text-xs text-muted mt-3">
          {mode==='me'&&teacher ? <>Emploi du temps de <b className="text-ink">{teacher.name}</b> · {teacher.subject}</> : <>Classe <b className="text-ink">{clsName}</b> · récréation 10:00–10:15 · déjeuner 12:15–13:00</>}
        </div>
      </div>
    </Card>

    <div className="grid sm:grid-cols-3 gap-4 mt-5">
      <StatCard label="séances / semaine" value={grid.reduce((n,r)=>n+r.cells.filter(Boolean).length,0)} tint="brand" icon={<CalendarClock size={20}/>}/>
      <StatCard label="périodes / jour" value={6} tint="mint" icon={<CalendarClock size={20}/>}/>
      <StatCard label="jours d’école" value="Lun–Ven" tint="butter" icon={<CalendarClock size={20}/>}/>
    </div>

    <Modal open={!!edit} onClose={()=>setEdit(null)} title="Modifier la séance"
      footer={<><Btn variant="danger" onClick={clearCell}><Trash2 size={15}/> Libérer</Btn><div className="flex-1"/><Btn variant="ghost" onClick={()=>setEdit(null)}>Annuler</Btn><Btn onClick={saveCell}>Enregistrer</Btn></>}>
      {edit&&<div className="grid sm:grid-cols-2 gap-3">
        <Field label="Matière"><Select value={edit.subject} onChange={e=>setEdit({...edit,subject:e.target.value})}><option value="">— Libre —</option>{TT_SUBJECTS.map(([n])=><option key={n}>{n}</option>)}</Select></Field>
        <Field label="Salle"><Select value={edit.room} onChange={e=>setEdit({...edit,room:e.target.value})}>{ROOMS.map(r=><option key={r}>{r}</option>)}</Select></Field>
        <div className="sm:col-span-2 text-xs text-muted">{DAYS[edit.di]} · {PERIODS[edit.pi][0]}–{PERIODS[edit.pi][1]}</div>
      </div>}
    </Modal>
  </>)
}

function FragmentRow({ row, pi, editable, onCell }){
  return (<>
    <div className="text-[11px] text-muted font-semibold py-3 pr-1 text-right leading-tight">{row.start}<br/>{row.end}</div>
    {row.cells.map((c,di)=> c ? (
      <button key={di} onClick={()=>onCell(pi,di,c)} disabled={!editable}
        className={`rounded-xl p-2.5 text-left min-h-[64px] w-full ${editable?'hover:ring-2 hover:ring-offset-1 cursor-pointer':''}`}
        style={{background:c.color+'14',borderLeft:'3px solid '+c.color}}>
        <div className="text-[13px] font-bold leading-tight" style={{color:c.color}}>{c.subject}</div>
        <div className="text-[11px] text-muted mt-0.5">{c.room}{c.className?` · ${c.className}`:''}</div>
      </button>
    ) : (
      <button key={di} onClick={()=>onCell(pi,di,null)} disabled={!editable}
        className={`rounded-xl min-h-[64px] grid place-items-center text-[11px] text-muted bg-canvas/60 w-full ${editable?'hover:bg-canvas border-2 border-dashed border-line':''}`}>
        {editable?'+ Ajouter':'—'}
      </button>
    ))}
  </>)
}
