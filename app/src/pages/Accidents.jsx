// DÉCLARATION D'ACCIDENT — la chaîne de confiance entre l'école et le parent.
// Deux paires d'yeux, un accusé de réception, et rien qui s'efface.
import { useState } from 'react'
import { current } from '@core/auth.js'
import { db } from '@core/db.js'
import {
  BODY_ZONES, INJURY_KINDS, CARE, STAGES, SEVERITY,
  accidents, declare, approve, sendToParent, acknowledge, remind, addNote,
  pendingAck, stats, forChild,
} from '@core/accidents.js'
import { isEarly } from '@core/levels.js'
import {
  PageHead, Card, Btn, Badge, Modal, Field, Input, Select, EmptyState, Avatar, STATUS,
} from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import toast from 'react-hot-toast'
import { isRemote, remoteOp } from '../remote.js'

const when = t => new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

// ── LE SCHÉMA CORPOREL ──────────────────────────────────────────────────────
// Un adulte qui vient de ramasser un enfant qui saigne ne remplit pas un menu
// déroulant. Il POINTE. C'est tout le sujet.
function BodyMap({ value = [], onChange, readOnly }) {
  const toggle = k => {
    if (readOnly) return
    onChange(value.includes(k) ? value.filter(x => x !== k) : [...value, k])
  }
  return (
    <div className="relative mx-auto" style={{ width: 190, height: 340 }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true">
        {/* Une silhouette, pas une planche d'anatomie. */}
        <g fill="none" stroke="var(--color-line)" strokeWidth="1.4">
          <circle cx="50" cy="11" r="7" fill="var(--color-canvas)" />
          <path d="M50 18 L50 55" />
          <path d="M50 26 L30 40 M50 26 L70 40" />
          <path d="M30 40 L22 53 M70 40 L78 53" />
          <path d="M50 55 L42 76 M50 55 L58 76" />
          <path d="M42 76 L42 92 M58 76 L58 92" />
          <rect x="38" y="24" width="24" height="32" rx="8" fill="var(--color-canvas)" />
        </g>
      </svg>
      {BODY_ZONES.map(z => {
        const on = value.includes(z.key)
        return (
          <button key={z.key} type="button" onClick={() => toggle(z.key)} title={z.label}
            disabled={readOnly}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition"
            style={{
              left: `${z.x}%`, top: `${z.y}%`,
              width: on ? 20 : 13, height: on ? 20 : 13,
              background: on ? STATUS.danger : '#fff',
              border: `2px solid ${on ? STATUS.danger : 'var(--color-line)'}`,
              cursor: readOnly ? 'default' : 'pointer',
            }} />
        )
      })}
    </div>
  )
}

const zoneLabels = keys => keys.map(k => BODY_ZONES.find(z => z.key === k)?.label).filter(Boolean).join(', ')

export default function Accidents() {
  const me = current()
  const d = db()
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState({})

  const isParent = me.role === 'parent'
  const all = accidents()
  const st = stats()
  const waiting = pendingAck()
  const nameOf = id => (d.students || []).find(s => s.id === id)?.name || id

  // ── LE PARENT : il lit, et il SIGNE. ──────────────────────────────────────
  if (isParent) {
    const mine = (me.childIds || []).flatMap(forChild).filter(a => ['envoye', 'accuse'].includes(a.stage))
    if (!mine.length) return <EmptyState icon="ShieldCheck" title="Aucune déclaration."
      sub="S’il arrive quelque chose à votre enfant, l’école vous le dira ici : et vous devrez le confirmer." />
    return (
      <>
        <PageHead title="Déclarations d’accident" sub="Ce que l’école vous a signalé. Merci de confirmer que vous l’avez lu." />
        <div className="grid gap-3">
          {mine.map(a => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-bold">{nameOf(a.childId)} · {INJURY_KINDS[a.kind]?.label}</div>
                  <div className="text-xs text-muted font-semibold">{when(a.at)} · {zoneLabels(a.zones)}</div>
                </div>
                <Badge label={SEVERITY[a.severity]?.label} tone={SEVERITY[a.severity]?.tone} />
              </div>
              <p className="text-sm mt-3">{a.whatHappened}</p>
              {!!a.care?.length && (
                <p className="text-[13px] text-muted mt-2">
                  <b>Soins donnés :</b> {a.care.map(c => CARE[c]).join(' · ')}
                </p>
              )}
              <div className="text-[12px] text-muted mt-3">
                Constaté par {a.witness.name} · validé par {a.approver?.name}
              </div>

              {a.stage === 'envoye' ? (
                <div className="mt-4 rounded-xl p-4" style={{ background: STATUS.warnSoft }}>
                  <p className="text-[13px] mb-3">
                    <b>Merci de confirmer que vous avez lu cette déclaration.</b> C’est ce qui
                    permet à l’école de savoir que vous êtes au courant.
                  </p>
                  <Btn onClick={async () => {
                    if (isRemote() && me.role === 'parent') {
                      const r = await remoteOp('acknowledge', [a.id])
                      if (r.error) return toast.error(r.error)
                    } else acknowledge(a.id, me.name)
                    toast.success('Merci · c’est confirmé.'); refresh() }}>
                    <Ic n="Check" size={15} /> J’ai lu et je confirme
                  </Btn>
                </div>
              ) : (
                <div className="mt-4 text-[13px] font-bold flex items-center gap-1.5" style={{ color: STATUS.ok }}>
                  <Ic n="CheckCheck" size={15} /> Confirmé le {when(a.ack.at)}
                </div>
              )}
            </Card>
          ))}
        </div>
      </>
    )
  }

  // ── L'ÉCOLE ───────────────────────────────────────────────────────────────
  return (
    <>
      <PageHead title="Déclarations d’accident" sub="Deux paires d’yeux, un accusé du parent, et rien qui s’efface."
        action={<Btn onClick={() => setOpen(true)}><Ic n="Plus" size={15} /> Déclarer</Btn>} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { k: 'À valider', v: st.aValider, i: 'UserCheck', c: STATUS.neutral },
          { k: 'À envoyer', v: st.aEnvoyer, i: 'Send', c: STATUS.info },
          { k: 'Parent n’a pas confirmé', v: st.enAttenteAccuse, i: 'AlarmClock', c: STATUS.warn },
          { k: 'Graves', v: st.graves, i: 'TriangleAlert', c: STATUS.danger },
        ].map(c => (
          <Card key={c.k} className="p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted"><Ic n={c.i} size={13} style={{ color: c.c }} />{c.k}</div>
            <div className="text-2xl font-extrabold mt-1 tabular-nums">{c.v}</div>
          </Card>
        ))}
      </div>

      {/* CE QUE LA DIRECTION DOIT VOIR EN PREMIER. Un accident non accusé est le
          dossier qui explose six mois plus tard. */}
      {!!waiting.length && (
        <Card className="p-5 mb-4" style={{ background: STATUS.warnSoft }}>
          <div className="flex items-start gap-3">
            <Ic n="AlarmClock" size={18} style={{ color: STATUS.warn }} />
            <div className="text-[13px] w-full">
              <b>{waiting.length} parent(s) n’ont pas encore confirmé avoir lu.</b>
              <div className="mt-2 grid gap-1">
                {waiting.map(a => (
                  <div key={a.id} className="flex items-center gap-2 flex-wrap">
                    <span>{nameOf(a.childId)} · depuis <b>{a.waitingHours} h</b></span>
                    {!!a.reminders.length && <span className="text-muted">({a.reminders.length} relance(s))</span>}
                    <Btn size="sm" variant="soft" onClick={() => { remind(a.id, me.name); toast.success('Relance envoyée.'); refresh() }}>
                      Relancer
                    </Btn>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {!all.length && <EmptyState icon="ShieldCheck" title="Aucune déclaration."
        sub="Quand un enfant se blesse, tout se joue sur la trace qu’on en garde." />}

      <div className="grid gap-3">
        {all.map(a => {
          const stg = STAGES[a.stage]
          const sev = SEVERITY[a.severity]
          const mineDeclared = a.witness.id === me.id
          return (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Avatar name={nameOf(a.childId)} seed={a.childId} />
                  <div>
                    <div className="font-bold">{nameOf(a.childId)} · {INJURY_KINDS[a.kind]?.label}</div>
                    <div className="text-xs text-muted font-semibold">{when(a.at)} · {zoneLabels(a.zones)}</div>
                  </div>
                </div>
                <span className="flex items-center gap-2">
                  <Badge label={sev?.label} tone={sev?.tone} />
                  <Badge label={stg?.label} tone={stg?.tone} />
                </span>
              </div>

              <p className="text-sm mt-3">{a.whatHappened}</p>
              {!!a.care?.length && <p className="text-[13px] text-muted mt-1"><b>Soins :</b> {a.care.map(c => CARE[c]).join(' · ')}</p>}

              {/* La chaîne de custodie, lisible d'un coup d'œil. */}
              <div className="text-[12px] text-muted mt-3 grid gap-0.5">
                <span>Constaté par <b>{a.witness.name}</b> {when(a.witness.at)}</span>
                {a.approver && <span>Validé par <b>{a.approver.name}</b> {when(a.approver.at)}</span>}
                {a.sentAt && <span>Envoyé au parent · {when(a.sentAt)}</span>}
                {a.ack && <span style={{ color: STATUS.ok }}>
                  <b>Confirmé par {a.ack.by}</b> {when(a.ack.at)}
                </span>}
                {a.reminders.map((r, i) => <span key={i}>Relance {i + 1} · {when(r.at)}</span>)}
                {a.notes.map((n, i) => <span key={i}>Note de {n.by} ({when(n.at)}) : {n.text}</span>)}
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-4">
                {a.stage === 'brouillon' && (
                  mineDeclared
                    ? <span className="text-xs text-muted font-semibold flex items-center gap-1">
                        <Ic n="Lock" size={12} /> Vous l’avez rédigée : un autre responsable doit la valider.
                      </span>
                    : <Btn size="sm" onClick={() => {
                        const r = approve(a.id, me.id, me.name)
                        r.error ? toast.error(r.error) : toast.success('Validée.'); refresh()
                      }}><Ic n="UserCheck" size={14} /> Valider</Btn>
                )}
                {a.stage === 'valide' && (
                  <Btn size="sm" onClick={() => { sendToParent(a.id); toast.success('Envoyée au parent.'); refresh() }}>
                    <Ic n="Send" size={14} /> Envoyer au parent
                  </Btn>
                )}
                <span className="flex-1" />
                <input value={note[a.id] || ''} onChange={e => setNote({ ...note, [a.id]: e.target.value })}
                  placeholder="Ajouter une note (rien ne s’efface)…"
                  className="rounded-lg border border-line px-2 py-1 text-[13px] accent-ring" />
                <Btn size="sm" variant="ghost" onClick={() => {
                  const r = addNote(a.id, note[a.id], me.name)
                  if (r.error) return toast.error(r.error)
                  setNote({ ...note, [a.id]: '' }); refresh()
                }}>Ajouter</Btn>
              </div>
            </Card>
          )
        })}
      </div>

      {open && <DeclareModal me={me} onClose={() => setOpen(false)} onDone={() => { setOpen(false); refresh() }} />}
    </>
  )
}

function DeclareModal({ me, onClose, onDone }) {
  const d = db()
  const kids = (d.students || []).filter(s => !s.archived)
  const [childId, setChildId] = useState('')
  const [zones, setZones] = useState([])
  const [kind, setKind] = useState('bosse')
  const [severity, setSeverity] = useState('benin')
  const [what, setWhat] = useState('')
  const [care, setCare] = useState([])

  const go = () => {
    const r = declare({ childId, zones, kind, severity, whatHappened: what, care, byId: me.id, byName: me.name })
    if (r.error) return toast.error(r.error)
    toast.success('Déclaration rédigée : un autre responsable doit la valider.')
    onDone()
  }

  return (
    <Modal open onClose={onClose} title="Déclarer un accident" size="2xl"
      footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={go}>Rédiger la déclaration</Btn></>}>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-semibold text-muted mb-2">Où l’enfant s’est-il fait mal ? *</div>
          <BodyMap value={zones} onChange={setZones} />
          <p className="text-[11px] text-muted text-center mt-2">
            Touchez les zones. On ne remplit pas un menu déroulant quand on tient un enfant qui pleure.
          </p>
        </div>
        <div className="grid gap-4">
          <Field label="Enfant *">
            <Select value={childId} onChange={e => setChildId(e.target.value)}>
              <option value="">Choisir…</option>
              {kids.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nature">
              <Select value={kind} onChange={e => setKind(e.target.value)}>
                {Object.values(INJURY_KINDS).map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
              </Select>
            </Field>
            <Field label="Gravité">
              <Select value={severity} onChange={e => setSeverity(e.target.value)}>
                {Object.values(SEVERITY).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Ce qui s’est passé *" hint="C’est ce que le parent lira. Écrivez-le comme vous le lui diriez.">
            <textarea rows={3} value={what} onChange={e => setWhat(e.target.value)}
              placeholder="Adam a glissé en courant dans la cour et s’est cogné le genou contre le banc."
              className="w-full rounded-xl border border-line px-3 py-2 text-sm accent-ring" />
          </Field>
          <div>
            <div className="text-xs font-semibold text-muted mb-1.5">Soins donnés</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(CARE).map(([k, label]) => {
                const on = care.includes(k)
                return (
                  <button key={k} type="button"
                    onClick={() => setCare(on ? care.filter(x => x !== k) : [...care, k])}
                    className={`px-2.5 py-1 rounded-full text-[12px] font-bold border transition
                      ${on ? 'text-white border-transparent accent-bg' : 'bg-white border-line text-muted'}`}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
