// BULLETINS & PASSAGE DE CLASSE.
// Le passage n'est pas « grade + 1 » : c'est un processus daté, irréversible, et
// qui touche à l'argent. On le montre AVANT de l'exécuter.
import { useState } from 'react'
import { current } from '@core/auth.js'
import { db } from '@core/db.js'
import {
  TERMS, ACQUIS, DOMAINS, MARK_MAX, PASS_MARK, DECISIONS, SUBJECTS,
  reportOf, saveReport, average, yearAverage,
  previewPromotion, runPromotion, promotions,
  archivedStudents, labelOf, isEarly,
  classGrid, saveClassReports, rowAverage, columnAverage,
} from '@core/academic.js'
import { money } from '@core/accounting.js'
import { subjectMeta } from '../subjects.jsx'
import {
  PageHead, Card, Btn, Badge, Modal, Tabs, EmptyState, Avatar, STATUS, SearchInput,
} from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import toast from 'react-hot-toast'


export default function Academic() {
  const [tab, setTab] = useState('bulletins')
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)
  return (
    <>
      <PageHead title="Bulletins & passage" sub="Les acquis, les moyennes : et le passage d’une année à l’autre." />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'bulletins', label: 'Bulletins' },
        { value: 'passage',   label: 'Passage de classe' },
        { value: 'archives',  label: 'Archives' },
      ]} />
      <div className="mt-5">
        {tab === 'bulletins' && <Bulletins refresh={refresh} />}
        {tab === 'passage'   && <Passage refresh={refresh} />}
        {tab === 'archives'  && <Archives />}
      </div>
    </>
  )
}

