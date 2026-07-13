// LES INSCRIPTIONS — le parcours réel, pas un formulaire de plus.
//
// La candidature DEVIENT l'élève, sans ressaisie. C'est le point exact que
// PowerSchool et Infinite Campus vendent en module premium (recherche 3-0) :
// la continuité des données entre la candidature et le dossier.
//
// La CAPACITÉ est vérifiée à l'inscription, pas à la candidature. Une classe
// pleine ne fait pas échouer le clic : elle bascule en liste d'attente. Le
// système ne ment jamais sur une place qu'il n'a pas.
import { useState } from 'react'
import {
  applications, appById, STAGES, docsFor, docsComplete, setDoc, advance,
  openClasses, enrol, summary, stageLabel,
} from '@core/admissions.js'
import { labelOf } from '@core/levels.js'
import { PageHead, Card, Btn, Badge, EmptyState, Avatar, Modal, STATUS } from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import toast from 'react-hot-toast'

const fmt = ts => new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

export default function Admissions() {
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)
  const [filter, setFilter] = useState('actives')
  const [open, setOpen] = useState(null)      // id de la candidature ouverte
  const s = summary()
  const all = applications()

  const rows = all.filter(a =>
    filter === 'toutes' ? true
    : filter === 'actives' ? !STAGES[a.stage]?.terminal
    : a.stage === filter)

  const go = (id, stage) => {
    const r = advance(id, stage)
    if (r.error) return toast.error(r.error)
    toast.success(`Candidature : ${stageLabel(stage)}`)
    refresh()
  }

  const a = open ? appById(open) : null

  return (
    <>
      <PageHead title="Inscriptions" sub="De la candidature en ligne à l’élève inscrit — sans jamais ressaisir." />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { k: 'Candidatures', v: s.total, i: 'Inbox' },
          { k: 'À traiter', v: s.nouvelle + s.pieces + s.examen, i: 'Clock' },
          { k: 'Acceptées', v: s.accepte, i: 'Check' },
          { k: 'Liste d’attente', v: s.attente, i: 'Hourglass' },
          { k: 'Inscrits', v: s.inscrit, i: 'UserCheck' },
        ].map(x => (
          <Card key={x.k} className="p-4">
            <div className="flex items-center gap-1.5 text-muted text-xs font-bold"><Ic n={x.i} size={13} />{x.k}</div>
            <div className="text-2xl font-extrabold mt-1 tabular-nums">{x.v}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {['actives', 'toutes', 'attente', 'inscrit', 'refuse'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-bold border transition
              ${filter === f ? 'text-white border-transparent accent-bg' : 'bg-white border-line text-muted'}`}>
            {f === 'actives' ? 'En cours' : f === 'toutes' ? 'Toutes' : stageLabel(f)}
          </button>
        ))}
      </div>

      {!rows.length && <EmptyState icon="Inbox" title="Aucune candidature ici."
        sub="Les candidatures déposées en ligne par les parents apparaissent dans cette liste." />}

      <div className="grid gap-3">
        {rows.map(x => {
          const st = STAGES[x.stage]
          const ready = docsComplete(x)
          return (
            <Card key={x.id} className="p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Avatar name={x.childName} seed={x.id} />
                  <div>
                    <div className="font-bold">{x.childName}</div>
                    <div className="text-xs text-muted font-semibold">
                      {labelOf(x.level)} · déposée le {fmt(x.createdAt)} · {x.parentName}
                    </div>
                  </div>
                </div>
                <Badge status={x.stage} label={st?.label} tone={st?.tone} />
              </div>

              {!STAGES[x.stage]?.terminal && (
                <div className="flex items-center gap-2 flex-wrap mt-4">
                  <button onClick={() => setOpen(x.id)}
                    className="text-[13px] font-bold flex items-center gap-1.5 accent-text">
                    <Ic n="Paperclip" size={14} />
                    Pièces {ready
                      ? <span style={{ color: STATUS.ok }}>· complètes</span>
                      : <span style={{ color: STATUS.warn }}>· incomplètes</span>}
                  </button>
                  <span className="flex-1" />
                  {st.next.map(n => (
                    <Btn key={n} size="sm" variant={n === 'refuse' ? 'ghost' : 'soft'}
                      onClick={() => n === 'inscrit' ? setOpen(x.id) : go(x.id, n)}>
                      {stageLabel(n)}
                    </Btn>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Le dossier : pièces + inscription. Un seul endroit, pas trois écrans. */}
      <Modal open={!!a} onClose={() => setOpen(null)} title={a ? `Dossier — ${a.childName}` : ''}>
        {a && (
          <div className="space-y-5">
            <div>
              <div className="text-sm font-bold mb-2">Pièces à fournir</div>
              <div className="grid gap-1.5">
                {docsFor(a.level).map(d => {
                  const on = !!a.docs?.[d.key]
                  return (
                    <button key={d.key}
                      onClick={() => { setDoc(a.id, d.key, !on); refresh() }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-left hover:border-ink/20">
                      <span className="text-[13px] font-semibold flex items-center gap-2">
                        <Ic n={on ? 'CheckCircle2' : 'Circle'} size={16}
                          style={{ color: on ? STATUS.ok : STATUS.neutral }} />
                        {d.label}
                        {d.required && <span className="text-[10px] font-extrabold uppercase text-muted">requis</span>}
                      </span>
                      <span className="text-xs font-bold" style={{ color: on ? STATUS.ok : STATUS.warn }}>
                        {on ? 'Fournie' : 'Manquante'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Inscrire : la capacité décide. Une classe pleine bascule en attente. */}
            {['accepte', 'attente'].includes(a.stage) && (
              <div>
                <div className="text-sm font-bold mb-1">Inscrire dans une classe</div>
                <p className="text-xs text-muted mb-2">
                  La place est vérifiée au moment de l’inscription. Si la classe est pleine,
                  la candidature passe en liste d’attente — nous ne promettons pas une place
                  qui n’existe pas.
                </p>
                <div className="grid gap-1.5">
                  {openClasses(a.level).map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
                      <span className="text-[13px] font-semibold">{c.name}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs font-bold tabular-nums"
                          style={{ color: c.free ? STATUS.ok : STATUS.danger }}>
                          {c.taken}/{c.capacity}
                        </span>
                        <Btn size="sm" disabled={!c.free}
                          onClick={() => {
                            const r = enrol(a.id, c.id)
                            if (r.error) { toast.error(r.error); refresh(); return }
                            toast.success(`${a.childName} est inscrit${''} en ${c.name}.`)
                            setOpen(null); refresh()
                          }}>
                          {c.free ? 'Inscrire' : 'Pleine'}
                        </Btn>
                      </span>
                    </div>
                  ))}
                  {!openClasses(a.level).length && (
                    <p className="text-[13px] text-muted">Aucune classe pour ce niveau.</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-bold mb-2">Historique</div>
              <div className="grid gap-1">
                {a.history.map((h, i) => (
                  <div key={i} className="text-[12px] text-muted flex items-center gap-2">
                    <Ic n="Dot" size={14} />
                    <b className="text-ink">{stageLabel(h.stage)}</b> · {fmt(h.at)} · {h.by}
                    {h.note && <span>— {h.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
