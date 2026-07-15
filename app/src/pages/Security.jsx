import { useState } from 'react'
import { Ic } from '../icons.jsx'
import { current } from '@core/auth.js'
import { db, mutate, uid, settings } from '@core/db.js'
import { notify } from '@core/notify.js'
import {
  PageHead, Card, StatCard, SectionCard, Btn, Modal, Field, Input, Select, Textarea,
  Avatar, Tabs, EmptyState, Badge, STATUS,
} from '../components/ui.jsx'
import {
  ShieldCheck, DoorOpen, Flashlight, BookOpen, Siren, Clock, MapPin, LogIn, LogOut,
  Plus, Check, AlertTriangle, Phone, UserCheck, KeyRound, CalendarClock, Users,
} from 'lucide-react'
import {
  URGENCES, CONSIGNES, CHECKPOINTS, checkpointOf, LOG_KINDS, logKindOf,
  ID_TYPES, PURPOSES, needsEscort, isInside, badgeNumber,
  CHECKLIST, CHECK_PHASES, checklistTotal, checklistDone, phaseDone, isPhaseComplete, checklistComplete,
} from '@core/security.js'
import {
  securityNeeds, needsSecurity, isNightEvent, securityNotice, SECURITY_NOTICE_H,
  adultCount, childCount, goingCount, audienceOf,
} from '@core/social.js'
import { now as appNow, todayIso, isoOf } from '@core/clock.js'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

// Le formulaire promet « jamais affiché en entier » — on tient parole à l'écran.
const maskId = n => { const x = String(n || ''); return x.length > 4 ? x.slice(0, 4) + '****' : x }

const hm = d => format(d, 'HH:mm')

