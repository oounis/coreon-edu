// ════════════════════════════════════════════════════════════════════════════
// LE JOURNAL DU JOUR — petite enfance.
//
// Deux écrans dans un seul fichier, parce que c'est le même objet vu des deux
// côtés : l'éducatrice le REMPLIT, le parent le LIT.
//
// Recherche (kogia-research, vérifié 3-0) : c'est « le plus grand écart de
// capacité entre les plateformes petite enfance et les ERP scolaires ».
// PowerSchool, iSAMS, Classter ne l'ont pas. Famly et Procare l'ont — mais ne
// font pas l'école. Coreon EDU fait les deux.
//
// RÈGLE D'ERGONOMIE : une éducatrice a un enfant dans les bras. Chaque
// enregistrement se fait en UN geste, jamais en remplissant un formulaire.
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import { current } from '@core/auth.js'
import { db } from '@core/db.js'
import { todayIso } from '@core/clock.js'
import { isEarly } from '@core/levels.js'
import {
  MEALS, ATE, MOODS, DIAPER,
  entry, entriesOfDay, setMeal, startNap, endNap, addDiaper, setMood, setNote,
  sendToParents, isSent, isNapping, napMinutes, classSummary,
} from '@core/journal.js'
import { PageHead, Card, Btn, EmptyState, Avatar, STATUS } from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import toast from 'react-hot-toast'

