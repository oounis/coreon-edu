import { useState, useMemo } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { Clock, ChevronRight, ChevronLeft, Check, Zap, RotateCcw } from 'lucide-react'
import { StudentChip, DropZone } from '../components/dnd.jsx'
import { PageHead, Btn } from '../components/ui.jsx'
import { currentClass, QUESTIONS, BUCKETS, BADGES } from '../data.js'
import { db, mutate, uid, studentById } from '../db.js'
import { notify } from '../notify.js'
import { studentSummary, mentionFor } from '../results.js'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
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

  const [saved,setSaved]=useState([])
  function submit(){
    // ne garder que les questions réellement remplies, mais conserver TOUTES celles touchées
    const cleanPlacements={}
    for(const qid in placements){ const p=placements[qid]; if(p && Object.keys(p).length) cleanPlacements[qid]=p }
    const graded=students.filter(s=>studentSummary({placements:cleanPlacements},s.id).score!=null)
    if(graded.length===0){ toast.error("Placez au moins un élève sur une réponse avant d'enregistrer."); return }
    const ev={ id:uid('ev'), at:Date.now(), classId:cls.cls.id, className:cls.cls.name, subject:cls.slot.subject, teacher:'Othman Ounis', placements:cleanPlacements, badges, note }
    mutate(db=>{ db.evaluations.unshift(ev) })
    // notify each student's parent
    students.forEach(s=>{ if(s.parentId){ const sum=studentSummary(ev,s.id); if(sum.score!=null) notify({to:s.parentId,kind:'evaluation',title:`Nouvelle évaluation pour ${s.name.split(' ')[0]}`,body:`${cls.slot.subject} : ${sum.score}/100${sum.badge?` · ${sum.badge.emoji} ${sum.badge.label}`:''}`,link:'/app'}) } })
    // notify admin + direction so the evaluation is visible to administration too
    notify({role:'admin',kind:'evaluation',actor:'Othman Ounis',title:`Évaluation enregistrée — ${cls.cls.name}`,body:`${cls.slot.subject} · ${graded.length} élèves notés`,link:'/app/students'})
    notify({role:'schooladmin',kind:'evaluation',actor:'Othman Ounis',title:`Évaluation enregistrée — ${cls.cls.name}`,body:`${cls.slot.subject} · ${graded.length} élèves notés`,link:'/app/students'})
    // recap of this saved evaluation for the success screen
    setSaved(graded.map(s=>{const sum=studentSummary(ev,s.id);return {name:s.name,...sum,mention:mentionFor(sum.score)}}))
    toast.success(`Évaluation enregistrée · ${graded.length} élèves notés · parents notifiés`); setStep(6)
  }
  // historique des évaluations déjà enregistrées pour cette classe (preuve de persistance)
  const classHistory=useMemo(()=>db().evaluations.filter(e=>e.classId===cls.cls.id),[step])

  if(step===6) return (
    <div className="max-w-[640px] mx-auto pt-8">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full grid place-items-center text-white mx-auto accent-bg pop"><Check size={30}/></div>
        <h1 className="text-2xl font-extrabold mt-4">Enregistré & partagé 🎉</h1>
        <p className="text-muted mt-1">{cls.cls.name} · {cls.slot.subject} — {saved.length} élèves notés. Parents et direction notifiés.</p>
      </div>
      {saved.length>0 && (
        <div className="card p-4 mt-6 text-left">
          <div className="text-xs font-bold uppercase accent-text mb-2">Notes enregistrées</div>
          <div className="divide-y divide-line">
            {saved.map((s,i)=>(<div key={i} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium">{s.name} {s.badge&&<span className="ml-1">{s.badge.emoji}</span>}</span>
              <span className="font-bold" style={{color:s.mention?.color}}>{s.score}/100</span>
            </div>))}
          </div>
        </div>
      )}
      <div className="card p-4 mt-4 text-left">
        <div className="text-xs font-bold uppercase text-muted mb-2">Historique de la classe · {classHistory.length} évaluation(s) enregistrée(s)</div>
        <div className="space-y-1.5">
          {classHistory.slice(0,6).map(e=>(<div key={e.id} className="flex items-center justify-between text-sm">
            <span>{e.subject}</span>
            <span className="text-muted text-xs">{format(new Date(e.at),'dd MMM yyyy · HH:mm',{locale:fr})}</span>
          </div>))}
        </div>
      </div>
      <div className="text-center"><Btn className="mt-6" onClick={()=>{setStep(0);setPlacements({});setBadges({});setNote("");setSaved([])}}>Nouvelle évaluation</Btn></div>
    </div>)

  return (<>
    <PageHead title="Évaluation rapide" sub="Glissez chaque élève sur une réponse. Cinq questions, en quelques secondes."/>
    <div className="card p-4 mb-5 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3"><span className="w-11 h-11 rounded-xl grid place-items-center accent-soft accent-text"><Clock size={20}/></span>
        <div><div className="font-semibold">{cls.cls.name} · {cls.slot.subject}</div>
          <div className="text-sm text-muted">{cls.slot.start}–{cls.slot.end} · {students.length} élèves {cls.isLive&&<span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{background:'#2BD9A8'}}>● EN COURS</span>}</div></div></div>
      <div className="text-sm text-muted">Chargé depuis votre emploi du temps</div>
    </div>
    <div className="flex items-center gap-1.5 mb-4">{QUESTIONS.map((_,i)=><div key={i} className="h-1.5 flex-1 rounded-full" style={{background:i<=step?'var(--accent)':'#E8EDF2'}}/>)}<div className="h-1.5 flex-1 rounded-full" style={{background:step>=5?'var(--accent)':'#E8EDF2'}}/></div>

    {step<5 ? (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={({active})=>setActive(active.data.current.student)} onDragEnd={onDragEnd}>
        <div className="flex items-center justify-between mb-3">
          <div><div className="text-xs font-bold uppercase accent-text">Question {step+1} sur 5</div><h2 className="text-xl font-bold">{q.text}</h2></div>
          <div className="text-sm text-muted">{Object.keys(place).length}/{students.length} placés</div>
        </div>
        <DropZone id="pool" className="card border-dashed p-3 mb-4 min-h-[64px]">
          <div className="flex flex-wrap gap-2">{pool.length? pool.map(s=><StudentChip key={s.id} student={s}/>) : <span className="text-sm text-muted px-2 py-1">Tous placés ✓</span>}</div>
          {pool.length>0&&<div className="flex gap-2 mt-2 flex-wrap"><span className="text-xs text-muted py-1">Rapide :</span>{BUCKETS.map(b=><button key={b.key} onClick={()=>autoFill(b.key)} className="text-xs px-2 py-1 rounded-full border border-line hover:bg-canvas">tous → {b.label}</button>)}</div>}
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
          <Btn variant="ghost" onClick={()=>step>0&&setStep(step-1)} disabled={step===0}><ChevronLeft size={16}/> Retour</Btn>
          <button onClick={()=>setPlacements(p=>({...p,[q.id]:{}}))} className="text-sm text-muted hover:text-ink inline-flex items-center gap-1"><RotateCcw size={14}/> réinitialiser</button>
          <Btn onClick={()=>setStep(step+1)}>{step<4?'Suivant':'Badges & note'} <ChevronRight size={16}/></Btn>
        </div>
        <DragOverlay>{active? <StudentChip student={active} overlay/> : null}</DragOverlay>
      </DndContext>
    ) : (
      <div>
        <h2 className="text-xl font-bold mb-1">Badges & une note rapide</h2>
        <p className="text-muted text-sm mb-4">Facultatif — touchez un élève, puis un badge.</p>
        <BadgePicker students={students} badges={badges} setBadges={setBadges}/>
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Note facultative pour les parents / l'administration…" className="w-full mt-4 rounded-xl border border-line p-3 text-sm bg-white h-24 outline-none"/>
        <div className="flex items-center justify-between mt-6"><Btn variant="ghost" onClick={()=>setStep(4)}><ChevronLeft size={16}/> Retour</Btn><Btn onClick={submit}><Zap size={17}/> Enregistrer & partager</Btn></div>
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
      <button onClick={()=>{setBadges(p=>{const n={...p};delete n[sel];return n});setSel(null)}} className="px-3 py-1.5 rounded-full text-sm text-muted">retirer</button></div>}
  </div>)
}