export default function Security() {
  const u = current()
  const [tab, setTab] = useState('evenements')
  const [, force] = useState(0); const refresh = () => force(x => x + 1)
  const d = db()

  const today = todayIso()
  const insideNow = (d.visitors || []).filter(v => v.date === today && isInside(v)).length
  // Les événements approuvés que l'agent doit couvrir, les plus proches d'abord.
  const toCover = (d.socialEvents || [])
    .filter(e => e.status === 'approuve' && e.date >= today && needsSecurity(e))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const tonight = toCover.filter(e => e.date === today)
  const openIncidents = (d.incidents || []).filter(i => i.status === 'open').length
  // Chaque tuile s'ouvre : les événements de ce soir, qui est dans l'école,
  // les rondes du jour, les incidents encore ouverts.
  const [tile, setTile] = useState(null) // tonight | inside | rounds | incidents

  return (<>
    <PageHead title="Poste de sécurité" sub={`${settings().schoolName} · portail, visiteurs, rondes et soirées`}
      action={<Tabs value={tab} onChange={setTab} tabs={[
        { value: 'evenements', label: 'À couvrir', count: toCover.length || undefined },
        { value: 'visiteurs', label: 'Visiteurs', count: insideNow || undefined },
        { value: 'rondes', label: 'Rondes' },
        { value: 'journal', label: 'Main courante' },
        { value: 'consignes', label: 'Consignes' },
      ]} />} />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard tint="brand" icon={<CalendarClock size={20} />} value={tonight.length} label="Ce soir" sub={tonight.length ? 'à couvrir' : 'rien de prévu'} onClick={() => setTile('tonight')} />
      <StatCard tint="grape" icon={<UserCheck size={20} />} value={insideNow} label="Visiteurs dans l'école" onClick={() => setTile('inside')} />
      <StatCard tint="sky" icon={<Flashlight size={20} />} value={(d.rounds || []).filter(r => r.date === today).length} label="Rondes aujourd'hui" onClick={() => setTile('rounds')} />
      <StatCard tint="coral" icon={<AlertTriangle size={20} />} value={openIncidents} label="Incidents ouverts" onClick={() => setTile('incidents')} />
    </div>

    {tile && (() => {
      const insideList = (d.visitors || []).filter(v => v.date === today && isInside(v))
      const roundsList = (d.rounds || []).filter(r => r.date === today)
      const openList = (d.incidents || []).filter(i => i.status === 'open')
      const C = {
        tonight: { title: 'Ce soir — à couvrir', body: tonight.length === 0
          ? <EmptyState icon={<ShieldCheck size={24} />} title="Rien de prévu ce soir" sub="Les événements approuvés qui demandent une présence apparaîtront ici." />
          : tonight.map(ev => (
            <div key={ev.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{ev.title}</span>
                <span className="block text-[12px] text-muted">{ev.time} · {ev.place} · organisé par {ev.byName}</span></span>
              <Btn size="sm" variant="soft" onClick={() => { setTile(null); setTab('evenements') }}>Check-list</Btn>
            </div>)) },
        inside: { title: `Visiteurs dans l'école · ${insideList.length}`, body: insideList.length === 0
          ? <EmptyState icon={<DoorOpen size={24} />} title="Aucun visiteur dans l'école" sub="Toutes les visites du jour sont terminées." />
          : insideList.map(v => (
            <div key={v.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
              <Avatar name={v.name} seed={v.id} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{v.name} <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md ml-1" style={{ background: STATUS.neutralSoft, color: STATUS.neutral }}>{v.badge}</span></span>
                <span className="block text-[12px] text-muted truncate">{v.purpose} · reçu par {v.hostName} · entré à {v.inAt}</span></span>
            </div>)) },
        rounds: { title: `Rondes aujourd'hui · ${roundsList.length}`, body: roundsList.length === 0
          ? <EmptyState icon={<Flashlight size={24} />} title="Aucune ronde aujourd'hui" sub="Démarrez une ronde depuis l'onglet Rondes." />
          : roundsList.map(r => { const anomalies = r.points.filter(p => p.anomaly)
            return (
            <div key={r.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{r.agentName} <span className="text-muted font-normal tabular-nums">· {r.startAt} → {r.endAt}</span></span>
                <span className="block text-[12px] text-muted">{r.points.length} point(s) de passage{anomalies.length ? '' : ' · rien à signaler'}</span></span>
              {anomalies.length > 0 && <span className="text-[12px] font-bold px-2 py-1 rounded-full" style={{ background: STATUS.warnSoft, color: STATUS.warn }}>{anomalies.length} anomalie(s)</span>}
            </div>) }) },
        incidents: { title: `Incidents ouverts · ${openList.length}`, body: openList.length === 0
          ? <EmptyState icon={<ShieldCheck size={24} />} title="Aucun incident ouvert" sub="Tout est réglé — rien en attente." />
          : openList.map(i => (
            <div key={i.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{i.title}</span>
                <span className="block text-[12px] text-muted truncate">{i.type} · signalé par {i.by} · {format(new Date(i.at), 'EEEE d MMMM', { locale: fr })}</span></span>
              <Badge tone={i.severity === 'high' ? 'danger' : 'warn'} label={i.severity === 'high' ? 'Grave' : 'À suivre'} status={i.severity} />
            </div>)) },
      }[tile]
      return (
        <Modal open onClose={() => setTile(null)} title={C.title} size="xl"
          footer={<Btn variant="ghost" onClick={() => setTile(null)}>Fermer</Btn>}>
          {C.body}
        </Modal>) })()}

    {tab === 'evenements' && <EventsTab u={u} d={d} toCover={toCover} refresh={refresh} />}
    {tab === 'visiteurs' && <VisitorsTab u={u} d={d} refresh={refresh} />}
    {tab === 'rondes' && <RoundsTab u={u} d={d} refresh={refresh} />}
    {tab === 'journal' && <LogTab u={u} d={d} refresh={refresh} />}
    {tab === 'consignes' && <ConsignesTab />}
  </>)
}

/* ── 1) Les événements à couvrir + la check-list ─────────────────────────── */
function EventsTab({ u, d, toCover, refresh }) {
  const [open, setOpen] = useState(null)
  if (!toCover.length) return <Card><EmptyState icon={<ShieldCheck size={26} />} title="Aucun événement à couvrir"
    sub="Les activités approuvées qui demandent une présence de sécurité apparaîtront ici, dès leur validation par la Direction." /></Card>

  return (<>
    <div className="grid lg:grid-cols-2 gap-4">
      {toCover.map(ev => {
        const reasons = securityNeeds(ev)
        const notice = securityNotice(ev)
        const checks = ev.security?.checks || {}
        const done = checklistDone(checks); const total = checklistTotal()
        const night = isNightEvent(ev)
        return (
          <Card key={ev.id} className="p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-2xl grid place-items-center shrink-0" style={{ background: night ? '#EEF1F6' : STATUS.infoSoft }}>
                <Ic n={night ? 'Moon' : 'Sun'} size={18} /></span>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold truncate">{ev.title}</div>
                <div className="text-[12px] text-muted">{format(parseISO(ev.date), 'EEEE d MMMM', { locale: fr })} · {ev.time} · {ev.place}</div>
              </div>
              {night && <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ background: '#EEF1F6', color: '#334155' }}>SOIRÉE</span>}
            </div>

            {/* Le préavis : un agent prévenu la veille ne peut pas reconnaître les lieux. */}
            {notice.short && <div className="flex items-start gap-2 text-[12px] rounded-xl px-3 py-2" style={{ background: STATUS.warnSoft, color: '#8A5A12' }}>
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>Préavis court : <b>{notice.hours} h</b> avant l'événement (minimum recommandé : {SECURITY_NOTICE_H} h). Signalez-le à la Direction.</span>
            </div>}

            <div>
              <div className="text-[12px] font-bold text-muted mb-1">Pourquoi une présence est nécessaire</div>
              <ul className="space-y-1">
                {reasons.map(r => <li key={r} className="text-[12px] flex items-start gap-1.5"><span className="mt-1.5 w-1 h-1 rounded-full bg-current opacity-50 shrink-0" />{r}</li>)}
              </ul>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1"><Users size={12} />{adultCount(ev)} adultes{childCount(ev) > 0 && ` · ${childCount(ev)} enfants`}</span>
              <span className="inline-flex items-center gap-1"><UserCheck size={12} />organisateur : {ev.byName}</span>
            </div>

            <div>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="font-bold">Check-list</span>
                <span className="text-muted">{done} / {total}</span>
              </div>
              <div className="h-2 rounded-full bg-canvas overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(done / total) * 100}%`, background: checklistComplete(checks) ? STATUS.ok : STATUS.info }} />
              </div>
            </div>

            <Btn size="sm" onClick={() => setOpen(ev)} className="mt-auto">
              <ShieldCheck size={15} /> {done ? 'Poursuivre la check-list' : 'Ouvrir la check-list'}</Btn>
          </Card>)
      })}
    </div>
    {open && <ChecklistModal ev={open} u={u} onClose={() => setOpen(null)} refresh={refresh} />}
  </>)
}

function ChecklistModal({ ev, u, onClose, refresh }) {
  const [, bump] = useState(0)
  const fresh = db().socialEvents.find(x => x.id === ev.id) || ev
  const checks = fresh.security?.checks || {}

  const toggle = k => {
    mutate(db => {
      const e = db.socialEvents.find(x => x.id === ev.id)
      e.security = e.security || { checks: {}, notes: '' }
      e.security.checks = { ...e.security.checks, [k]: !e.security.checks[k] }
      e.security.agentName = u.name
    })
    bump(x => x + 1); refresh()
  }
  const finish = () => {
    // Clore la check-list écrit d'office dans la main courante : c'est la trace.
    mutate(db => {
      db.logbook.unshift({ id: uid('l'), at: Date.now(), agentName: u.name, kind: 'evenement',
        place: ev.place, text: `« ${ev.title} » — check-list de sécurité complétée (${checklistTotal()} points).` })
    })
    notify({ role: 'schooladmin', kind: 'info', actor: u.name, title: 'Événement sécurisé',
      body: `« ${ev.title} » : check-list complétée.`, link: '/app/security' })
    toast.success('Check-list close · Direction prévenue · main courante mise à jour')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={ev.title} size="2xl"
      footer={<><Btn variant="ghost" onClick={onClose}>Fermer</Btn>
        <Btn onClick={finish} disabled={!checklistComplete(checks)}>
          <Check size={15} /> {checklistComplete(checks) ? 'Clore la check-list' : `Encore ${checklistTotal() - checklistDone(checks)} point(s)`}</Btn></>}>
      <div className="text-[12px] text-muted mb-4">
        {format(parseISO(ev.date), 'EEEE d MMMM', { locale: fr })} · {ev.time} · {ev.place} · {adultCount(ev)} adultes attendus
      </div>
      <div className="space-y-4">
        {CHECK_PHASES.map(ph => (
          <div key={ph.k}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-extrabold">{ph.label}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: isPhaseComplete(checks, ph.k) ? STATUS.okSoft : STATUS.neutralSoft, color: isPhaseComplete(checks, ph.k) ? STATUS.ok : STATUS.neutral }}>
                {phaseDone(checks, ph.k)} / {CHECKLIST[ph.k].length}</span>
              <span className="text-[11px] text-muted">{ph.hint}</span>
            </div>
            <div className="space-y-1">
              {CHECKLIST[ph.k].map(item => (
                <label key={item.k} className="flex items-start gap-2.5 rounded-xl px-2.5 py-2 hover:bg-canvas cursor-pointer">
                  <input type="checkbox" checked={!!checks[item.k]} onChange={() => toggle(item.k)} className="mt-0.5 w-4 h-4 shrink-0" />
                  <span className={`text-[13px] ${checks[item.k] ? 'text-muted line-through' : ''}`}>{item.label}</span>
                </label>))}
            </div>
          </div>))}
      </div>
    </Modal>
  )
}

/* ── 2) Registre des visiteurs ───────────────────────────────────────────── */
const BLANK_V = () => ({ name: '', idType: 'CIN', idNumber: '', org: '', purpose: PURPOSES[0], hostName: '', vehicle: '', escortName: '' })

function VisitorsTab({ u, d, refresh }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(BLANK_V)
  const today = todayIso()
  const list = (d.visitors || []).filter(v => v.date === today).sort((a, b) => (b.inAt || '').localeCompare(a.inAt || ''))
  const inside = list.filter(isInside)

  const checkIn = () => {
    if (!f.name.trim()) return toast.error('Nom du visiteur requis')
    if (!f.idNumber.trim()) return toast.error("Pièce d'identité requise — c'est le seul contrôle réel")
    if (!f.hostName.trim()) return toast.error('Qui reçoit ce visiteur ?')
    const escort = needsEscort(f.purpose)
    if (escort && !f.escortName.trim()) return toast.error("Cette visite exige un accompagnateur : indiquez qui accompagne")
    const n = (d.visitors || []).length + 1
    mutate(db => {
      db.visitors.unshift({ id: uid('v'), date: today, name: f.name.trim(), idType: f.idType, idNumber: f.idNumber.trim(),
        org: f.org.trim(), purpose: f.purpose, hostName: f.hostName.trim(), inAt: hm(appNow()), outAt: null,
        badge: badgeNumber(n), escort, escortName: f.escortName.trim(), vehicle: f.vehicle.trim(), agentName: u.name })
      db.logbook.unshift({ id: uid('l'), at: Date.now(), agentName: u.name, kind: 'visiteur', place: 'Portail principal',
        text: `Entrée de ${f.name.trim()} (${f.purpose}) — badge ${badgeNumber(n)}${escort ? `, accompagné par ${f.escortName.trim()}` : ''}.` })
    })
    toast.success(`${f.name.trim()} enregistré · badge ${badgeNumber(n)}`)
    setOpen(false); setF(BLANK_V()); refresh()
  }
  const checkOut = v => {
    const t = hm(appNow())
    mutate(db => {
      const x = db.visitors.find(y => y.id === v.id); if (x) x.outAt = t
      db.logbook.unshift({ id: uid('l'), at: Date.now(), agentName: u.name, kind: 'visiteur', place: 'Portail principal',
        text: `Sortie de ${v.name} — badge ${v.badge} rendu à ${t}.` })
    })
    toast.success(`${v.name} sorti · badge ${v.badge} rendu`); refresh()
  }

  return (<>
    <SectionCard icon={<DoorOpen size={16} />} tint="grape" title="Registre des visiteurs" sub={`${today} · ${inside.length} personne(s) actuellement dans l'école`}
      action={<Btn size="sm" onClick={() => { setF(BLANK_V()); setOpen(true) }}><Plus size={14} /> Enregistrer une entrée</Btn>} bodyClass="p-3">
      {list.length === 0
        ? <EmptyState icon={<DoorOpen size={24} />} title="Aucun visiteur aujourd'hui" sub="Chaque personne extérieure est enregistrée avec sa pièce d'identité et un badge." />
        : <div className="space-y-1.5">
            {list.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-line">
                <Avatar name={v.name} seed={v.id} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{v.name} <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md ml-1" style={{ background: STATUS.neutralSoft, color: STATUS.neutral }}>{v.badge}</span></div>
                  <div className="text-[12px] text-muted truncate">{v.purpose} · reçu par {v.hostName}{v.org && ` · ${v.org}`}</div>
                  <div className="text-[11px] text-muted">{v.idType} {maskId(v.idNumber)}{v.vehicle && ` · ${v.vehicle}`}{v.escort && <span className="ml-1 font-bold" style={{ color: STATUS.warn }}>· accompagné par {v.escortName}</span>}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] tabular-nums"><b>{v.inAt}</b>{v.outAt ? ` → ${v.outAt}` : ''}</div>
                  {isInside(v)
                    ? <Btn size="sm" variant="soft" onClick={() => checkOut(v)}><LogOut size={13} /> Sortie</Btn>
                    : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS.okSoft, color: STATUS.ok }}>sorti</span>}
                </div>
              </div>))}
          </div>}
    </SectionCard>

    <Modal open={open} onClose={() => setOpen(false)} title="Entrée d'un visiteur" size="xl"
      footer={<><Btn variant="ghost" onClick={() => setOpen(false)}>Annuler</Btn><Btn onClick={checkIn}><LogIn size={15} /> Enregistrer l'entrée</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nom & prénom *"><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nizar Ben Amor" /></Field>
        <Field label="Société / organisme"><Input value={f.org} onChange={e => setF({ ...f, org: e.target.value })} placeholder="Papeterie El Amel" /></Field>
        <Field label="Pièce d'identité"><Select value={f.idType} onChange={e => setF({ ...f, idType: e.target.value })}>{ID_TYPES.map(t => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Numéro *" hint="Enregistré, jamais affiché en entier."><Input value={f.idNumber} onChange={e => setF({ ...f, idNumber: e.target.value })} placeholder="0912xxxx" /></Field>
        <Field label="Motif de la visite"><Select value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })}>{PURPOSES.map(p => <option key={p}>{p}</option>)}</Select></Field>
        <Field label="Personne visitée *"><Input value={f.hostName} onChange={e => setF({ ...f, hostName: e.target.value })} placeholder="Hela Morjane" /></Field>
        <Field label="Véhicule (immatriculation)"><Input value={f.vehicle} onChange={e => setF({ ...f, vehicle: e.target.value })} placeholder="214 TU 3120" /></Field>
        {needsEscort(f.purpose) && <Field label="Accompagnateur *" hint="Cette visite mène auprès des élèves.">
          <Input value={f.escortName} onChange={e => setF({ ...f, escortName: e.target.value })} placeholder="Dali Brahmi" /></Field>}
      </div>
      {needsEscort(f.purpose) && <div className="mt-3 text-[12px] rounded-xl px-3 py-2.5 flex items-start gap-2" style={{ background: STATUS.warnSoft, color: '#8A5A12' }}>
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <span>Un visiteur qui approche les élèves <b>ne circule jamais seul</b>. Badge remis, accompagnateur désigné, sortie enregistrée.</span>
      </div>}
    </Modal>
  </>)
}

