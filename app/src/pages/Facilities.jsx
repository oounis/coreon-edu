// LOCATION DES INSTALLATIONS — piscine, terrain, gymnase, salles.
// Les murs de l'école sont vides le soir et le week-end. Les louer, c'est une
// seconde ligne de revenus. Et on ne réserve JAMAIS deux fois le même créneau.
import { useState } from 'react'
import { current } from '@core/auth.js'
import {
  FACILITY_KINDS, AUDIENCE, BOOKING_STAGES,
  facilities, facilityOf, bookings, availability, priceFor,
  book, bookRecurring, confirmBooking, payBooking, cancelBooking,
  revenue, money, todayStr,
} from '@core/facilities.js'
import { METHODS } from '@core/accounting.js'
import {
  PageHead, Card, Btn, Badge, Modal, Field, Input, Select, Tabs, EmptyState, STATUS,
} from '../components/ui.jsx'
import { Ic } from '../icons.jsx'
import toast from 'react-hot-toast'

const day = d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })

export default function Facilities() {
  const [tab, setTab] = useState('planning')
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)
  return (
    <>
      <PageHead title="Installations" sub="Piscine, terrain, gymnase, salles — occupés au lieu de rester vides." />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'planning', label: 'Planning' },
        { value: 'resas',    label: 'Réservations' },
        { value: 'revenus',  label: 'Revenus' },
      ]} />
      <div className="mt-5">
        {tab === 'planning' && <Planning refresh={refresh} />}
        {tab === 'resas'    && <Resas refresh={refresh} />}
        {tab === 'revenus'  && <Revenus />}
      </div>
    </>
  )
}

