import { useState, useMemo } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { Clock, ChevronRight, ChevronLeft, Check, Zap, RotateCcw } from 'lucide-react'
import { StudentChip, DropZone } from '../components/dnd.jsx'
import { PageHead, Btn } from '../components/ui.jsx'
import { currentClass, QUESTIONS, BUCKETS, BADGES } from '../data.js'
import { db, mutate, uid, studentById } from '../db.js'
import { notify } from '../notify.js'
import { studentSummary } from '../results.js'
import toast from 'react-hot-toast'

export default function Evaluate(){
  const cls=useMemo(()=>currentClass(new Date()),[])
  const students=cls.students
  const [step,setStep]=useState(0)
  const [placements,setPlacements]=useState({})
  const [badges,setBadges]=useState({})
  const [note,setNote]=useState("")
  const [active,setActive]=useState(null)
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:5}}))
  const q=QUESTIONS[step]; const place=placements[q?.id]||{}; const pool=students.filter(s=>!place[s.id])

  function onDragEnd({active,over}){ setActive(null); if(!over)return; const sid=active.id
    setPlacements(prev=>{ const cur={...(prev[q.id]||{})}; if(over.id==='pool')delete cur[sid]; else cur[sid]=over.id; return {...prev,[q.id]:cur} }) }
  const autoFill=b=>setPlacements(prev=>{ const cur={...(prev[q.id]||{})}; pool.forEach(s=>cur[s.id]=b); return {...prev,[q.id]:cur} })

  function submit(){
    const ev={ id:uid('ev'), at:Date.now(), classId:cls.cls.id, className:cls.cls.name, subject:cls.slot.subject, teacher:'Othman Ounis', placements, badges, note }
    mutate(db=>{ db.evaluations.unshift(ev) })
    // notify each student's parent
    students.forEach(s=>{ if(s.parentId){ const sum=studentSummary(ev,s.id); if(sum.score!=null) notify({to:s.parentId,kind:'evaluation',title:`New evaluation for ${s.name.split(' ')[0]}`,body:`${cls.slot.subject}: ${sum.score}/100${sum.badge?` · ${sum.badge.emoji} ${sum.badge.label}`:''}`}) } })
    toast.success('Evaluation saved & parents notified'); setStep(6)
  }

  if(step===6) return (
    <div className="max-w-[600px] mx-auto text-center pt-10">
      <div className="w-16 h-16 rounded-full grid place-items-center text-white mx-auto accent-bg pop"><Check size={30}/></div>
      <h1 className="text-2xl font-extrabold mt-4">Saved & shared 🎉</h1>
      <p className="text-muted mt-1">{cls.cls.name} · {cls.slot.subject} — {students.length} students in one pass. Parents notified.</p>
      <Btn className="mt-6" onClick={()=>{setStep(0);setPlacements({});setBadges({});setNote("")}}>New evaluation</Btn>
    </div>)

  return (<>
    <PageHead title="Quick evaluation" sub="Drag each student onto an answer. Five questions, done in seconds."/>
    <div className="card p-4 mb-5 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3"><span className="w-11 h-11 rounded-xl grid place-items-center accent-soft accent-text"><Clock size={20}/></span>
        <div><div className="font-semibold">{cls.cls.name} · {cls.slot.subject}</div>
          <div className="text-sm text-muted">{cls.slot.start}–{cls.slot.end} · {students.length} students {cls.isLive&&<span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{background:'#2BD9A8'}}>● LIVE NOW</span>}</div></div></div>
      <div className="text-sm text-muted">Auto-loaded from your schedule</div>
    </div>
    <div className="flex items-center gap-1.5 mb-4">{QUESTIONS.map((_,i)=><div key={i} className="h-1.5 flex-1 rounded-full" style={{background:i<=step?'var(--accent)':'#E8EDF2'}}/>)}<div className="h-1.5 flex-1 rounded-full" style={{background:step>=5?'var(--accent)':'#E8EDF2'}}/></div>

    {step<5 ? (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={({active})=>setActive(active.data.current.student)} onDragEnd={onDragEnd}>
        <div className="flex items-center justify-between mb-3">
          <div><div className="text-xs font-bold uppercase accent-text">Question {step+1} of 5</div><h2 className="text-xl font-bold">{q.text}</h2></div>
          <div className="text-sm text-muted">{Object.keys(place).length}/{students.length} placed</div>
        </div>
        <DropZone id="pool" className="card border-dashed p-3 mb-4 min-h-[64px]">
          <div className="flex flex-wrap gap-2">{pool.length? pool.map(s=><StudentChip key={s.id} student={s}/>) : <span className="text-sm text-muted px-2 py-1">All placed ✓</span>}</div>
          {pool.length>0&&<div className="flex gap-2 mt-2 flex-wrap"><span className="text-xs text-muted py-1">Quick:</span>{BUCKETS.map(b=><button key={b.key} onClick={()=>autoFill(b.key)} className="text-xs px-2 py-1 rounded-full border border-line hover:bg-canvas">all → {b.label}</button>)}</div>}
        </DropZone>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {BUCKETS.map(b=>{ const inB=students.filter(s=>place[s.id]===b.key); return (
            <DropZone key={b.key} id={b.key} className="card p-3 min-h-[150px]">
              <div className="flex items-center justify-between mb-2"><span className="text-sm font-bold flex items-center gap-1.5">{b.emoji}<span style={{color:b.color}}>{b.label}</span></span>
                <span className="text-xs font-bold w-6 h-6 grid place-items-center rounded-full text-white" style={{background:b.color}}>{inB.length}</span></div>
              <div className="flex flex-wrap gap-2">{inB.map(s=><StudentChip key={s.id} student={s}/>)}</div>
            </DropZone>) })}
        </div>
        <div className="flex items-center justify-between mt-6">
          <Btn variant="ghost" onClick={()=>step>0&&setStep(step-1)} disabled={step===0}><ChevronLeft size={16}/> Back</Btn>
          <button onClick={()=>setPlacements(p=>({...p,[q.id]:{}}))} className="text-sm text-muted hover:text-ink inline-flex items-center gap-1"><RotateCcw size={14}/> reset</button>
          <Btn onClick={()=>setStep(step+1)}>{step<4?'Next':'Badges & note'} <ChevronRight size={16}/></Btn>
        </div>
        <DragOverlay>{active? <StudentChip student={active} overlay/> : null}</DragOverlay>
      </DndContext>
    ) : (
      <div>
        <h2 className="text-xl font-bold mb-1">Badges & a quick note</h2>
        <p className="text-muted text-sm mb-4">Optional — tap a student, then a badge.</p>
        <BadgePicker students={students} badges={badges} setBadges={setBadges}/>
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note for parents/admin…" className="w-full mt-4 rounded-xl border border-line p-3 text-sm bg-white h-24 outline-none"/>
        <div className="flex items-center justify-between mt-6"><Btn variant="ghost" onClick={()=>setStep(4)}><ChevronLeft size={16}/> Back</Btn><Btn onClick={submit}><Zap size={17}/> Save & share</Btn></div>
      </div>
    )}
  </>)
}
function BadgePicker({students,badges,setBadges}){
  const [sel,setSel]=useState(null)
  return (<div>
    <div className="flex flex-wrap gap-2 mb-3">{students.map(s=>(
      <button key={s.id} onClick={()=>setSel(sel===s.id?null:s.id)} className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border bg-white text-sm ${sel===s.id?'accent-text':'border-line'}`} style={sel===s.id?{borderColor:'var(--accent)'}:{}}>
        <span className="w-6 h-6 rounded-full grid place-items-center text-white text-[10px] font-bold" style={{background:'#94A3B8'}}>{s.initials}</span>{s.name}{badges[s.id]&&<span>{BADGES.find(b=>b.key===badges[s.id])?.emoji}</span>}</button>))}</div>
    {sel&&<div className="flex flex-wrap gap-2 pop">{BADGES.map(b=><button key={b.key} onClick={()=>{setBadges(p=>({...p,[sel]:b.key}));setSel(null)}} className="px-3 py-1.5 rounded-full border border-line bg-white text-sm hover:accent-soft">{b.emoji} {b.label}</button>)}
      <button onClick={()=>{setBadges(p=>{const n={...p};delete n[sel];return n});setSel(null)}} className="px-3 py-1.5 rounded-full text-sm text-muted">remove</button></div>}
  </div>)
}
