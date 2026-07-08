import { db } from '../db.js'
import { evaluationHistory, mentionFor } from '../results.js'
import { bucketOf } from '../results.js'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ClipboardList, CalendarCheck } from 'lucide-react'
import { STATUS } from './ui.jsx'

const FRATT={present:'Présent',absent:'Absent',late:'Retard'}
const COLATT={present:STATUS.ok,absent:STATUS.danger,late:STATUS.warn}

// Liste TOUTES les évaluations enregistrées pour un élève — preuve que les notes sont sauvegardées
export default function GradeHistory({ studentId }){
  const d=db()
  const hist=evaluationHistory(d.evaluations, studentId)
  // historique de présence (clés classId_date)
  const att=[]
  for(const key in (d.attendance||{})){
    const v=d.attendance[key]?.[studentId]
    if(v){ const date=key.split('_').slice(1).join('_'); att.push({date,status:v}) }
  }
  att.sort((a,b)=>b.date.localeCompare(a.date))
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wide accent-text mb-2 flex items-center gap-1.5"><ClipboardList size={14}/> Évaluations enregistrées · {hist.length}</h3>
      {hist.length? (
        <div className="space-y-2 mb-5">
          {hist.slice(0,12).map(ev=>{ const m=ev.mention||mentionFor(ev.score); return (
            <div key={ev.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-sm inline-flex items-center gap-1.5">{ev.subject}{ev.lesson&&<span className="text-muted font-medium">· {ev.lesson}</span>} {ev.badge&&<span className="inline-flex items-center gap-1 accent-text">{ev.badge.Icon&&<ev.badge.Icon size={13}/>} {ev.badge.label}</span>}</div>
                <div className="text-right"><span className="font-bold" style={{color:m.color}}>{ev.score}/100</span>
                  <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{background:m.color+'22',color:m.color}}>{m.label}</span></div>
              </div>
              <div className="text-[11px] text-muted mb-1.5">{format(new Date(ev.at),'EEEE dd MMMM yyyy · HH:mm',{locale:fr})} · {ev.teacher}{ev.className?` · ${ev.className}`:''}</div>
              <div className="flex flex-wrap gap-1.5">
                {ev.perQ.map((x,i)=>(<span key={i} className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{background:(x.bucket?.color||STATUS.neutral)+'22',color:x.bucket?.color||STATUS.neutral}} title={x.q}>{x.bucket?.Icon&&<x.bucket.Icon size={10}/>}{x.bucket?.label}</span>))}
              </div>
              {ev.note&&<div className="text-xs text-muted mt-1.5 italic">« {ev.note} »</div>}
            </div>) })}
          {hist.length>12 && <p className="text-xs text-muted text-center pt-1">+ {hist.length-12} évaluations plus anciennes (agrégées dans le bulletin)</p>}
        </div>
      ) : <p className="text-sm text-muted mb-5">Aucune évaluation enregistrée pour cet élève.</p>}

      <h3 className="text-sm font-bold uppercase tracking-wide accent-text mb-2 flex items-center gap-1.5"><CalendarCheck size={14}/> Historique de présence · {att.length}</h3>
      {att.length? (
        <div className="flex flex-wrap gap-2">
          {att.slice(0,30).map((a,i)=>(<span key={i} className="text-xs px-2.5 py-1 rounded-full border border-line inline-flex items-center gap-1.5">
            <i className="w-2 h-2 rounded-full" style={{background:COLATT[a.status]}}/>{a.date} · {FRATT[a.status]}</span>))}
        </div>
      ) : <p className="text-sm text-muted">Aucun relevé de présence enregistré.</p>}
    </div>
  )
}
