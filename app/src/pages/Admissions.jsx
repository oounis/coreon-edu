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
  applications, appById, STAGES, docsFor, docsComplete, hasDoc, setFiles, advance,
  openClasses, enrol, summary, stageLabel,
} from '@core/admissions.js'
import Attach from '../components/Attach.jsx'
import { labelOf } from '@core/levels.js'
import { PageHead, Card, Btn, Badge, EmptyState, Avatar, Modal, STATUS } from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import toast from 'react-hot-toast'

const fmt = ts => new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
const ageOf = dob => {
  const d = new Date(dob); if (isNaN(d)) return null
  const n = new Date(); let a = n.getFullYear() - d.getFullYear()
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--
  return a
}
const Info = ({ label, value }) => (
  <div>
    <div className="text-[11px] font-extrabold uppercase tracking-wide text-muted">{label}</div>
    <div className="text-sm font-semibold mt-0.5">{value}</div>
  </div>
)

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
      <PageHead title="Inscriptions" sub="De la candidature en ligne à l’élève inscrit : sans jamais ressaisir." />

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

      {/* Des LIGNES, pas des pavés : tout tient à l'écran, et TOUTE la ligne
          s'ouvre — le dossier complet vit dans la fiche, les actions aussi.
          (Demande d'Othman, 2026-07-14 : « clickable with full details ».) */}
      {rows.length > 0 && (
        <Card className="p-0 overflow-hidden divide-y divide-line">
          {rows.map(x => {
            const st = STAGES[x.stage]
            const ready = docsComplete(x)
            return (
              <button key={x.id} onClick={() => setOpen(x.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-canvas transition group">
                <Avatar name={x.childName} seed={x.id} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold truncate group-hover:accent-text">{x.childName}</span>
                  <span className="block text-xs text-muted truncate">
                    {labelOf(x.level)} · {x.parentName} · {fmt(x.createdAt)}
                  </span>
                </span>
                {!st?.terminal && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold shrink-0"
                    style={{ color: ready ? STATUS.ok : STATUS.warn }}>
                    <Ic n="Paperclip" size={12} /> {ready ? 'complètes' : 'incomplètes'}
                  </span>
                )}
                <Badge status={x.stage} label={st?.label} tone={st?.tone} />
                <Ic n="ChevronRight" size={15} className="text-muted shrink-0" />
              </button>
            )
          })}
        </Card>
      )}

      {/* Le dossier COMPLET : identité, contact, pièces, inscription, décision,
          historique. Un seul endroit, pas trois écrans. */}
      <Modal open={!!a} onClose={() => setOpen(null)} size="xl"
        title={a ? `Dossier · ${a.childName}` : ''}
        footer={a && !STAGES[a.stage]?.terminal && (
          <>
            {STAGES[a.stage].next.filter(n => n !== 'inscrit').map(n => (
              <Btn key={n} variant={n === 'refuse' ? 'ghost' : 'primary'}
                onClick={() => go(a.id, n)}>{stageLabel(n)}</Btn>
            ))}
          </>
        )}>
        {a && (
          <div className="space-y-5">
            {/* L'identité et le contact — ce que la direction cherche en premier. */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge status={a.stage} label={STAGES[a.stage]?.label} tone={STAGES[a.stage]?.tone} />
              <span className="text-xs text-muted">déposée le {fmt(a.createdAt)}</span>
              <span className="ml-auto text-xs font-bold tabular-nums rounded-lg border border-line px-2 py-1">Réf. {a.id.toUpperCase()}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              <Info label="Enfant" value={a.childName} />
              <Info label="Naissance" value={a.dob ? `${a.dob}${ageOf(a.dob) != null ? ` · ${ageOf(a.dob)} ans` : ''}` : '·'} />
              <Info label="Niveau demandé" value={labelOf(a.level)} />
              <Info label="Parent / tuteur" value={a.parentName} />
              <Info label="Téléphone" value={a.parentPhone
                ? <a href={`tel:${a.parentPhone}`} className="accent-text font-bold">{a.parentPhone}</a> : '·'} />
              <Info label="E-mail" value={a.parentEmail
                ? <a href={`mailto:${a.parentEmail}`} className="accent-text font-bold">{a.parentEmail}</a> : '·'} />
            </div>
            {a.note && (
              <div className="rounded-xl border border-line bg-canvas px-4 py-3">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-muted mb-1">Mot du parent</div>
                <p className="text-sm">{a.note}</p>
              </div>
            )}

            <div>
              <div className="text-sm font-bold mb-1">Pièces</div>
              {/* On OUVRE le document. Avant, on cochait une case alors qu'AUCUN
                  fichier n'existait : l'école croyait détenir la pièce. */}
              <p className="text-xs text-muted mb-2">
                Ce que le parent a joint. L’administration peut compléter ce qui arrive au guichet.
              </p>
              <Attach
                types={docsFor(a.level)}
                value={a.files || []}
                onChange={files => { setFiles(a.id, files); refresh() }} />
              {!docsComplete(a) && (
                <p className="text-[12px] mt-2" style={{ color: STATUS.warn }}>
                  Il manque : {docsFor(a.level).filter(d => d.required && !hasDoc(a, d.key)).map(d => d.label).join(', ')}.
                </p>
              )}
            </div>

            {/* Inscrire : la capacité décide. Une classe pleine bascule en attente. */}
            {['accepte', 'attente'].includes(a.stage) && (
              <div>
                <div className="text-sm font-bold mb-1">Inscrire dans une classe</div>
                <p className="text-xs text-muted mb-2">
                  La place est vérifiée au moment de l’inscription. Si la classe est pleine,
                  la candidature passe en liste d’attente : nous ne promettons pas une place
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
                    <b className="text-ink">{stageLabel(h.stage)}</b> {fmt(h.at)} · {h.by}
                    {h.note && <span>· {h.note}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Emails au candidat : accusé + chaque décision. Un prospect sans
                compte n'est joignable QUE par email — on montre ce qui est parti. */}
            <div>
              <div className="text-sm font-bold mb-2 flex items-center gap-2">
                <Ic n="Mail" size={15} /> Emails au candidat
              </div>
              {a.parentEmail ? (
                (a.emails?.length ? (
                  <div className="grid gap-1">
                    {a.emails.map(e => (
                      <div key={e.id} className="text-[12px] text-muted flex items-center gap-2">
                        <Ic n={e.status === 'envoyé' ? 'MailCheck' : e.status === 'échec' ? 'MailX' : 'MailPlus'} size={14} />
                        <b className="text-ink">{stageLabel(e.stage)}</b> {fmt(e.at)}
                        <Badge tone={e.status === 'envoyé' ? 'ok' : e.status === 'échec' ? 'danger' : 'info'} label={e.status} />
                        <span className="truncate">· {e.subject}</span>
                      </div>
                    ))}
                    <div className="text-[11px] text-muted mt-1">
                      Envoyés à <b>{a.parentEmail}</b>{a.emails.some(e => e.status === 'préparé') && ' · « préparé » = prêt à partir dès qu’un serveur mail est branché.'}
                    </div>
                  </div>
                ) : <div className="text-[12px] text-muted">Aucun email pour l’instant.</div>)
              ) : (
                <div className="text-[12px] text-muted">Ce candidat n’a pas laissé d’email : suivi par téléphone.</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
