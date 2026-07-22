// ════════════════════════════════════════════════════════════════════════════
// SUIVI DU COMPORTEMENT — encourager d'abord, jamais classer (règle n°9).
//
// L'enseignant et la direction OBSERVENT un élève (un geste, pas un formulaire) ;
// le parent voit le PARCOURS de son enfant — le sien, jamais celui des autres.
// Aucun classement, aucun « dernier de la classe ». Le cœur (behavior.js) tient
// la règle ; cet écran ne fait que la montrer.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { current } from '@core/auth.js'
import { db, studentById, classById, studentsOfClass } from '@core/db.js'
import {
  TRAITS, positiveTraits, toImproveTraits, traitOf,
  observe, removeEntry, entriesFor, studentSummary, classClimate,
} from '@core/behavior.js'
import { t } from '@core/i18n.js'
import { PageHead, Card, Btn, Avatar, EmptyState, STATUS, Modal, Field, Textarea, Select } from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

const TONE = { ok: STATUS.ok, warn: STATUS.warn }
const ago = ts => {
  const m = Math.round((Date.now() - ts) / 60000)
  if (m < 60) return `il y a ${m} min`
  const h = Math.round(m / 60); if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24); return `il y a ${d} j`
}

export default function Behavior() {
  const u = current()
  if (u.role === 'parent') return <ParentBehavior u={u} />
  return <StaffBehavior u={u} />
}

// ── L'enseignant / la direction : observer, en un geste ─────────────────────
function StaffBehavior({ u }) {
  const d = db()
  const [, force] = useState(0); const refresh = () => force(x => x + 1)
  const classes = d.classes.filter(c => studentsOfClass(c.id).length)
  const [classId, setClassId] = useState(classes[0]?.id)
  const [target, setTarget] = useState(null)   // élève qu'on observe
  const students = classId ? studentsOfClass(classId) : []
  const climate = classId ? classClimate(classId) : null

  return (<>
    <PageHead title={t('Suivi du comportement')} sub="On encourage d'abord. On observe un enfant : on ne le compare à personne."
      action={<Select value={classId} onChange={e => setClassId(e.target.value)} className="w-auto">
        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>} />

    {/* L'ambiance de la classe — une TENDANCE, pas un palmarès */}
    {climate && climate.total > 0 && (
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div><div className="text-xs text-muted font-bold uppercase">Ambiance · 30 jours</div>
            <div className="text-3xl font-extrabold" style={{ color: STATUS.ok }}>{climate.positiveRate}%<span className="text-base font-semibold text-muted"> d'encouragements</span></div></div>
          <div className="h-10 w-px bg-line hidden sm:block" />
          <div className="flex gap-2 flex-wrap flex-1">
            {Object.entries(climate.byTrait).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => {
              const tr = traitOf(k); if (!tr) return null
              return <span key={k} className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full" style={{ background: TONE[tr.tone] + '16', color: TONE[tr.tone] }}><Ic n={tr.icon} size={13} /> {tr.label} · {n}</span>
            })}
          </div>
        </div>
      </Card>
    )}

    {/* La classe : un élève, son solde, un clic pour observer */}
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {students.map(s => {
        const sum = studentSummary(s.id)
        return (
          <button key={s.id} onClick={() => setTarget(s)} className="card p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition flex items-center gap-3">
            <Avatar name={s.name} seed={s.id} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block font-bold truncate">{s.name}</span>
              <span className="block text-xs text-muted">{sum.positives} encouragement{sum.positives > 1 ? 's' : ''}{sum.toImprove ? ` · ${sum.toImprove} à suivre` : ''}</span>
            </span>
            <span className="text-lg font-extrabold tabular-nums" style={{ color: sum.score >= 0 ? STATUS.ok : STATUS.warn }}>{sum.score > 0 ? '+' : ''}{sum.score}</span>
          </button>
        )
      })}
      {!students.length && <Card className="sm:col-span-2 lg:col-span-3"><EmptyState icon="Users" title="Aucun élève dans cette classe" /></Card>}
    </div>

    {target && <ObserveModal student={target} u={u} onClose={() => { setTarget(null); refresh() }} />}
  </>)
}

