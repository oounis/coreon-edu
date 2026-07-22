import { useState } from 'react'
import { current } from '@core/auth.js'
import { db, studentById, setTimetableCell, TT_SUBJECTS } from '@core/db.js'
import { DAYS, PERIODS, timetableFor, teacherTimetable } from '@core/data.js'
import { PageHead, Select, Field, Modal, Btn } from '../components/ui.jsx'
import { subjectMeta } from '../subjects.jsx'
import { Pencil, Trash2, Plus, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { isSummer, rentreeLabel } from '../components/Summer.jsx'

const ROOMS=['Salle 12','Salle 8','Salle 21','Salle 5','Labo','Gymnase','Salle Info','Salle de musique']

// The whole week on one screen: the grid stretches to fill the viewport
// (no vertical scrolling) — rows share the available height equally.
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
  const sessions = grid.reduce((n,r)=>n+r.cells.filter(Boolean).length,0)
  const todayIdx=(()=>{ const wd=new Date().getDay(); return wd>=1&&wd<=5 ? wd-1 : -1 })()

  const openCell=(pi,di,cell)=>{ if(!editable) return; setEdit({pi,di,subject:cell?.subject||'',room:cell?.room||ROOMS[0]}) }
  const saveCell=()=>{
    const s=TT_SUBJECTS.find(([n])=>n===edit.subject)
    setTimetableCell(classId, edit.pi, edit.di, s?{subject:s[0],room:edit.room}:null)
    toast.success('Emploi du temps mis à jour'); setEdit(null); bump()
  }
  const clearCell=()=>{ setTimetableCell(classId, edit.pi, edit.di, null); toast.success('Case libérée'); setEdit(null); bump() }

  return (<>
    <PageHead title="Emploi du temps"
      sub={<span className="inline-flex items-center gap-2 flex-wrap">
        {mode==='me'&&teacher ? <>{teacher.name} · {teacher.subject}</> : <>Classe {clsName}</>}
        <span className="text-line">|</span>{sessions} séances · Lun–Ven · 6 périodes
        {editable && <span className="inline-flex items-center gap-1 text-[12px] font-bold accent-soft accent-text px-2 py-0.5 rounded-full"><Pencil size={11}/> mode édition · cliquez sur une case</span>}
      </span>}
      action={
        <div className="flex items-end gap-3">
          {u.role==='teacher' && <Field label="Vue"><Select value={mode} onChange={e=>setMode(e.target.value)}><option value="me">Mon emploi du temps</option><option value="class">Par classe</option></Select></Field>}
          {(mode==='class') && <Field label="Classe"><Select value={classId} onChange={e=>setClassId(e.target.value)}>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>}
        </div>
      }/>

    {isSummer()&&<div className="flex items-center gap-2.5 rounded-2xl px-4 py-3 mb-3 text-sm font-semibold" style={{background:'linear-gradient(90deg,#FEF3C7,#FDE68A55)',color:'#92400E'}}><Sun size={16}/> Vacances d'été · voici l'emploi du temps type ; les cours reprennent le {rentreeLabel()}.</div>}
    <div className="card p-3 overflow-x-auto scroll-thin" style={{height:isSummer()?'max(440px, calc(100vh - 260px))':'max(480px, calc(100vh - 205px))'}}>
      <div className="h-full min-w-[680px] grid gap-1.5" style={{gridTemplateColumns:'56px repeat(5,1fr)', gridTemplateRows:'34px repeat(6,1fr)'}}>
        <div/>
        {DAYS.map((day,di)=>(
          <div key={day} className={`grid place-items-center text-[13px] font-bold rounded-lg ${di===todayIdx?'accent-soft accent-text':'bg-canvas text-ink'}`}>
            <span className="inline-flex items-center gap-1.5">{di===todayIdx&&<Sun size={13}/>}{day}</span>
          </div>
        ))}
        {grid.map((row,pi)=>(
          <Row key={pi} row={row} pi={pi} todayIdx={todayIdx} editable={editable} onCell={openCell}/>
        ))}
      </div>
    </div>

    <Modal open={!!edit} onClose={()=>setEdit(null)} title="Modifier la séance"
      footer={<><Btn variant="danger" onClick={clearCell}><Trash2 size={15}/> Libérer</Btn><div className="flex-1"/><Btn variant="ghost" onClick={()=>setEdit(null)}>Annuler</Btn><Btn onClick={saveCell}>Enregistrer</Btn></>}>
      {edit&&<div className="grid sm:grid-cols-2 gap-3">
        <Field label="Matière"><Select value={edit.subject} onChange={e=>setEdit({...edit,subject:e.target.value})}><option value="">Libre</option>{TT_SUBJECTS.map(([n])=><option key={n}>{n}</option>)}</Select></Field>
        <Field label="Salle"><Select value={edit.room} onChange={e=>setEdit({...edit,room:e.target.value})}>{ROOMS.map(r=><option key={r}>{r}</option>)}</Select></Field>
        <div className="sm:col-span-2 text-xs text-muted">{DAYS[edit.di]} · {PERIODS[edit.pi][0]}–{PERIODS[edit.pi][1]}</div>
      </div>}
    </Modal>
  </>)
}

function Row({ row, pi, todayIdx, editable, onCell }){
  return (<>
    <div className="grid place-items-center text-[11px] text-muted font-bold text-center leading-tight">{row.start}<br/>{row.end}</div>
    {row.cells.map((c,di)=>{
      if(!c) return (
        <button key={di} onClick={()=>onCell(pi,di,null)} disabled={!editable}
          className={`h-full w-full rounded-xl grid place-items-center text-muted/70 ${di===todayIdx?'bg-canvas':'bg-canvas/50'} ${editable?'hover:bg-canvas border-2 border-dashed border-line':''}`}>
          {editable? <Plus size={14}/> : <span className="text-[11px]"> </span>}
        </button>)
      const {Icon,color}=subjectMeta(c.subject)
      return (
        <button key={di} onClick={()=>onCell(pi,di,c)} disabled={!editable}
          className={`h-full w-full rounded-xl px-1.5 py-1 flex flex-col items-center justify-center gap-0.5 text-center overflow-hidden transition ${editable?'cursor-pointer hover:ring-2 hover:ring-[var(--accent)] hover:ring-offset-1':''} ${di===todayIdx?'ring-1 ring-inset':''}`}
          style={{background:color+'12', ...(di===todayIdx?{'--tw-ring-color':color+'55'}:{})}}>
          <Icon size={15} style={{color}} className="shrink-0"/>
          <span className="text-[11.5px] font-bold leading-tight truncate max-w-full" style={{color}}>{c.subject}</span>
          <span className="text-[9.5px] text-muted truncate max-w-full">{c.room}{c.className?` · ${c.className}`:''}</span>
        </button>)
    })}
  </>)
}