/* ── 3) Rondes ───────────────────────────────────────────────────────────── */
function RoundsTab({ u, d, refresh }) {
  const today = todayIso()
  const [live, setLive] = useState(null)   // ronde en cours : { startAt, points:{} }
  const rounds = (d.rounds || []).filter(r => r.date === today).sort((a, b) => (b.startAt || '').localeCompare(a.startAt || ''))
  const [anomaly, setAnomaly] = useState({})

  const start = () => { setLive({ startAt: hm(appNow()), points: {} }); toast.success('Ronde démarrée — pointez chaque zone') }
  const mark = k => setLive(l => ({ ...l, points: { ...l.points, [k]: { at: hm(appNow()), anomaly: anomaly[k] || '' } } }))
  const finish = () => {
    const points = CHECKPOINTS.filter(c => live.points[c.k]).map(c => ({ k: c.k, ...live.points[c.k] }))
    if (!points.length) return toast.error('Pointez au moins une zone')
    const anomalies = points.filter(p => p.anomaly)
    mutate(db => {
      db.rounds.unshift({ id: uid('r'), date: today, agentName: u.name, startAt: live.startAt, endAt: hm(appNow()), points })
      db.logbook.unshift({ id: uid('l'), at: Date.now(), agentName: u.name, kind: 'ronde', place: 'Périmètre',
        text: `Ronde effectuée · ${points.length} point(s) de passage${anomalies.length ? ` · ${anomalies.length} anomalie(s)` : ' · rien à signaler'}.` })
      anomalies.forEach(a => db.logbook.unshift({ id: uid('l'), at: Date.now(), agentName: u.name, kind: 'anomalie',
        place: checkpointOf(a.k).label, text: a.anomaly }))
    })
    if (anomalies.length) notify({ role: 'schooladmin', kind: 'info', actor: u.name, title: 'Anomalies relevées en ronde',
      body: anomalies.map(a => `${checkpointOf(a.k).label} : ${a.anomaly}`).join(' · '), link: '/app/security' })
    toast.success(`Ronde close · ${points.length} zones${anomalies.length ? ` · ${anomalies.length} anomalie(s) signalée(s)` : ''}`)
    setLive(null); setAnomaly({}); refresh()
  }

  return (<>
    <SectionCard icon={<Flashlight size={16} />} tint="sky" title={live ? `Ronde en cours — démarrée à ${live.startAt}` : 'Nouvelle ronde'}
      sub="Pointez chaque zone à votre passage. Une anomalie remonte à la Direction et s'inscrit dans la main courante."
      action={live ? <Btn size="sm" onClick={finish}><Check size={14} /> Clore la ronde</Btn> : <Btn size="sm" onClick={start}><Flashlight size={14} /> Démarrer une ronde</Btn>}
      bodyClass="p-3" className="mb-4">
      <div className="grid sm:grid-cols-2 gap-2">
        {CHECKPOINTS.map(c => {
          const p = live?.points[c.k]
          return (
            <div key={c.k} className={`rounded-xl border p-2.5 ${p ? 'border-transparent' : 'border-line'}`} style={p ? { background: STATUS.okSoft } : {}}>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0" style={{ color: p ? STATUS.ok : STATUS.neutral }} />
                <span className="text-sm font-semibold flex-1">{c.label}</span>
                {p ? <span className="text-[12px] font-bold tabular-nums" style={{ color: STATUS.ok }}>{p.at}</span>
                  : live ? <Btn size="sm" variant="soft" onClick={() => mark(c.k)}>Pointer</Btn>
                    : <span className="text-[11px] text-muted">—</span>}
              </div>
              {live && !p && <Input className="mt-1.5 text-[12px]" placeholder="Anomalie (facultatif)" value={anomaly[c.k] || ''} onChange={e => setAnomaly({ ...anomaly, [c.k]: e.target.value })} />}
              {p?.anomaly && <div className="text-[12px] mt-1 flex items-start gap-1.5" style={{ color: STATUS.warn }}><AlertTriangle size={12} className="mt-0.5" />{p.anomaly}</div>}
            </div>)
        })}
      </div>
    </SectionCard>

    <SectionCard icon={<Clock size={16} />} tint="slate" title="Rondes du jour" bodyClass="p-3">
      {rounds.length === 0 ? <EmptyState icon={<Flashlight size={24} />} title="Aucune ronde aujourd'hui" sub="Démarrez une ronde ci-dessus." />
        : rounds.map(r => (
          <div key={r.id} className="rounded-xl border border-line p-3 mb-2 last:mb-0">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{r.agentName}</span>
              <span className="text-muted tabular-nums text-[12px]">{r.startAt} → {r.endAt}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {r.points.map(p => (
                <span key={p.k} className="text-[11px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1"
                  style={{ background: p.anomaly ? STATUS.warnSoft : STATUS.okSoft, color: p.anomaly ? STATUS.warn : STATUS.ok }}>
                  {checkpointOf(p.k).label} · {p.at}{p.anomaly && <Ic n="TriangleAlert" size={12} className="inline ml-1 align-[-1px]" />}</span>))}
            </div>
            {r.points.filter(p => p.anomaly).map(p => (
              <div key={p.k} className="text-[12px] mt-1.5 flex items-start gap-1.5" style={{ color: STATUS.warn }}>
                <AlertTriangle size={12} className="mt-0.5 shrink-0" /> <b>{checkpointOf(p.k).label} :</b> {p.anomaly}</div>))}
          </div>))}
    </SectionCard>
  </>)
}