// ── BULLETINS ───────────────────────────────────────────────────────────────
function Bulletins({ refresh }) {
  const me = current()
  const d = db()
  const [term, setTerm] = useState('t1')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const [grid, setGrid] = useState(null)          // { classId } : saisie par classe

  const students = (d.students || [])
    .filter(s => !s.archived)
    .filter(s => s.name.toLowerCase().includes(q.toLowerCase()))

  const classes = (d.classes || [])
    .filter(c => (d.students || []).some(s => s.classId === c.id && !s.archived))

  if (grid) return (
    <ClassGrid classId={grid.classId} term={term} me={me}
      onClose={() => { setGrid(null); refresh() }} />
  )

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <Tabs value={term} onChange={setTerm} tabs={TERMS.map(t => ({ value: t.key, label: t.label }))} />
        <span className="flex-1" />
        <SearchInput value={q} onChange={setQ} placeholder="Chercher un élève…" />
      </div>

      {/* CR-022 : noter la classe entière d'un coup. Saisir élève par élève est
          la tâche la plus répétitive du métier ; c'est là que le produit fait
          gagner du temps, ou en fait perdre. */}
      <Card className="p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold">Noter toute une classe</span>
          <span className="text-xs text-muted">une grille, au clavier, sans ouvrir chaque élève</span>
          <span className="flex-1" />
          {classes.map(c => (
            <Btn key={c.id} size="sm" variant="soft" onClick={() => setGrid({ classId: c.id })}>
              {c.name}
            </Btn>
          ))}
        </div>
      </Card>

      <div className="grid gap-2">
        {students.map(s => {
          const cls = (d.classes || []).find(c => c.id === s.classId)
          const early = isEarly(cls?.level)
          const r = reportOf(s.id, term)
          const avg = average(r)
          return (
            <Card key={s.id} className="p-4 flex items-center gap-3 flex-wrap">
              <Avatar name={s.name} seed={s.id} />
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{s.name}</div>
                <div className="text-xs text-muted font-semibold">{labelOf(cls?.level)}</div>
              </div>
              <span className="flex-1" />
              {r
                ? early
                  // En petite enfance : PAS de moyenne. Des acquis. Un enfant de
                  // trois ans n'a pas une note sur 20 — il a des choses qu'il sait
                  // faire, et d'autres qu'il découvre.
                  ? <span className="text-xs font-bold" style={{ color: STATUS.ok }}>
                      {Object.values(r.marks).filter(v => v === 'acquis').length}/{DOMAINS.length} acquis
                    </span>
                  : <span className="text-lg font-extrabold tabular-nums"
                      style={{ color: avg >= PASS_MARK ? STATUS.ok : STATUS.danger }}>
                      {avg ?? '·'}<span className="text-xs text-muted">/{MARK_MAX}</span>
                    </span>
                : <span className="text-xs font-bold" style={{ color: STATUS.warn }}>Pas de bulletin</span>}
              <Btn size="sm" variant="soft" onClick={() => setOpen({ s, cls, early, r })}>
                {r ? 'Modifier' : 'Saisir'}
              </Btn>
            </Card>
          )
        })}
      </div>

      {open && (
        <ReportModal open={open} term={term} me={me}
          onClose={() => setOpen(null)} onSaved={() => { setOpen(null); refresh() }} />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LA GRILLE DE CLASSE (CR-022)
//
// Élèves en lignes, matières en colonnes. Entrée et ↓ descendent la colonne :
// on note une matière pour toute la classe sans jamais lâcher le clavier, ce
// qui est la façon dont on note réellement — matière par matière, pas élève
// par élève.
//
// La saisie PARTIELLE est normale : un enseignant est interrompu. On enregistre
// ce qui est saisi, et une case laissée vide n'efface jamais une note déjà là.
// ════════════════════════════════════════════════════════════════════════════
function ClassGrid({ classId, term, me, onClose }) {
  const g = classGrid(classId, term)
  const [rows, setRows] = useState(g.rows)
  const [dirty, setDirty] = useState(false)
  const cls = (db().classes || []).find(c => c.id === classId)

  const set = (sid, key, v) => { setRows(r => ({ ...r, [sid]: { ...r[sid], [key]: v } })); setDirty(true) }

  // Entrée / ↓ / ↑ : on descend ou remonte la MÊME colonne.
  const onKey = (e, si, ci) => {
    const move = e.key === 'Enter' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!move) return
    e.preventDefault()
    const next = document.querySelector(`[data-cell="${si + move}-${ci}"]`)
    if (next) { next.focus(); next.select?.() }
  }

  const save = () => {
    const r = saveClassReports({ classId, term, rows, by: me.name })
    if (r.invalid) toast.error(`${r.invalid} note(s) hors barème : non enregistrée(s).`)
    if (r.saved) toast.success(`${r.saved} bulletin(s) enregistré(s) · ${cls?.name}.`)
    else if (!r.invalid) toast(`Rien de nouveau à enregistrer.`)
    setDirty(false)
    if (r.saved) onClose()
  }

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <Btn variant="ghost" size="sm" onClick={onClose}>
          <Ic n="ArrowLeft" size={15} className="rtl:-scale-x-100" /> Tous les élèves
        </Btn>
        <div>
          <div className="font-extrabold">{cls?.name}</div>
          <div className="text-xs text-muted">
            {TERMS.find(t => t.key === term)?.label} · {g.students.length} élèves
          </div>
        </div>
        <span className="flex-1" />
        <Btn onClick={save} disabled={!dirty}>Enregistrer la classe</Btn>
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-canvas">
              <th className="text-start p-3 font-bold sticky start-0 bg-canvas z-10 min-w-[180px]">Élève</th>
              {g.columns.map(c => (
                <th key={c.key} className="p-3 font-bold text-center whitespace-nowrap">
                  {c.label}
                  {!g.early && <div className="text-[10px] font-normal text-muted">/{MARK_MAX}</div>}
                </th>
              ))}
              {!g.early && <th className="p-3 font-bold text-center">Moyenne</th>}
            </tr>
          </thead>
          <tbody>
            {g.students.map((s, si) => {
              const avg = rowAverage(rows[s.id])
              return (
                <tr key={s.id} className="border-t border-line">
                  <td className="p-2 sticky start-0 bg-white z-10">
                    <div className="flex items-center gap-2">
                      <Avatar name={s.name} seed={s.id} size={26} />
                      <span className="font-semibold text-[13px] truncate">{s.name}</span>
                    </div>
                  </td>
                  {g.columns.map((c, ci) => (
                    <td key={c.key} className="p-2 text-center">
                      {g.early ? (
                        <select data-cell={`${si}-${ci}`} value={rows[s.id]?.[c.key] || ''}
                          onChange={e => set(s.id, c.key, e.target.value)}
                          onKeyDown={e => onKey(e, si, ci)}
                          className="rounded-lg border border-line px-2 py-1.5 text-[13px] accent-ring">
                          <option value=""></option>
                          {ACQUIS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                        </select>
                      ) : (
                        <input data-cell={`${si}-${ci}`} type="number" min={0} max={MARK_MAX} step={0.25}
                          value={rows[s.id]?.[c.key] ?? ''}
                          onChange={e => set(s.id, c.key, e.target.value)}
                          onKeyDown={e => onKey(e, si, ci)}
                          className="w-20 text-center rounded-lg border border-line px-2 py-1.5 text-[13px] accent-ring tabular-nums" />
                      )}
                    </td>
                  ))}
                  {!g.early && (
                    <td className="p-2 text-center font-extrabold tabular-nums"
                      style={{ color: avg == null ? 'var(--color-muted)' : avg >= PASS_MARK ? STATUS.ok : STATUS.danger }}>
                      {avg ?? '·'}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          {!g.early && (
            <tfoot>
              <tr className="border-t-2 border-line bg-canvas">
                <td className="p-3 font-bold sticky start-0 bg-canvas">Moyenne de la classe</td>
                {g.columns.map(c => {
                  const a = columnAverage(rows, c.key)
                  return (
                    <td key={c.key} className="p-3 text-center font-extrabold tabular-nums"
                      style={{ color: a == null ? 'var(--color-muted)' : a >= PASS_MARK ? STATUS.ok : STATUS.danger }}>
                      {a ?? '·'}
                    </td>
                  )
                })}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </Card>

      <p className="text-xs text-muted mt-3">
        Entrée ou ↓ descend la colonne : on note une matière pour toute la classe sans lâcher le clavier.
        Une case laissée vide n’efface jamais une note déjà enregistrée.
      </p>
    </>
  )
}

function ReportModal({ open, term, me, onClose, onSaved }) {
  const { s, early, r } = open
  const [marks, setMarks] = useState(r?.marks || {})
  const [comment, setComment] = useState(r?.comment || '')

  const save = () => {
    saveReport({ studentId: s.id, term, marks, comment, by: me.name })
    toast.success(`Bulletin enregistré · ${s.name}.`)
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={`Bulletin · ${s.name}`} size="xl"
      footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={save}>Enregistrer</Btn></>}>
      {early ? (
        // ── PETITE ENFANCE : des acquis observés, jamais une note ──────────────
        <div className="grid gap-2">
          <p className="text-xs text-muted mb-1">
            En petite enfance, on n’attribue pas de note : on observe des acquis.
          </p>
          {DOMAINS.map(dm => (
            <div key={dm.key} className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold w-52">{dm.label}</span>
              {ACQUIS.map(a => {
                const on = marks[dm.key] === a.key
                return (
                  <button key={a.key} onClick={() => setMarks({ ...marks, [dm.key]: a.key })}
                    className="px-3 py-1.5 rounded-full text-[13px] font-bold border transition"
                    style={on
                      ? { background: STATUS[a.tone], color: '#fff', borderColor: 'transparent' }
                      : { borderColor: 'var(--color-line)', background: '#fff' }}>
                    {a.label}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      ) : (
        // ── PRIMAIRE : une note sur 20 ────────────────────────────────────────
        <div className="grid gap-2">
          {SUBJECTS.map(sub => {
            const { Icon, color } = subjectMeta(sub)
            return (
              <div key={sub} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
                  style={{ background: color + '16', color }}><Icon size={15} /></span>
                <span className="text-[13px] font-semibold flex-1">{sub}</span>
                <input type="number" min={0} max={MARK_MAX} step={0.25}
                  value={marks[sub] ?? ''}
                  onChange={e => setMarks({ ...marks, [sub]: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="w-24 text-right rounded-lg border border-line px-2 py-1.5 text-sm accent-ring tabular-nums" />
                <span className="text-xs text-muted w-8">/{MARK_MAX}</span>
              </div>
            )
          })}
        </div>
      )}
      <div className="mt-4">
        <div className="text-xs font-semibold text-muted mb-1">Appréciation</div>
        <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Un trimestre appliqué. Continue ainsi."
          className="w-full rounded-xl border border-line px-3 py-2 text-sm accent-ring" />
      </div>
    </Modal>
  )
}

// ── PASSAGE DE CLASSE ───────────────────────────────────────────────────────
function Passage({ refresh }) {
  const me = current()
  const [confirm, setConfirm] = useState(false)
  const p = previewPromotion()
  const past = promotions()

  const run = allowBlocked => {
    const r = runPromotion(me.name, { allowBlocked })
    if (r.error) return toast.error(r.error)
    toast.success(`Passage effectué : ${r.summary.passe} passent, ${r.summary.redouble} redoublent, ${r.summary.diplome} sortent.`)
    setConfirm(false); refresh()
  }

  return (
    <>
      <Card className="p-5 mb-4" style={{ background: STATUS.infoSoft }}>
        <div className="flex items-start gap-3">
          <Ic n="Info" size={18} style={{ color: STATUS.info }} />
          <div className="text-[13px]">
            <b>Un passage de classe est irréversible et touche à l’argent.</b> Le niveau change,
            donc le barème change, donc la facture de l’an prochain change. Vous voyez tout
            ci-dessous <b>avant</b> que quoi que ce soit ne bouge.
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {Object.values(DECISIONS).map(dc => (
          <Card key={dc.key} className="p-4">
            <div className="text-xs font-bold text-muted">{dc.label}</div>
            <div className="text-2xl font-extrabold mt-1 tabular-nums"
              style={{ color: STATUS[dc.tone] }}>{p.summary[dc.key]}</div>
          </Card>
        ))}
      </div>

      {p.summary.bloque > 0 && (
        <Card className="p-5 mb-4" style={{ background: STATUS.dangerSoft }}>
          <div className="flex items-start gap-3">
            <Ic n="TriangleAlert" size={18} style={{ color: STATUS.danger }} />
            <div className="text-[13px]">
              <b>{p.summary.bloque} élève(s) n’ont pas de place dans le niveau supérieur.</b>
              <div className="mt-1">Ouvrez une classe, ou confirmez pour les laisser où ils sont : mais le produit ne les fera pas disparaître en silence.</div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-end mb-3">
        <Btn onClick={() => setConfirm(true)}><Ic n="ArrowRightLeft" size={15} /> Exécuter le passage</Btn>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-muted border-b border-line">
                <th className="px-5 py-3">Élève</th>
                <th className="px-3 py-3">Niveau</th>
                <th className="px-3 py-3 text-right">Moyenne</th>
                <th className="px-3 py-3">Décision</th>
                <th className="px-3 py-3">Vers</th>
                <th className="px-5 py-3 text-right">Effet sur les frais</th>
              </tr>
            </thead>
            <tbody>
              {p.rows.map(r => {
                const dc = DECISIONS[r.decision]
                return (
                  <tr key={r.student.id} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="px-5 py-2.5 font-semibold">{r.student.name}</td>
                    <td className="px-3 py-2.5 text-muted">{labelOf(r.from)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {r.average != null
                        ? <span style={{ color: r.average >= PASS_MARK ? STATUS.ok : STATUS.danger }}>{r.average}</span>
                        : <span className="text-muted text-xs">acquis</span>}
                    </td>
                    <td className="px-3 py-2.5"><Badge label={dc.label} tone={dc.tone} /></td>
                    <td className="px-3 py-2.5 text-muted">
                      {r.toClass ? r.toClass.name : r.decision === 'diplome' ? 'Sort de l’école' : '·'}
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums">
                      {r.feeDelta === 0 ? <span className="text-muted"> </span>
                        : <span style={{ color: r.feeDelta > 0 ? STATUS.warn : STATUS.ok }}>
                            {r.feeDelta > 0 ? '+' : ''}{money(r.feeDelta)}
                          </span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {!!past.length && (
        <Card className="p-5 mt-4">
          <div className="text-sm font-bold mb-2">Passages précédents</div>
          {past.map(x => (
            <div key={x.id} className="text-[13px] text-muted">
              {new Date(x.at).toLocaleDateString('fr-FR')} · par {x.by} · {x.summary.passe} passés,
              {' '}{x.summary.redouble} redoublants, {x.summary.diplome} diplômés
            </div>
          ))}
        </Card>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Exécuter le passage de classe"
        footer={<>
          <Btn variant="ghost" onClick={() => setConfirm(false)}>Annuler</Btn>
          {p.summary.bloque > 0 && <Btn variant="soft" onClick={() => run(true)}>Exécuter quand même</Btn>}
          <Btn onClick={() => run(false)}>Confirmer</Btn>
        </>}>
        <p className="text-sm">
          <b>{p.summary.passe}</b> élèves passeront au niveau supérieur,
          {' '}<b>{p.summary.redouble}</b> redoubleront,
          {' '}<b>{p.summary.diplome}</b> quitteront l’école (leur dossier sera <b>archivé</b>, jamais supprimé).
        </p>
        <p className="text-sm text-muted mt-3">
          Cette opération est datée et signée à votre nom. Elle ne s’annule pas d’un clic.
        </p>
      </Modal>
    </>
  )
}

// ── ARCHIVES ────────────────────────────────────────────────────────────────
function Archives() {
  const rows = archivedStudents()
  if (!rows.length) return <EmptyState icon="Archive" title="Aucun dossier archivé."
    sub="Les élèves diplômés ou partis restent ici : un dossier scolaire ne se supprime jamais." />
  return (
    <div className="grid gap-2">
      {rows.map(s => (
        <Card key={s.id} className="p-4 flex items-center gap-3">
          <Avatar name={s.name} seed={s.id} />
          <div>
            <div className="font-bold text-sm">{s.name}</div>
            <div className="text-xs text-muted">
              {s.archivedReason} · {new Date(s.archivedAt).toLocaleDateString('fr-FR')}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