// ── PLANNING : voir ce qui est libre, et réserver ───────────────────────────
function Planning({ refresh }) {
  const me = current()
  const fs = facilities()
  const [fid, setFid] = useState(fs[0]?.id)
  const [date, setDate] = useState(todayStr())
  const [open, setOpen] = useState(null)   // { from, to }

  if (!fs.length) return <EmptyState icon="Waves" title="Aucune installation."
    sub="Ajoutez la piscine, le terrain, le gymnase — et commencez à les louer." />

  const f = facilityOf(fid)
  const slots = availability(fid, date)

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        {fs.map(x => {
          const k = FACILITY_KINDS[x.kind]
          const on = x.id === fid
          return (
            <button key={x.id} onClick={() => setFid(x.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-bold border transition
                ${on ? 'text-white border-transparent accent-bg' : 'bg-white border-line text-ink hover:border-ink/25'}`}>
              <Ic n={k?.icon || 'Square'} size={15} />{x.name}
            </button>
          )
        })}
      </div>

      <Card className="p-4 mb-4 flex items-center gap-4 flex-wrap">
        <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <div className="text-[13px]">
          <div className="text-muted font-semibold">Tarifs</div>
          <div className="font-bold">
            Interne {money(f.rateInternal)}/h · <span className="accent-text">Externe {money(f.rateExternal)}/h</span>
          </div>
        </div>
        <span className="flex-1" />
        <div className="text-xs text-muted max-w-xs">
          Les créneaux <b>scolaires</b> sont bloqués : un cours d’EPS ne se fait pas
          déloger par un club qui paie.
        </div>
      </Card>

      <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {slots.map(s => (
          <button key={s.from} disabled={!s.free}
            onClick={() => setOpen({ from: s.from, to: s.to })}
            title={s.reason || ''}
            className={`rounded-xl border p-3 text-left transition
              ${s.free ? 'bg-white border-line hover:border-ink/30' : 'border-transparent cursor-not-allowed'}`}
            style={s.free ? {} : { background: STATUS.neutralSoft }}>
            <div className="font-bold text-sm tabular-nums">{s.from} — {s.to}</div>
            <div className="text-[11px] font-semibold mt-0.5"
              style={{ color: s.free ? STATUS.ok : STATUS.neutral }}>
              {s.free ? 'Libre' : (s.reason || 'Occupé')}
            </div>
          </button>
        ))}
      </div>

      {open && <BookModal facility={f} date={date} slot={open} me={me}
        onClose={() => setOpen(null)} onDone={() => { setOpen(null); refresh() }} />}
    </>
  )
}

function BookModal({ facility, date, slot, me, onClose, onDone }) {
  const [audience, setAudience] = useState('externe')
  const [who, setWho] = useState('')
  const [phone, setPhone] = useState('')
  const [weeks, setWeeks] = useState(1)

  const hours = (+slot.to.slice(0, 2)) - (+slot.from.slice(0, 2))
  const p = priceFor(facility.id, audience, hours)

  const go = () => {
    if (!who.trim()) return toast.error('Le nom du réservataire est requis.')
    if (weeks > 1) {
      // Récurrent : on réserve ce qui est libre et on DIT ce qui ne l'est pas.
      const r = bookRecurring({ facilityId: facility.id, startDate: date, from: slot.from, to: slot.to,
        weeks: Number(weeks), audience, who, phone, by: me.name })
      toast.success(`${r.made.length} créneau(x) réservé(s).`)
      if (r.skipped.length) toast(`${r.skipped.length} semaine(s) déjà prise(s) — ignorée(s).`, { icon: '' })
      return onDone()
    }
    const r = book({ facilityId: facility.id, date, from: slot.from, to: slot.to,
      audience, who, phone, by: me.name })
    if (r.error) return toast.error(r.error)
    toast.success(`Réservé — ${money(r.booking.price)}`)
    onDone()
  }

  return (
    <Modal open onClose={onClose} title={`Réserver — ${facility.name}`}
      footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={go}>Réserver</Btn></>}>
      <div className="grid gap-4">
        <div className="text-sm">
          <b>{day(date)}</b> · {slot.from} — {slot.to} ({hours} h)
        </div>

        <div>
          <div className="text-xs font-semibold text-muted mb-1.5">Public</div>
          <div className="flex gap-2">
            {Object.values(AUDIENCE).map(a => (
              <button key={a.key} onClick={() => setAudience(a.key)}
                className={`flex-1 rounded-xl border-2 p-3 text-left transition
                  ${audience === a.key ? 'accent-bg text-white border-transparent' : 'bg-white border-line'}`}>
                <div className="font-bold text-sm">{a.label}</div>
                <div className={`text-[11px] ${audience === a.key ? 'text-white/80' : 'text-muted'}`}>{a.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <Field label="Au nom de *">
          <Input value={who} onChange={e => setWho(e.target.value)}
            placeholder={audience === 'externe' ? 'Club Nautique de Tunis' : 'Classe 5ème A'} />
        </Field>
        <Field label="Téléphone">
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+216 20 000 000" />
        </Field>

        <Field label="Répéter chaque semaine"
          hint="Un club veut « tous les samedis pendant 8 semaines » — pas cliquer huit fois.">
          <Select value={weeks} onChange={e => setWeeks(e.target.value)}>
            {[1, 4, 8, 12, 16].map(w => <option key={w} value={w}>{w === 1 ? 'Une seule fois' : `${w} semaines`}</option>)}
          </Select>
        </Field>

        <div className="rounded-xl p-4" style={{ background: STATUS.okSoft }}>
          <div className="flex justify-between text-sm">
            <span>{money(p.rate)}/h × {hours} h {weeks > 1 && `× ${weeks} semaines`}</span>
            <b className="tabular-nums">{money(p.total * (weeks > 1 ? weeks : 1))}</b>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── RÉSERVATIONS ────────────────────────────────────────────────────────────
function Resas({ refresh }) {
  const me = current()
  const [cancel, setCancel] = useState(null)
  const [reason, setReason] = useState('')
  const all = bookings()

  if (!all.length) return <EmptyState icon="CalendarPlus" title="Aucune réservation."
    sub="Le planning montre les créneaux libres — et les créneaux scolaires, qui ne se louent pas." />

  const doCancel = () => {
    const r = cancelBooking(cancel.id, reason)
    if (r.error) return toast.error(r.error)
    toast.success('Réservation annulée — le créneau est de nouveau libre.')
    setCancel(null); setReason(''); refresh()
  }

  return (
    <>
      <div className="grid gap-2">
        {all.map(b => {
          const f = facilityOf(b.facilityId)
          const st = BOOKING_STAGES[b.stage]
          return (
            <Card key={b.id} className="p-4 flex items-center gap-3 flex-wrap">
              <span className="w-9 h-9 rounded-xl grid place-items-center accent-soft accent-text shrink-0">
                <Ic n={FACILITY_KINDS[f?.kind]?.icon || 'Square'} size={17} />
              </span>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{b.who}</div>
                <div className="text-xs text-muted font-semibold tabular-nums">
                  {f?.name} · {day(b.date)} · {b.from}–{b.to}
                  {b.audience === 'externe' && <span className="accent-text"> · externe</span>}
                </div>
              </div>
              <span className="flex-1" />
              <span className="text-sm font-extrabold tabular-nums">{money(b.price)}</span>
              <Badge label={st.label} tone={st.tone} />
              {b.stage === 'demande' && <Btn size="sm" variant="soft" onClick={() => { confirmBooking(b.id); refresh() }}>Confirmer</Btn>}
              {['demande', 'confirmee'].includes(b.stage) && b.price > 0 &&
                <Btn size="sm" onClick={() => { payBooking(b.id, 'especes', me.name); toast.success('Encaissé.'); refresh() }}>Encaisser</Btn>}
              {b.stage !== 'annulee' && <Btn size="sm" variant="ghost" onClick={() => setCancel(b)}>Annuler</Btn>}
            </Card>
          )
        })}
      </div>

      <Modal open={!!cancel} onClose={() => setCancel(null)} title="Annuler la réservation"
        footer={<><Btn variant="ghost" onClick={() => setCancel(null)}>Retour</Btn><Btn variant="danger" onClick={doCancel}>Annuler</Btn></>}>
        <p className="text-sm text-muted mb-3">Le créneau redeviendra immédiatement disponible.</p>
        <Field label="Motif *"><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Désistement du club." /></Field>
      </Modal>
    </>
  )
}

// ── REVENUS ─────────────────────────────────────────────────────────────────
function Revenus() {
  const r = revenue()
  const fs = facilities()
  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { k: 'Encaissé', v: money(r.collected), i: 'Wallet', c: STATUS.ok },
          { k: 'Reste à encaisser', v: money(r.outstanding), i: 'Clock', c: STATUS.warn },
          { k: 'Dont clients externes', v: money(r.external), i: 'Building2', c: STATUS.info },
          { k: 'Heures louées', v: `${r.hoursBooked} h`, i: 'Timer', c: STATUS.neutral },
        ].map(c => (
          <Card key={c.k} className="p-5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted">
              <Ic n={c.i} size={13} style={{ color: c.c }} />{c.k}
            </div>
            <div className="text-2xl font-extrabold mt-1 tabular-nums">{c.v}</div>
          </Card>
        ))}
      </div>

      <Card className="p-5 mt-4">
        <div className="text-sm font-bold mb-3">Par installation</div>
        {fs.map(f => {
          const v = r.byFacility[f.id] || 0
          const pct = r.collected ? Math.round(v / r.collected * 100) : 0
          return (
            <div key={f.id} className="mb-3 last:mb-0">
              <div className="flex justify-between text-[13px] font-semibold mb-1">
                <span>{f.name}</span>
                <span className="tabular-nums">{money(v)}</span>
              </div>
              <div className="h-2 rounded-full bg-canvas overflow-hidden">
                <div className="h-full rounded-full accent-bg" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </Card>

      <Card className="p-5 mt-4" style={{ background: STATUS.infoSoft }}>
        <div className="flex items-start gap-3">
          <Ic n="Lightbulb" size={18} style={{ color: STATUS.info }} />
          <div className="text-[13px]">
            <b>Une piscine vide ne coûte pas moins cher qu’une piscine pleine.</b>
            <div className="mt-1">
              L’école a loué <b>{r.hoursBooked} h</b> sur cette période, dont{' '}
              <b>{money(r.external)}</b> auprès de clients externes — de l’argent qui ne
              venait d’aucune famille.
            </div>
          </div>
        </div>
      </Card>
    </>
  )
}