/* ── 4) Main courante ────────────────────────────────────────────────────── */
function LogTab({ u, d, refresh }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ kind: 'consigne', place: 'Poste de garde', text: '' })
  const log = [...(d.logbook || [])].sort((a, b) => b.at - a.at)

  const add = () => {
    if (!f.text.trim()) return toast.error('Écrivez ce que vous constatez')
    mutate(db => { db.logbook.unshift({ id: uid('l'), at: Date.now(), agentName: u.name, kind: f.kind, place: f.place, text: f.text.trim() }) })
    if (f.kind === 'anomalie' || f.kind === 'alarme')
      notify({ role: 'schooladmin', kind: 'info', actor: u.name, title: logKindOf(f.kind).label, body: f.text.trim(), link: '/app/security' })
    toast.success('Inscrit à la main courante'); setOpen(false); setF({ kind: 'consigne', place: 'Poste de garde', text: '' }); refresh()
  }
  const shift = kind => {
    mutate(db => { db.logbook.unshift({ id: uid('l'), at: Date.now(), agentName: u.name, kind, place: 'Poste de garde',
      text: kind === 'prise' ? 'Prise de service.' : 'Fin de service. Clés rendues.' }) })
    toast.success(kind === 'prise' ? 'Prise de service enregistrée' : 'Fin de service enregistrée'); refresh()
  }

  return (<>
    <SectionCard icon={<BookOpen size={16} />} tint="slate" title="Main courante"
      sub="Le journal du poste : prise de service, rondes, visiteurs, anomalies. On y écrit, on n'y efface pas."
      action={<div className="flex gap-2">
        <Btn size="sm" variant="soft" onClick={() => shift('prise')}><LogIn size={13} /> Prise de service</Btn>
        <Btn size="sm" variant="soft" onClick={() => shift('fin')}><LogOut size={13} /> Fin de service</Btn>
        <Btn size="sm" onClick={() => setOpen(true)}><Plus size={14} /> Écrire</Btn>
      </div>} bodyClass="p-3">
      {log.length === 0 ? <EmptyState icon={<BookOpen size={24} />} title="Main courante vide" sub="Commencez par votre prise de service." />
        : <div className="space-y-1.5 max-h-[560px] overflow-y-auto scroll-thin">
            {log.map(l => { const k = logKindOf(l.kind)
              return (
                <div key={l.id} className="flex items-start gap-3 p-2.5 rounded-xl border border-line">
                  <span className="mt-0.5 shrink-0" style={{ color: k.color }}><Ic n={k.icon} size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: k.color + '1E', color: k.color }}>{k.label}</span>
                      <span className="text-[12px] text-muted">{l.place}</span>
                    </div>
                    <div className="text-[13px] mt-0.5">{l.text}</div>
                  </div>
                  <div className="text-right shrink-0 text-[11px] text-muted">
                    <div className="tabular-nums font-bold">{hm(new Date(l.at))}</div>
                    <div>{format(new Date(l.at), 'd MMM', { locale: fr })}</div>
                    <div className="truncate max-w-[90px]">{l.agentName}</div>
                  </div>
                </div>) })}
          </div>}
    </SectionCard>

    <Modal open={open} onClose={() => setOpen(false)} title="Écrire à la main courante"
      footer={<><Btn variant="ghost" onClick={() => setOpen(false)}>Annuler</Btn><Btn onClick={add}>Inscrire</Btn></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nature"><Select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}>
          {Object.entries(LOG_KINDS).filter(([k]) => !['prise', 'fin'].includes(k)).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select></Field>
        <Field label="Lieu"><Input value={f.place} onChange={e => setF({ ...f, place: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Constat" hint="Faits, heure, personnes, actions menées.">
          <Textarea rows={3} value={f.text} onChange={e => setF({ ...f, text: e.target.value })} placeholder="Ce que vous avez vu, fait, et ce qui a suivi." /></Field></div>
      </div>
      <p className="text-[12px] text-muted mt-2">Une <b>anomalie</b> ou une <b>alarme</b> prévient immédiatement la Direction.</p>
    </Modal>
  </>)
}

/* ── 5) Consignes ────────────────────────────────────────────────────────── */
function ConsignesTab() {
  return (<>
    <SectionCard icon={<Phone size={16} />} tint="coral" title="Numéros d'urgence" sub="Tunisie" bodyClass="p-3" className="mb-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {URGENCES.map(x => (
          <a key={x.k} href={`tel:${x.num}`} className="rounded-xl border border-line p-3 hover:bg-canvas block">
            <div className="text-2xl font-extrabold tabular-nums" style={{ color: STATUS.danger }}>{x.num}</div>
            <div className="text-sm font-bold">{x.label}</div>
            <div className="text-[12px] text-muted">{x.hint}</div>
          </a>))}
      </div>
    </SectionCard>

    <div className="grid lg:grid-cols-2 gap-4">
      {CONSIGNES.map(c => (
        <Card key={c.k} className="p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <span style={{ color: c.color }}><Ic n={c.icon} size={22} /></span>
            <h3 className="font-extrabold" style={{ color: c.color }}>{c.label}</h3>
          </div>
          <ol className="space-y-1.5">
            {c.steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px]">
                <span className="shrink-0 w-5 h-5 rounded-full grid place-items-center text-[11px] font-bold mt-0.5"
                  style={{ background: c.color + '1E', color: c.color }}>{i + 1}</span>
                <span>{s}</span>
              </li>))}
          </ol>
        </Card>))}
    </div>

    <p className="text-[12px] text-muted mt-4">
      Ces consignes suivent le cadre tunisien : Code de la sécurité et de la prévention des risques d'incendie
      (loi 2009-11) et instructions de la Protection civile — plan d'évacuation affiché, équipe de sécurité désignée,
      moyens de secours vérifiés. Elles ne remplacent pas la formation de l'agent, elles la rappellent.
    </p>
  </>)
}
