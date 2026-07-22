import { db, classById, settings } from '@core/db.js'
import { bulletinFor, mentionFor } from '@core/results.js'
import { Btn, Avatar, STATUS } from './ui.jsx'
import { Dialog } from '@headlessui/react'
import { X, Printer, Award, CalendarCheck } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Ic } from '../icons.jsx'

export default function Bulletin({ student, onClose }){
  if(!student) return null
  const d=db(); const b=bulletinFor(d, student.id)
  const cls=classById(student.classId)
  // identité de l'établissement : depuis les Paramètres (« appliqué partout »),
  // plus de « École Al-Nour · 2025–2026 » codé en dur sur le bulletin.
  const sc=settings()
  const print=()=>window.print()

  return (
    <Dialog open={!!student} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-ink/30 backdrop-blur-sm print:hidden" aria-hidden="true"/>
      <div className="fixed inset-0 grid place-items-start sm:place-items-center p-0 sm:p-4 overflow-y-auto print:p-0 print:static print:overflow-visible">
        <Dialog.Panel className="bg-white w-full max-w-2xl sm:rounded-2xl pop my-0 sm:my-4 print:max-w-none print:my-0 print:shadow-none">
          {/* barre d'action — masquée à l'impression */}
          <div className="flex items-center justify-between p-4 border-b border-line print:hidden">
            <Dialog.Title className="text-lg font-bold">Bulletin scolaire</Dialog.Title>
            <div className="flex items-center gap-2">
              <Btn onClick={print}><Printer size={16}/> Imprimer</Btn>
              <button onClick={onClose} className="text-muted hover:text-ink"><X size={18}/></button>
            </div>
          </div>

          <div id="bulletin-print" className="p-6 sm:p-8">
            {/* en-tête établissement */}
            <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4 mb-5">
              <div>
                <div className="text-xs font-semibold text-muted">République Tunisienne · Ministère de l'Éducation</div>
                <div className="text-2xl font-extrabold mt-1">{sc.schoolName}</div>
                <div className="text-sm text-muted">{sc.city} · Année scolaire {sc.year}</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-muted font-bold">Bulletin</div>
                <div className="text-sm text-muted mt-1">Édité le {format(new Date(),'dd MMMM yyyy',{locale:fr})}</div>
              </div>
            </div>

            {/* identité élève */}
            <div className="flex items-center gap-4 mb-6">
              <Avatar name={student.name} seed={student.id} size={52}/>
              <div className="flex-1 grid sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <div className="text-xl font-extrabold sm:col-span-2">{student.name}</div>
                <Line k="Classe" v={cls?.name}/>
                <Line k="Cycle" v={cls?.cycle}/>
                <Line k="N° d'inscription" v={student.rollNo}/>
                <Line k="Gouvernorat" v={student.governorate}/>
              </div>
            </div>

            {/* synthèse */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <SummaryBox label="Moyenne générale" value={b.overall!=null?`${b.overall}/100`:'·'} accent/>
              <SummaryBox label="Mention" value={b.mention.label} color={b.mention.color}/>
              <SummaryBox label="Taux de présence" value={b.attRate!=null?`${b.attRate}%`:'·'}/>
            </div>

            {/* moyennes par matière */}
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted mb-2">Résultats par matière</h3>
            {b.subjects.length? (
              <table className="w-full text-sm border border-line rounded-lg overflow-hidden mb-6">
                <thead><tr className="bg-canvas text-left text-[12px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-semibold">Matière</th>
                  <th className="px-3 py-2 font-semibold text-center">Évaluations</th>
                  <th className="px-3 py-2 font-semibold text-center">Moyenne</th>
                  <th className="px-3 py-2 font-semibold">Appréciation</th>
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {b.subjects.map(s=>{ const m=mentionFor(s.avg); return (
                    <tr key={s.subject}>
                      <td className="px-3 py-2 font-medium">{s.subject}</td>
                      <td className="px-3 py-2 text-center text-muted">{s.count}</td>
                      <td className="px-3 py-2 text-center font-bold" style={{color:m.color}}>{s.avg}/100</td>
                      <td className="px-3 py-2"><span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:m.color+'22',color:m.color}}>{m.label}</span></td>
                    </tr>) })}
                </tbody>
              </table>
            ) : <p className="text-sm text-muted mb-6">Aucune évaluation enregistrée pour cet élève.</p>}

            {/* présence détaillée */}
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5"><CalendarCheck size={14}/> Assiduité</h3>
            <div className="flex flex-wrap gap-3 mb-6 text-sm">
              <Pill color={STATUS.ok} label="Présences" value={b.att.present}/>
              <Pill color={STATUS.danger} label="Absences" value={b.att.absent}/>
              <Pill color={STATUS.warn} label="Retards" value={b.att.late}/>
              {b.attTotal===0 && <span className="text-muted">Aucun relevé de présence disponible.</span>}
            </div>

            {/* badges / distinctions */}
            {b.badges.length>0 && (<>
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5"><Award size={14}/> Distinctions</h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {b.badges.slice(0,8).map((bd,i)=><span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-full accent-soft accent-text inline-flex items-center gap-1">{bd.icon&&<Ic n={bd.icon} size={12}/>}{bd.label}</span>)}
              </div>
            </>)}

            {/* dernières observations */}
            {b.sessions.some(s=>s.note) && (<>
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted mb-2">Observations des enseignants</h3>
              <div className="space-y-2 mb-6">
                {b.sessions.filter(s=>s.note).slice(-3).reverse().map((s,i)=>(
                  <div key={i} className="text-sm border-l-2 border-line pl-3">
                    <span className="font-medium">{s.subject}</span> <span className="text-muted"> {s.teacher}</span>
                    <div className="text-muted">« {s.note} »</div>
                  </div>
                ))}
              </div>
            </>)}

            {/* pied / signatures */}
            <div className="grid grid-cols-2 gap-8 pt-6 mt-6 border-t border-line text-sm">
              <div><div className="text-muted text-xs">Signature de la Direction</div><div className="h-12 border-b border-line"/></div>
              <div><div className="text-muted text-xs">Signature du Parent / Tuteur</div><div className="h-12 border-b border-line"/></div>
            </div>
            <div className="text-[11px] text-muted text-center mt-6">Document généré par Coreon Edu : bulletin indicatif, sans valeur officielle dans cette démo.</div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}

function Line({k,v}){ return <div className="flex gap-1.5"><span className="text-muted">{k} :</span><span className="font-medium">{v||'·'}</span></div> }
function SummaryBox({label,value,accent,color}){
  return <div className={`rounded-xl border border-line p-3 text-center ${accent?'accent-soft':''}`}>
    <div className="text-2xl font-extrabold leading-none" style={color?{color}:accent?{}:{}}>{value}</div>
    <div className="text-[12px] text-muted mt-1">{label}</div>
  </div>
}
function Pill({color,label,value}){
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1"><i className="w-2.5 h-2.5 rounded-full" style={{background:color}}/><b>{value}</b> <span className="text-muted">{label}</span></span>
}