// La fiche d'observation : les encouragements en grand, les rappels en dessous.
function ObserveModal({ student, u, onClose }) {
  const [note, setNote] = useState('')
  const [picked, setPicked] = useState(null)
  const [, force] = useState(0)
  const entries = entriesFor(student.id).filter(e => !e.removed)

  const submit = () => {
    if (!picked) return toast.error('Choisissez un comportement à noter.')
    const r = observe({ studentId: student.id, trait: picked, note, byId: u.id, byName: u.name })
    if (r.error) return toast.error(r.error)
    toast.success(TRAITS[picked].positive ? 'Encouragement noté : le parent est prévenu 👏' : 'Observation notée')
    setNote(''); setPicked(null); force(x => x + 1)
  }

  const Trait = ({ tr }) => (
    <button onClick={() => setPicked(tr.key)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-bold border-2 transition ${picked === tr.key ? 'text-white' : 'bg-white'}`}
      style={picked === tr.key ? { background: TONE[tr.tone], borderColor: TONE[tr.tone] } : { borderColor: TONE[tr.tone] + '55', color: TONE[tr.tone] }}>
      <Ic n={tr.icon} size={15} /> {tr.label}
    </button>
  )

  return (
    <Modal open onClose={onClose} size="xl" title={`${student.name} · ${classById(student.classId)?.name || ''}`}
      footer={<><Btn variant="ghost" onClick={onClose}>Fermer</Btn><Btn onClick={submit}>Enregistrer</Btn></>}>
      <div className="space-y-5">
        <div>
          <div className="text-sm font-bold mb-2" style={{ color: STATUS.ok }}>👏 Un encouragement</div>
          <div className="flex flex-wrap gap-2">{positiveTraits().map(tr => <Trait key={tr.key} tr={tr} />)}</div>
        </div>
        <div>
          <div className="text-sm font-bold mb-2 text-muted">À suivre · pour aider, jamais pour punir</div>
          <div className="flex flex-wrap gap-2">{toImproveTraits().map(tr => <Trait key={tr.key} tr={tr} />)}</div>
        </div>
        <Field label="Un mot (facultatif) : c'est ce que le parent lira">
          <Textarea value={note} onChange={e => setNote(e.target.value)} className="h-16" placeholder="A aidé un camarade à ranger la classe…" />
        </Field>

        {entries.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase text-muted mb-2">Le parcours de {student.name.split(' ')[0]}</div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto scroll-thin">
              {entries.map(e => { const tr = traitOf(e.trait); if (!tr) return null
                return (
                  <div key={e.id} className="flex items-center gap-2.5 text-sm rounded-xl px-2 py-1.5" style={{ background: TONE[tr.tone] + '10' }}>
                    <span className="w-7 h-7 grid place-items-center rounded-lg shrink-0" style={{ background: TONE[tr.tone] + '20', color: TONE[tr.tone] }}><Ic n={tr.icon} size={14} /></span>
                    <span className="min-w-0 flex-1"><span className="block font-semibold truncate">{tr.label}{e.note && <span className="font-normal text-muted"> {e.note}</span>}</span>
                      <span className="block text-[11px] text-muted">{e.byName} · {ago(e.at)}</span></span>
                    <button onClick={() => { removeEntry(e.id, u.name); force(x => x + 1) }} title="Retirer (tracé)" className="text-muted hover:text-ink shrink-0"><X size={14} /></button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Le parent : le parcours de SON enfant, l'encouragement en avant ─────────
function ParentBehavior({ u }) {
  const kids = (u.childIds || []).map(studentById).filter(Boolean)
  const [pickedId, setPickedId] = useState(kids[0]?.id)
  const child = kids.find(k => k.id === pickedId) || kids[0]
  if (!child) return <Card><EmptyState icon="Users" title="Aucun enfant associé" /></Card>
  const sum = studentSummary(child.id)
  const entries = entriesFor(child.id).filter(e => !e.removed)

  return (<>
    <PageHead title={t('Suivi du comportement')} sub={`Le parcours de ${child.name.split(' ')[0]}, au quotidien.`}
      action={kids.length > 1 && <Select value={child.id} onChange={e => setPickedId(e.target.value)} className="w-auto">
        {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}</Select>} />

    <div className="grid grid-cols-3 gap-3 mb-4">
      <Card className="p-4 text-center"><div className="text-3xl font-extrabold" style={{ color: STATUS.ok }}>{sum.positives}</div><div className="text-xs text-muted mt-0.5">encouragements</div></Card>
      <Card className="p-4 text-center"><div className="text-3xl font-extrabold" style={{ color: sum.score >= 0 ? STATUS.ok : STATUS.warn }}>{sum.score > 0 ? '+' : ''}{sum.score}</div><div className="text-xs text-muted mt-0.5">solde d'encouragement</div></Card>
      <Card className="p-4 text-center"><div className="text-3xl font-extrabold text-muted">{sum.toImprove}</div><div className="text-xs text-muted mt-0.5">à suivre ensemble</div></Card>
    </div>

    {sum.topTrait && traitOf(sum.topTrait) && (
      <Card className="p-4 mb-4 flex items-center gap-3" style={{ background: STATUS.ok + '0E' }}>
        <span className="w-11 h-11 grid place-items-center rounded-xl" style={{ background: STATUS.ok + '20', color: STATUS.ok }}><Ic n={traitOf(sum.topTrait).icon} size={20} /></span>
        <div><div className="text-xs text-muted">Ce pour quoi l'école le félicite le plus</div>
          <div className="font-extrabold">{traitOf(sum.topTrait).label}</div></div>
      </Card>
    )}

    <Card className="p-5">
      <h3 className="font-bold mb-3">Son parcours</h3>
      {entries.length === 0 ? <EmptyState icon="Sparkles" title="Rien encore" sub="Les observations des enseignants apparaîtront ici." />
        : <div className="space-y-2">
          {entries.map(e => { const tr = traitOf(e.trait); if (!tr) return null
            return (
              <div key={e.id} className="flex items-center gap-3 border-b border-line pb-2 last:border-0">
                <span className="w-9 h-9 grid place-items-center rounded-xl shrink-0" style={{ background: TONE[tr.tone] + '16', color: TONE[tr.tone] }}><Ic n={tr.icon} size={17} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{tr.label}{e.note && <span className="font-normal text-muted"> {e.note}</span>}</span>
                  <span className="block text-[11px] text-muted">{e.byName} · {ago(e.at)}</span></span>
              </div>
            )
          })}
        </div>}
    </Card>
  </>)
}