const hhmm = ts => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** Une pastille de choix. Un geste, pas un formulaire. */
function Pick({ label, icon, on, tone = 'brand', onClick }) {
  const c = tone === 'brand' ? null : STATUS[tone]
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-bold border transition
        ${on ? 'text-white border-transparent' : 'bg-white border-line text-ink hover:border-ink/30'}`}
      style={on ? { background: c || 'var(--accent)' } : {}}>
      {icon && <Ic n={icon} size={14} />}{label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// L'ÉDUCATRICE
// ─────────────────────────────────────────────────────────────────────────────
function TeacherJournal({ classes }) {
  const [classId, setClassId] = useState(classes[0]?.id)
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)
  const date = todayIso()
  const rows = classId ? entriesOfDay(classId, date) : []
  const sum = classId ? classSummary(classId, date) : null

  const send = child => {
    sendToParents(child.id, date); refresh()
    toast.success(`Journée de ${child.name.split(' ')[0]} envoyée à ses parents`)
  }

  return (
    <>
      <PageHead title="Journal du jour" sub="Repas, sieste, change, humeur : en un geste. Envoyé aux parents en fin de journée." />

      <div className="flex flex-wrap gap-2 mb-4">
        {classes.map(c => (
          <Pick key={c.id} label={c.name} on={c.id === classId} onClick={() => setClassId(c.id)} />
        ))}
      </div>

      {sum && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { k: 'Enfants', v: sum.total, i: 'Baby' },
            { k: 'En sieste', v: sum.napping, i: 'Moon' },
            { k: 'Sans repas noté', v: sum.noMeal, i: 'UtensilsCrossed' },
            { k: 'Journées envoyées', v: `${sum.sent}/${sum.total}`, i: 'Send' },
          ].map(s => (
            <Card key={s.k} className="p-4">
              <div className="flex items-center gap-2 text-muted text-xs font-bold"><Ic n={s.i} size={14} />{s.k}</div>
              <div className="text-2xl font-extrabold mt-1 tabular-nums">{s.v}</div>
            </Card>
          ))}
        </div>
      )}

      {!rows.length && <EmptyState icon="Baby" title="Aucun enfant dans cette classe."
        sub="Ajoutez des enfants depuis la page Élèves." />}

      <div className="grid gap-3">
        {rows.map(({ child, j }) => {
          const napping = isNapping(j)
          const mins = napMinutes(j)
          const sent = isSent(j)
          return (
            <Card key={child.id} className="p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <Avatar name={child.name} seed={child.id} />
                  <div>
                    <div className="font-bold">{child.name}</div>
                    {child.allergies && child.allergies !== 'Aucune' && (
                      <div className="text-xs font-bold flex items-center gap-1" style={{ color: STATUS.danger }}>
                        <Ic n="TriangleAlert" size={12} /> Allergie : {child.allergies}
                      </div>
                    )}
                  </div>
                </div>
                {sent
                  ? <span className="text-xs font-bold flex items-center gap-1" style={{ color: STATUS.ok }}>
                      <Ic n="Check" size={14} /> Envoyé à {hhmm(j.sentAt)}
                    </span>
                  : <Btn size="sm" onClick={() => send(child)}><Ic n="Send" size={14} /> Envoyer la journée</Btn>}
              </div>

              {/* Repas — ce que l'enfant a RÉELLEMENT mangé, pas ce qui a été servi. */}
              <div className="mb-3">
                <div className="text-xs font-bold text-muted mb-1.5">Repas</div>
                <div className="grid gap-1.5">
                  {MEALS.map(m => (
                    <div key={m.key} className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold w-32 flex items-center gap-1.5">
                        <Ic n={m.icon} size={14} className="text-muted" />{m.label}
                      </span>
                      {ATE.map(a => (
                        <Pick key={a.key} label={a.label} tone={a.tone}
                          on={j.meals?.[m.key] === a.key}
                          onClick={() => { setMeal(child.id, m.key, a.key, date); refresh() }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sieste — on note le début, puis la fin. Comme dans la vraie vie. */}
              <div className="mb-3">
                <div className="text-xs font-bold text-muted mb-1.5">Sieste</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {napping
                    ? <Btn size="sm" variant="soft" onClick={() => { endNap(child.id, date); refresh() }}>
                        <Ic n="Sunrise" size={14} /> Réveillé
                      </Btn>
                    : <Btn size="sm" variant="soft" onClick={() => { startNap(child.id, date); refresh() }}>
                        <Ic n="Moon" size={14} /> S'endort
                      </Btn>}
                  {napping && <span className="text-xs font-bold" style={{ color: STATUS.info }}>Dort depuis {hhmm(j.naps.at(-1).from)}</span>}
                  {mins > 0 && <span className="text-xs text-muted font-semibold tabular-nums">{mins} min au total</span>}
                </div>
              </div>

              {/* Change — crèche et pré-maternelle uniquement. */}
              <div className="mb-3">
                <div className="text-xs font-bold text-muted mb-1.5">Change</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {DIAPER.map(dp => (
                    <Pick key={dp.key} label={dp.label} tone={dp.tone}
                      onClick={() => { addDiaper(child.id, dp.key, date); refresh() }} />
                  ))}
                  {!!j.diapers?.length && (
                    <span className="text-xs text-muted font-semibold">
                      {j.diapers.length} aujourd'hui · dernier à {hhmm(j.diapers.at(-1).at)}
                    </span>
                  )}
                </div>
              </div>

              {/* Humeur — observée, jamais jugée. */}
              <div className="mb-3">
                <div className="text-xs font-bold text-muted mb-1.5">Humeur</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {MOODS.map(m => (
                    <Pick key={m.key} label={m.label} icon={m.icon} on={j.mood === m.key}
                      onClick={() => { setMood(child.id, m.key, date); refresh() }} />
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-muted mb-1.5">Un mot pour les parents</div>
                <textarea rows={2} defaultValue={j.note}
                  onBlur={e => { setNote(child.id, e.target.value, date); refresh() }}
                  placeholder="Il a beaucoup ri au moment des chansons."
                  className="w-full rounded-xl border border-line px-3 py-2 text-sm accent-ring" />
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LE PARENT — ce qu'il veut savoir en rentrant du travail.
// A-t-il mangé, a-t-il dormi, comment allait-il. Pas une note sur 20.
// ─────────────────────────────────────────────────────────────────────────────
function ParentJournal({ children }) {
  const date = todayIso()
  return (
    <>
      <PageHead title="La journée de mon enfant" sub="Ce que l'école a partagé aujourd'hui." />
      <div className="grid gap-4">
        {children.map(child => {
          const j = entry(child.id, date)
          const sent = isSent(j)
          const mins = napMinutes(j)
          const mood = MOODS.find(m => m.key === j.mood)
          if (!sent) {
            return (
              <Card key={child.id} className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar name={child.name} seed={child.id} />
                  <div className="font-bold">{child.name}</div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Ic n="Clock" size={15} />
                  La journée est en cours. Elle vous sera envoyée en fin d'après-midi.
                </div>
              </Card>
            )
          }
          return (
            <Card key={child.id} className="p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <Avatar name={child.name} seed={child.id} />
                  <div>
                    <div className="font-bold">{child.name}</div>
                    <div className="text-xs text-muted font-semibold">Envoyé à {hhmm(j.sentAt)}</div>
                  </div>
                </div>
                {mood && (
                  <span className="flex items-center gap-1.5 text-sm font-bold accent-text">
                    <Ic n={mood.icon} size={17} />{mood.label}
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-xl p-3" style={{ background: STATUS.okSoft }}>
                  <div className="text-xs font-bold text-muted flex items-center gap-1.5 mb-1.5">
                    <Ic n="UtensilsCrossed" size={13} /> Repas
                  </div>
                  {MEALS.filter(m => j.meals?.[m.key]).map(m => (
                    <div key={m.key} className="text-[13px] flex justify-between">
                      <span>{m.label}</span>
                      <b>{ATE.find(a => a.key === j.meals[m.key])?.label}</b>
                    </div>
                  ))}
                  {!Object.keys(j.meals || {}).length && <div className="text-[13px] text-muted">Rien de noté.</div>}
                </div>

                <div className="rounded-xl p-3" style={{ background: STATUS.infoSoft }}>
                  <div className="text-xs font-bold text-muted flex items-center gap-1.5 mb-1.5">
                    <Ic n="Moon" size={13} /> Sieste
                  </div>
                  <div className="text-2xl font-extrabold tabular-nums">{mins}<span className="text-sm font-bold text-muted"> min</span></div>
                  {j.naps?.filter(n => n.to).map((n, i) => (
                    <div key={i} className="text-[12px] text-muted">{hhmm(n.from)} → {hhmm(n.to)}</div>
                  ))}
                </div>

                <div className="rounded-xl p-3" style={{ background: STATUS.neutralSoft }}>
                  <div className="text-xs font-bold text-muted flex items-center gap-1.5 mb-1.5">
                    <Ic n="Baby" size={13} /> Change
                  </div>
                  <div className="text-2xl font-extrabold tabular-nums">{j.diapers?.length || 0}</div>
                  {!!j.diapers?.length && (
                    <div className="text-[12px] text-muted">Dernier à {hhmm(j.diapers.at(-1).at)}</div>
                  )}
                </div>
              </div>

              {j.note && (
                <div className="mt-4 rounded-xl p-4 accent-soft">
                  <div className="text-xs font-bold text-muted mb-1">Un mot de l'éducatrice</div>
                  <p className="text-sm">{j.note}</p>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Journal() {
  const u = current()
  const d = db()

  if (u.role === 'parent') {
    // On ne montre le journal QUE pour les enfants en petite enfance. Le parent
    // qui a AUSSI un grand voit ses notes ailleurs — même application, un seul
    // compte. C'est exactement ce que personne d'autre ne sait faire.
    const kids = (d.students || [])
      .filter(s => (u.childIds || []).includes(s.id))
      .filter(s => isEarly((d.classes || []).find(c => c.id === s.classId)?.level))
    if (!kids.length) {
      return <EmptyState icon="Baby" title="Aucun enfant en petite enfance."
        sub="Le journal du jour concerne la crèche et la maternelle." />
    }
    return <ParentJournal children={kids} />
  }

  const early = (d.classes || []).filter(c => isEarly(c.level))
  const mine = u.role === 'teacher'
    ? early.filter(c => ((d.teachers || []).find(t => t.email === u.email)?.classes || []).includes(c.id))
    : early
  if (!mine.length) {
    return <EmptyState icon="Baby" title="Aucune classe de petite enfance."
      sub="Le journal du jour concerne la crèche et la maternelle." />
  }
  return <TeacherJournal classes={mine} />
}
