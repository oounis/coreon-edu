import { useState, useEffect } from 'react'
import { Ic } from '../icons.jsx'
import { current } from '@core/auth.js'
import { db, mutate, uid } from '@core/db.js'
import { notify } from '@core/notify.js'
import { PageHead, Card, Btn, Modal, Field, Input, Select, Textarea, Avatar, EmptyState, StatCard, SectionCard, STATUS } from '../components/ui.jsx'
import {
  Users, Plus, Clock, MapPin, Wallet, Check, X, Hourglass, Sparkles, ShieldCheck,
  Baby, CalendarDays, AlertTriangle, Lightbulb, UserCheck, Ban,
} from 'lucide-react'
import {
  STATES, CATEGORIES, KIDS, PLACES, DEFAULT_MIN, MIN_LEAD_DAYS, RSVP_WINDOW_H, SECURITY_NOTICE_H,
  SPACES, spaceOfRole, seesAllSpaces, CATEGORIES_OF, AUDIENCES_OF, defaultAudience, ideasFor,
  audienceOf, kidsOf, needsReason, earliestDate, rsvpDeadline, deadlinePassed,
  goingCount, adultCount, childCount, maybeList, waitlist, seatsLeft, isFull,
  hasJoined, participantOf, quorumReached, missingForQuorum, joinBlockedReason,
  amountFor, consentStale, promoteFromWaitlist, isLateWithdrawal, facilityClash,
  joinButtonLabel, sweep, isLive, isDead, isPending, canDecide, awaitingRole, belongsToSpace,
  needsSecurity, securityNeeds, securityNotice, isNightEvent,
} from '@core/social.js'
import { now as appNow } from '@core/clock.js'
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

const catOf = k => CATEGORIES.find(c => c.k === k) || CATEGORIES[0]
const money = n => `${n} DT`
// « 1 enfants » : le pluriel français ne s'accorde pas avec 1.
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`

const BLANK = (space = 'parent') => ({
  title: '', cat: CATEGORIES_OF[space][0].k, desc: '', date: '', time: '18:00', place: PLACES[0],
  audience: defaultAudience(space), reason: '', kids: 'bienvenus', custom: false,
  minParticipants: DEFAULT_MIN, maxParticipants: '', pricePerPerson: 0, priceCovers: '',
})

export default function Social() {
  const u = current()
  const isParent = u.role === 'parent'
  const canPropose = u.role !== 'owner'   // chacun propose dans SON espace
  const isDirection = ['schooladmin', 'admin'].includes(u.role)
  const [, force] = useState(0); const refresh = () => force(x => x + 1)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(() => BLANK(spaceOfRole(current().role)))
  const [join, setJoin] = useState(null)      // événement en cours d'inscription
  const [decide, setDecide] = useState(null)  // événement en cours de décision (Direction)

  const d = db()

  // Le temps fait avancer les événements tout seul : quorum manqué → annulation,
  // quorum atteint à l'échéance → soumission à la Direction.
  useEffect(() => {
    let changed = []
    mutate(db => { changed = sweep(db.socialEvents || [], Date.now()) })
    changed.forEach(({ ev, to }) => {
      // l'expéditeur est l'espace de l'événement — une formation d'enseignants
      // n'écrit pas au nom de l'« Espace parents »
      const spaceLabel = SPACES[ev.space || 'parent'].label
      if (to === 'echoue') {
        notify({ to: ev.by, kind: 'info', actor: spaceLabel, title: 'Activité annulée', body: `« ${ev.title} » n'a pas réuni ${ev.minParticipants} participants. Personne n'a été débité.`, link: '/app/social' })
        ev.participants.forEach(p => p.userId !== ev.by && notify({ to: p.userId, kind: 'info', actor: spaceLabel, title: 'Activité annulée', body: `« ${ev.title} » est annulée faute de participants. Vous n'avez rien à payer.`, link: '/app/social' }))
      }
      if (to === 'soumis') {
        // La chaîne commence à l'Administration ; la Direction tranchera ensuite.
        notify({ role: 'admin', kind: 'request', actor: 'Espaces', title: 'Activité à instruire',
          body: `« ${ev.title} » a atteint son quorum : vérifiez le lieu et la sécurité, puis visez.`, link: '/app/social' })
      }
    })
    if (changed.length) refresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Chaque rôle a son espace ; l'Administration et la Direction les voient tous.
  const mySpace = spaceOfRole(u.role)
  const seesAll = seesAllSpaces(u.role)
  const events = [...(d.socialEvents || [])]
    .filter(e => seesAll || (e.space || 'parent') === mySpace)
    .sort((a, b) => a.date.localeCompare(b.date))
  const live = events.filter(e => isLive(e.status))
  // Ce qui attend MA décision, à mon étage de la chaîne.
  const toDecide = events.filter(e => canDecide(e, u))
  const pendingAll = events.filter(e => isPending(e.status))
  const settled = events.filter(e => e.status === 'approuve' || e.status === 'termine')
  const closed = events.filter(e => isDead(e.status))

  /* ── Proposer une activité ─────────────────────────────────────────────── */
  const minDate = earliestDate(appNow())
  // Choisir « Match de football » remplit la catégorie, le lieu, la mixité, les
  // enfants, le quorum et le prix. Tout reste modifiable ensuite.
  const useIdea = idea => setF(prev => ({
    ...BLANK(mySpace), date: prev.date, time: prev.time,
    title: idea.title, cat: idea.cat, desc: idea.desc, place: idea.place,
    audience: idea.audience, kids: idea.kids,
    minParticipants: idea.min, pricePerPerson: idea.price,
    priceCovers: idea.covers || '', custom: false,
  }))

  const propose = () => {
    if (!f.title.trim()) return toast.error('Donnez un titre à votre activité')
    if (!f.date) return toast.error('Choisissez une date')
    if (f.date < minDate) return toast.error(`La date doit être au moins ${MIN_LEAD_DAYS} jours après aujourd'hui : l'école doit réserver le lieu.`)
    if (needsReason(f.audience) && !f.reason.trim()) return toast.error("Indiquez pourquoi l'activité n'est pas mixte")
    const min = Number(f.minParticipants) || DEFAULT_MIN
    const max = f.maxParticipants ? Number(f.maxParticipants) : null
    if (max && max < min) return toast.error('La capacité ne peut pas être inférieure au quorum')
    const price = Math.max(0, Number(f.pricePerPerson) || 0)
    if (price > 0 && !f.priceCovers.trim()) return toast.error('Dites ce que le prix couvre : les participants doivent le savoir avant de s\'inscrire')

    const at = Date.now()
    const ev = {
      id: uid('sev'), at, by: u.id, byName: u.name,
      title: f.title.trim(), cat: f.cat, desc: f.desc.trim(),
      date: f.date, time: f.time, place: f.place,
      audience: f.audience, reason: f.reason.trim(), kids: f.kids,
      minParticipants: min, maxParticipants: max,
      pricePerPerson: price, priceCovers: f.priceCovers.trim(),
      space: mySpace, status: 'collecte', participants: [],
    }
    // L'organisateur est le premier inscrit — il connaît le prix, il l'a fixé.
    ev.participants.push({ userId: u.id, name: u.name, rsvp: 'oui', adults: 1, children: 0, priceAgreedPerPerson: price, amountAgreed: price, agreedAt: at })
    mutate(db => { db.socialEvents = db.socialEvents || []; db.socialEvents.unshift(ev) })
    SPACES[mySpace].roles.forEach(r => notify({ role: r, kind: 'notice', actor: u.name, title: `Nouvelle activité · ${SPACES[mySpace].label}`,
      body: `${ev.title} · ${format(parseISO(ev.date), 'd MMM', { locale: fr })}${price ? ` · ${money(price)}/pers.` : ' · gratuit'}`, link: '/app/social' }))
    toast.success(`Proposition publiée : ${RSVP_WINDOW_H} h pour réunir ${min} participants`)
    setOpen(false); setF(BLANK(mySpace)); refresh()
  }

  /* ── S'inscrire ─────────────────────────────────────────────────────────── */
  const confirmJoin = (ev, { rsvp, adults, children }) => {
    const fresh = db().socialEvents.find(x => x.id === ev.id)
    if (!fresh || joinBlockedReason(fresh, u)) { setJoin(null); return }
    const price = fresh.pricePerPerson || 0
    const amount = amountFor(fresh, adults, children)
    const wait = rsvp === 'oui' && fresh.maxParticipants && goingCount(fresh) + adults + children > fresh.maxParticipants

    mutate(db => {
      const e = db.socialEvents.find(x => x.id === ev.id)
      const p = { userId: u.id, name: u.name, rsvp, adults, children, priceAgreedPerPerson: price, amountAgreed: amount, agreedAt: Date.now(), waitlisted: !!wait, paid: false }
      const i = e.participants.findIndex(x => x.userId === u.id)
      if (i >= 0) e.participants[i] = { ...e.participants[i], ...p }
      else e.participants.push(p)
      sweep([e])
    })
    if (rsvp === 'peut-etre') toast('Noté : « peut-être » ne compte pas dans le quorum')
    else if (wait) toast.success("Vous êtes en liste d'attente · une place se libère, vous êtes prévenu")
    else toast.success(price ? `Place réservée · ${money(amount)} à régler si l'école confirme` : 'Place réservée')
    if (ev.by !== u.id) notify({ to: ev.by, kind: 'info', actor: u.name, title: 'Nouvelle inscription', body: `${u.name} ${rsvp === 'oui' ? 'participe à' : 'hésite pour'} « ${ev.title} »`, link: '/app/social' })
    setJoin(null); refresh()
  }

  const withdraw = ev => {
    const late = isLateWithdrawal(ev)
    let promoted = []
    mutate(db => {
      const e = db.socialEvents.find(x => x.id === ev.id)
      e.participants = e.participants.filter(p => p.userId !== u.id)
      promoted = promoteFromWaitlist(e)
      sweep([e])
    })
    promoted.forEach(p => notify({ to: p.userId, kind: 'info', actor: SPACES[ev.space || 'parent'].label, title: 'Une place s\'est libérée', body: `Vous participez maintenant à « ${ev.title} ».`, link: '/app/social' }))
    toast.success(late ? 'Désistement enregistré : pensez à prévenir l\'organisateur, c\'est tardif' : 'Vous ne participez plus')
    refresh()
  }

  const cancelOwn = ev => {
    mutate(db => { const e = db.socialEvents.find(x => x.id === ev.id); e.status = 'annule' })
    ev.participants.forEach(p => p.userId !== u.id && notify({ to: p.userId, kind: 'info', actor: ev.byName, title: 'Activité annulée', body: `« ${ev.title} » a été annulée par l'organisateur. Vous n'avez rien à payer.`, link: '/app/social' }))
    toast.success('Activité annulée : les inscrits sont prévenus'); refresh()
  }

  /* ── Décision : Administration, puis Direction ───────────────────────────── */
  const settle = (ev, approved, note) => {
    const fresh = db().socialEvents.find(x => x.id === ev.id)
    if (!fresh || !canDecide(fresh, u)) { setDecide(null); return toast.error("Ce n'est pas à vous de décider maintenant") }
    if (!approved && !note.trim()) return toast.error('Indiquez le motif du refus : les participants le liront')

    const isFinal = fresh.status === 'vise'      // la Direction tranche
    const next = !approved ? 'refuse' : isFinal ? 'approuve' : 'vise'
    const roleLabel = u.role === 'admin' ? 'Administration' : 'Direction'

    mutate(db => {
      const e = db.socialEvents.find(x => x.id === ev.id)
      e.status = next
      e.approvals = [...(e.approvals || []), { role: u.role, by: u.name, at: Date.now(), decision: approved ? 'approuve' : 'refuse', note: note.trim() }]
      if (next !== 'vise') e.decision = { by: u.name, at: Date.now(), note: note.trim() }
      if (next === 'approuve' && needsSecurity(e)) e.securityNotifiedAt = Date.now()
    })

    if (next === 'vise') {
      notify({ role: 'schooladmin', kind: 'request', actor: u.name, title: 'Activité visée · décision attendue',
        body: `« ${ev.title} » a été visée par l'Administration. Votre approbation finale est requise.`, link: '/app/social' })
      notify({ to: ev.by, kind: 'info', actor: roleLabel, title: 'Votre activité avance',
        body: `« ${ev.title} » est visée par l'Administration ; la Direction doit encore l'approuver.`, link: '/app/social' })
      toast.success('Activité visée : transmise à la Direction pour approbation finale')
      setDecide(null); return refresh()
    }

    if (next === 'approuve') {
      // L'activité entre au calendrier de l'école…
      mutate(db => {
        db.events.push({ id: uid('e'), date: ev.date, time: ev.time, title: ev.title, type: 'Événement',
          desc: `Activité proposée par ${ev.byName} (${SPACES[ev.space || 'parent'].label}).`, place: ev.place, audience: 'all', by: u.name })
      })
      // …et l'agent de sécurité est prévenu s'il doit couvrir la soirée.
      const reasons = securityNeeds(ev)
      if (reasons.length) {
        notify({ role: 'security', kind: 'notice', actor: 'Direction', title: 'Événement à couvrir',
          body: `« ${ev.title} » · ${format(parseISO(ev.date), 'EEEE d MMMM', { locale: fr })} à ${ev.time} · ${ev.place}. ${reasons[0]}`, link: '/app/security' })
        const notice = securityNotice({ ...ev, securityNotifiedAt: Date.now() })
        if (notice.short) notify({ role: 'schooladmin', kind: 'info', actor: 'Sécurité', title: 'Préavis court pour la sécurité',
          body: `« ${ev.title} » : l'agent est prévenu ${notice.hours} h avant (minimum ${SECURITY_NOTICE_H} h).`, link: '/app/security' })
      }
    }

    ev.participants.forEach(p => notify({
      to: p.userId, kind: approved ? 'notice' : 'info', actor: roleLabel,
      title: approved ? 'Activité confirmée' : 'Activité refusée',
      body: approved
        ? `« ${ev.title} » est confirmée · ${ev.place} · ${format(parseISO(ev.date), 'EEEE d MMMM', { locale: fr })}${ev.pricePerPerson ? ` · ${money(amountFor(ev, p.adults, p.children))} à régler auprès de l'administration` : ' · gratuit'}`
        : `« ${ev.title} » n'a pas été retenue : ${note.trim()} Vous n'avez rien à payer.`,
      link: '/app/social',
    }))
    toast.success(approved ? 'Activité approuvée : lieu réservé, participants prévenus' : 'Activité refusée · participants prévenus')
    setDecide(null); refresh()
  }

  // Seule l'administration marque un participant comme ayant payé (jamais le parent).
  const markPaid = (ev, userId) => {
    mutate(db => { const e = db.socialEvents.find(x => x.id === ev.id); const p = e.participants.find(x => x.userId === userId); if (p) p.paid = !p.paid })
    refresh()
  }

  const myEvents = events.filter(e => hasJoined(e, u.id))
  // Chaque tuile s'ouvre : derrière le chiffre, les activités concernées.
  const [tile, setTile] = useState(null) // live | pending | settled | last

  return (<>
    <PageHead title={seesAll ? 'Espaces & activités' : SPACES[mySpace].label}
      sub={seesAll ? "Les activités proposées par les parents, les enseignants et le personnel · l'Administration instruit, la Direction approuve." : SPACES[mySpace].sub}
      action={canPropose && <Btn onClick={() => { setF(BLANK(mySpace)); setOpen(true) }}><Plus size={16} /> Proposer une activité</Btn>} />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard tint="brand" icon={<Sparkles size={20} />} value={live.length} label="Activités ouvertes" sub="inscriptions en cours" onClick={() => setTile('live')} />
      <StatCard tint="butter" icon={<Hourglass size={20} />} value={seesAll ? pendingAll.length : toDecide.length} label={seesAll ? "En cours de validation" : "En attente de l'école"} onClick={() => setTile('pending')} />
      <StatCard tint="mint" icon={<Check size={20} />} value={settled.length} label="Confirmées" onClick={() => setTile('settled')} />
      {seesAll
        ? <StatCard tint="grape" icon={<Users size={20} />} value={events.length} label="Propositions au total" onClick={() => setTile('last')} />
        : <StatCard tint="grape" icon={<UserCheck size={20} />} value={myEvents.length} label="Mes participations" onClick={() => setTile('last')} />}
    </div>

    {tile && (() => {
      const list = { live, pending: seesAll ? pendingAll : toDecide, settled, last: seesAll ? events : myEvents }[tile]
      const TITLE = { live: 'Activités ouvertes', pending: seesAll ? 'En cours de validation' : "En attente de l'école",
        settled: 'Activités confirmées', last: seesAll ? 'Toutes les propositions' : 'Mes participations' }
      return (
        <Modal open onClose={() => setTile(null)} title={`${TITLE[tile]} · ${list.length}`} size="xl"
          footer={<Btn variant="ghost" onClick={() => setTile(null)}>Fermer</Btn>}>
          {list.length === 0 ? <EmptyState icon={<Sparkles size={24} />} title="Aucune activité dans cet état" sub="Rien à afficher pour le moment." />
            : <div className="space-y-1.5">
              {list.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-canvas">
                  <span className="accent-text shrink-0"><Ic n={catOf(ev.cat).icon} size={20} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{ev.title}</span>
                    <span className="block text-[12px] text-muted truncate">{format(parseISO(ev.date), 'EEEE d MMMM', { locale: fr })} · {ev.time} · {ev.place} · proposé par {ev.byName}</span></span>
                  <span className="text-[12px] text-muted shrink-0">{goingCount(ev)} inscrit(s)</span>
                </div>))}
            </div>}
        </Modal>) })()}

    {/* File d'attente de la Direction */}
    {toDecide.length > 0 && (
      <SectionCard icon={<Hourglass size={16} />} tint="butter" title={u.role === 'admin' ? "Activités à instruire" : "Activités à approuver"} sub={u.role === 'admin' ? "Quorum atteint : vérifiez le lieu, la sécurité, puis visez pour la Direction." : "Visées par l'Administration · votre approbation est finale."} bodyClass="p-3" className="mb-5">
        {toDecide.map(ev => {
          const clash = facilityClash(ev, d.events)
          return (
            <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl border border-line">
              <span className="mt-0.5 accent-text"><Ic n={catOf(ev.cat).icon} size={22} /></span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm">{ev.title}</div>
                <div className="text-[12px] text-muted mt-0.5">
                  {format(parseISO(ev.date), 'EEEE d MMMM', { locale: fr })} · {ev.time} · {ev.place} · proposé par {ev.byName}
                </div>
                <div className="text-[12px] text-muted mt-0.5">
                  {plural(adultCount(ev), 'adulte', 'adultes')}{childCount(ev) > 0 && ` · ${plural(childCount(ev), 'enfant', 'enfants')}`} · {audienceOf(ev.audience).short} · {ev.pricePerPerson ? `${money(ev.pricePerPerson)}/pers.` : 'gratuit'}
                </div>
                {clash && <div className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-bold px-2 py-1 rounded-lg" style={{ background: STATUS.dangerSoft, color: STATUS.danger }}>
                  <AlertTriangle size={12} /> {ev.place} est déjà pris ce jour-là : « {clash.title} »
                </div>}
              </div>
              <Btn size="sm" onClick={() => setDecide(ev)}>Examiner</Btn>
            </div>)
        })}
      </SectionCard>
    )}

    {events.length === 0
      ? <Card><EmptyState icon={<Sparkles size={26} />} title="Aucune activité pour l'instant"
          sub={seesAll ? "Personne n'a encore rien proposé, dans aucun espace."
            : canPropose ? "Proposez la première : les autres vous rejoindront."
            : "Rien n'a encore été proposé dans cet espace."} /></Card>
      : <div className="grid lg:grid-cols-2 gap-4">
          {[...live, ...toDecide, ...settled, ...closed].map(ev =>
            <EventCard key={ev.id} ev={ev} u={u} isDirection={isDirection}
              onJoin={() => setJoin(ev)} onWithdraw={() => withdraw(ev)} onCancel={() => cancelOwn(ev)}
              onDecide={() => setDecide(ev)} onMarkPaid={markPaid} />)}
        </div>}

    {canPropose && <ProposeModal open={open} onClose={() => setOpen(false)} f={f} setF={setF} minDate={minDate} onSubmit={propose} useIdea={useIdea} space={mySpace} />}
    {join && <JoinModal ev={join} u={u} onClose={() => setJoin(null)} onConfirm={confirmJoin} />}
    {decide && <DecideModal ev={decide} clash={facilityClash(decide, d.events)} onClose={() => setDecide(null)} onSettle={settle} role={u.role} />}
  </>)
}

/* ── Carte d'une activité ─────────────────────────────────────────────────── */
function EventCard({ ev, u, isDirection, onJoin, onWithdraw, onCancel, onDecide, onMarkPaid }) {
  const st = STATES[ev.status]
  const cat = catOf(ev.cat)
  const aud = audienceOf(ev.audience)
  const kid = kidsOf(ev.kids)
  const me = participantOf(ev, u.id)
  const mine = ev.by === u.id
  const blocked = joinBlockedReason(ev, u)
  const total = goingCount(ev)
  const need = missingForQuorum(ev)
  const left = seatsLeft(ev)
  const stale = me && consentStale(ev, me)
  const deadline = rsvpDeadline(ev.at, ev.date)
  const pct = Math.min(100, Math.round((adultCount(ev) / (ev.minParticipants || 1)) * 100))

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="accent-text"><Ic n={cat.icon} size={28} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold truncate">{ev.title}</h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.color + '1E', color: st.color }}>{st.label}</span>
          </div>
          <div className="text-xs text-muted mt-0.5">proposé par {mine ? 'vous' : ev.byName}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{format(parseISO(ev.date), 'EEE d MMM', { locale: fr })} · {ev.time}</span>
        <span className="inline-flex items-center gap-1"><MapPin size={12} />{ev.place}</span>
        <span className="inline-flex items-center gap-1"><Users size={12} />{aud.short}</span>
        <span className="inline-flex items-center gap-1"><Baby size={12} />{kid.label}</span>
      </div>

      {ev.desc && <p className="text-sm text-muted">{ev.desc}</p>}
      {ev.audience !== 'mixte' && ev.reason && <p className="text-[12px] text-muted italic">Non mixte : {ev.reason}</p>}

      {/* Le prix, en évidence — jamais une surprise le jour J. */}
      <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5" style={{ background: ev.pricePerPerson ? STATUS.warnSoft : STATUS.okSoft }}>
        <Wallet size={16} style={{ color: ev.pricePerPerson ? STATUS.warn : STATUS.ok }} />
        <div className="text-xs">
          {ev.pricePerPerson
            ? <><b>{money(ev.pricePerPerson)} par personne</b>{ev.priceCovers && `${ev.priceCovers}`}<div className="text-muted">À régler auprès de l'administration, uniquement si l'école confirme l'activité.</div></>
            : <b>Gratuit</b>}
        </div>
      </div>

      {isLive(ev.status) && <>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold">{adultCount(ev)} / {ev.minParticipants} {(ev.space || 'parent') === 'parent' ? 'parents' : 'personnes'}{childCount(ev) > 0 && <span className="text-muted font-normal"> {plural(childCount(ev), 'enfant', 'enfants')}</span>}</span>
            <span className="text-muted">{need > 0 ? `encore ${need}` : 'quorum atteint'}</span>
          </div>
          <div className="h-2 rounded-full bg-canvas overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: need > 0 ? STATUS.info : STATUS.ok }} />
          </div>
          <div className="flex items-center justify-between text-[12px] text-muted mt-1.5">
            <span className="inline-flex items-center gap-1"><Clock size={11} />
              {deadlinePassed(ev) ? 'Inscriptions closes' : `Clôture ${formatDistanceToNowStrict(new Date(deadline), { addSuffix: true, locale: fr })}`}</span>
            {left != null && <span>{plural(left, 'place restante', 'places restantes')}</span>}
          </div>
        </div>
        {maybeList(ev).length > 0 && <div className="text-[12px] text-muted">{maybeList(ev).length} « peut-être » · ne comptent pas dans le quorum</div>}
        {waitlist(ev).length > 0 && <div className="text-[12px] text-muted">{waitlist(ev).length} en liste d'attente</div>}
      </>}

      {ev.status === 'refuse' && ev.decision?.note && <div className="text-xs rounded-xl px-3 py-2" style={{ background: STATUS.dangerSoft, color: STATUS.danger }}>Refusé par la Direction : {ev.decision.note}</div>}
      {ev.status === 'echoue' && <div className="text-xs text-muted">Quorum non atteint avant la clôture. Personne n'a été débité.</div>}

      {/* Participants + encaissement (Direction) */}
      {(ev.status === 'approuve' || ev.status === 'termine') && (
        <div className="rounded-xl border border-line p-2.5">
          <div className="text-[12px] font-bold text-muted mb-1.5">{plural(adultCount(ev), 'participant', 'participants')}{ev.pricePerPerson ? ' · règlement auprès de l\'administration' : ''}</div>
          <div className="space-y-1">
            {ev.participants.filter(p => p.rsvp === 'oui' && !p.waitlisted).map(p => (
              <div key={p.userId} className="flex items-center gap-2 text-xs">
                <Avatar name={p.name} seed={p.userId} size={22} />
                <span className="flex-1 truncate">{p.name}{p.children > 0 && <span className="text-muted"> +{plural(p.children, 'enfant', 'enfants')}</span>}</span>
                {ev.pricePerPerson > 0 && <>
                  <span className="text-muted tabular-nums">{money(p.amountAgreed)}</span>
                  {isDirection
                    ? <button onClick={() => onMarkPaid(ev, p.userId)} className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: p.paid ? STATUS.okSoft : STATUS.neutralSoft, color: p.paid ? STATUS.ok : STATUS.neutral }}>{p.paid ? 'Réglé' : 'À régler'}</button>
                    : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: p.paid ? STATUS.okSoft : STATUS.neutralSoft, color: p.paid ? STATUS.ok : STATUS.neutral }}>{p.paid ? 'Réglé' : 'À régler'}</span>}
                </>}
              </div>))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
        {belongsToSpace(ev.space, u.role) && isLive(ev.status) && (
          me
            ? <>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl" style={{ background: STATUS.okSoft, color: STATUS.ok }}>
                  <Check size={13} />{me.waitlisted ? "En liste d'attente" : me.rsvp === 'oui' ? 'Vous participez' : 'Peut-être'}</span>
                {stale && <span className="text-[12px] font-bold" style={{ color: STATUS.warn }}>Le prix a changé · reconfirmez</span>}
                {stale && <Btn size="sm" onClick={onJoin}>Reconfirmer</Btn>}
                <Btn size="sm" variant="ghost" onClick={onWithdraw}>Se désister</Btn>
              </>
            : blocked
              ? <span className="inline-flex items-center gap-1.5 text-xs text-muted"><Ban size={13} />{blocked}</span>
              : <Btn size="sm" onClick={onJoin}>{isFull(ev) ? "Rejoindre la liste d'attente" : joinButtonLabel(ev)}</Btn>
        )}
        {mine && isLive(ev.status) && <Btn size="sm" variant="danger" onClick={onCancel}><X size={13} /> Annuler</Btn>}
        {canDecide(ev, u) && <Btn size="sm" onClick={onDecide}><ShieldCheck size={14} /> {ev.status === 'vise' ? 'Approuver' : 'Instruire'}</Btn>}
      </div>
    </Card>
  )
}

/* ── Proposer ─────────────────────────────────────────────────────────────── */
function ProposeModal({ open, onClose, f, setF, minDate, onSubmit, useIdea, space }) {
  const [filter, setFilter] = useState('tous')
  const cats = CATEGORIES_OF[space]
  const ideas = ideasFor(space)
  const shown = filter === 'tous' ? ideas : ideas.filter(i => i.cat === filter)
  const chosen = f.title && !f.custom
  return (
    <Modal open={open} onClose={onClose} title="Proposer une activité" size="2xl"
      footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn><Btn onClick={onSubmit} disabled={!f.title.trim()}>Publier la proposition</Btn></>}>

      {/* Le titre est un CHOIX, pas un champ vide : on prend une activité et la
          catégorie, le lieu, la mixité, les enfants, le quorum et le prix suivent. */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Lightbulb size={16} className="accent-text" />
          <span className="text-sm font-bold">Quelle activité ? <span className="text-muted font-medium">Le reste se remplit tout seul.</span></span>
        </div>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {[{ k: 'tous', label: 'Tout', icon: 'Sparkles' }, ...cats].map(c => (
            <button key={c.k} onClick={() => setFilter(c.k)} aria-pressed={filter === c.k}
              className={`text-[12px] font-bold px-2.5 py-1.5 rounded-full border transition ${filter === c.k ? 'border-transparent text-white' : 'border-line hover:bg-canvas'}`}
              style={filter === c.k ? { background: 'var(--accent)' } : {}}><Ic n={c.icon} size={14} /> {c.label}</button>))}
        </div>
        <div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto scroll-thin pr-1">
          {shown.map(i => {
            const on = f.title === i.title && !f.custom
            return (
              <button key={i.title} onClick={() => useIdea(i)} aria-pressed={on}
                className={`text-left rounded-2xl border p-3 transition ${on ? 'border-transparent shadow-md' : 'border-line hover:bg-canvas hover:-translate-y-0.5'}`}
                style={on ? { boxShadow: '0 0 0 2px var(--accent)', background: 'var(--accent-soft)' } : {}}>
                <div className="text-sm font-bold flex items-center gap-2"><Ic n={catOf(i.cat).icon} size={16} className="accent-text" />{i.title}</div>
                <div className="text-[12px] text-muted mt-1 flex flex-wrap gap-x-2.5">
                  <span className="inline-flex items-center gap-1"><MapPin size={11} />{i.place}</span>
                  <span className="inline-flex items-center gap-1"><Users size={11} />{audienceOf(i.audience).short} · {i.min}</span>
                  <span className="inline-flex items-center gap-1 font-bold" style={{ color: i.price ? STATUS.warn : STATUS.ok }}><Wallet size={11} />{i.price ? money(i.price) : 'gratuit'}</span>
                </div>
              </button>)
          })}
          <button onClick={() => setF({ ...BLANK(space), custom: true, date: f.date, time: f.time })} aria-pressed={!!f.custom}
            className={`text-left rounded-2xl border border-dashed p-3 transition ${f.custom ? 'border-transparent' : 'border-line hover:bg-canvas'}`}
            style={f.custom ? { boxShadow: '0 0 0 2px var(--accent)', background: 'var(--accent-soft)' } : {}}>
            <div className="text-sm font-bold flex items-center gap-2"><Ic n="Pencil" size={16} />Autre activité</div>
            <div className="text-[12px] text-muted mt-1">Écrivez votre propre titre et réglez tout vous-même.</div>
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {f.custom && <div className="sm:col-span-2"><Field label="Titre *"><Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="ex. Tournoi de tennis de table" /></Field></div>}
        {chosen && <div className="sm:col-span-2 rounded-xl px-3 py-2.5 flex items-center gap-2.5 text-sm" style={{ background: 'var(--accent-soft)' }}>
          <span className="accent-text"><Ic n={catOf(f.cat).icon} size={18} /></span>
          <span className="font-bold flex-1">{f.title}</span>
          <button onClick={() => setF({ ...f, custom: true })} className="text-[12px] font-bold accent-text">renommer</button>
        </div>}
        <Field label="Catégorie"><Select value={f.cat} onChange={e => setF({ ...f, cat: e.target.value })}>{cats.map(c => <option key={c.k} value={c.k}>{c.label}</option>)}</Select></Field>
        <Field label="Lieu"><Select value={f.place} onChange={e => setF({ ...f, place: e.target.value })}>{PLACES.map(p => <option key={p}>{p}</option>)}</Select></Field>
        <Field label={`Date * (au plus tôt le ${minDate})`} hint={`L'école a besoin de ${MIN_LEAD_DAYS} jours pour réserver le lieu.`}>
          <Input type="date" min={minDate} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Heure"><Input type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></Field>

        <Field label="Qui peut participer ?"><Select value={f.audience} onChange={e => setF({ ...f, audience: e.target.value })}>{AUDIENCES_OF[space].map(a => <option key={a.k} value={a.k}>{a.label}</option>)}</Select></Field>
        <Field label="Les enfants"><Select value={f.kids} onChange={e => setF({ ...f, kids: e.target.value })}>{KIDS.map(k => <option key={k.k} value={k.k}>{k.label}</option>)}</Select></Field>
        {needsReason(f.audience) && <div className="sm:col-span-2"><Field label="Pourquoi cette activité n'est-elle pas ouverte à tous ? *" hint="Les autres participants et la Direction liront ce motif.">
          <Input value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} placeholder="ex. cours de danse entre mamans, avec garde d'enfants" /></Field></div>}

        <Field label="Participants minimum" hint="En dessous, l'activité s'annule toute seule."><Input type="number" min={2} value={f.minParticipants} onChange={e => setF({ ...f, minParticipants: e.target.value })} /></Field>
        <Field label="Capacité maximum (optionnel)" hint="Au-delà : liste d'attente."><Input type="number" min={1} value={f.maxParticipants} onChange={e => setF({ ...f, maxParticipants: e.target.value })} placeholder="illimité" /></Field>

        <Field label="Prix par personne (DT)" hint="0 = gratuit."><Input type="number" min={0} value={f.pricePerPerson} onChange={e => setF({ ...f, pricePerPerson: e.target.value })} /></Field>
        {Number(f.pricePerPerson) > 0 && <Field label="Le prix couvre… *"><Input value={f.priceCovers} onChange={e => setF({ ...f, priceCovers: e.target.value })} placeholder="ex. la location du terrain et l'arbitre" /></Field>}

        <div className="sm:col-span-2"><Field label="Description"><Textarea rows={3} value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} placeholder="Ce qui est prévu, ce qu'il faut apporter…" /></Field></div>
      </div>

      <p className="text-[12px] text-muted mt-3">
        Votre proposition reste ouverte <b>{RSVP_WINDOW_H} h</b>. Si <b>{f.minParticipants || DEFAULT_MIN} personnes</b> s'inscrivent, elle part à l'Administration, qui l'instruit, puis à la Direction, qui l'approuve et réserve le lieu.
        Sinon elle s'annule et <b>personne ne paie</b>. L'argent n'est jamais prélevé ici : il se règle auprès de l'administration, après confirmation.
      </p>
    </Modal>
  )
}

/* ── S'inscrire — le consentement au prix vit ici ──────────────────────────── */
function JoinModal({ ev, u, onClose, onConfirm }) {
  const me = participantOf(ev, u.id)
  const [rsvp, setRsvp] = useState(me?.rsvp || 'oui')
  const [adults, setAdults] = useState(me?.adults || 1)
  const [children, setChildren] = useState(me?.children || 0)
  const [agreed, setAgreed] = useState(false)   // JAMAIS pré-coché
  const kid = kidsOf(ev.kids)
  const kidsAllowed = ev.kids === 'bienvenus' || ev.kids === 'pour'
  const price = ev.pricePerPerson || 0
  const amount = amountFor(ev, adults, kidsAllowed ? children : 0)
  const needsConsent = price > 0 && rsvp === 'oui'
  const wait = rsvp === 'oui' && ev.maxParticipants && goingCount(ev) + adults + (kidsAllowed ? children : 0) > ev.maxParticipants

  return (
    <Modal open onClose={onClose} title={ev.title} size="lg"
      footer={<><Btn variant="ghost" onClick={onClose}>Annuler</Btn>
        <Btn disabled={needsConsent && !agreed} onClick={() => onConfirm(ev, { rsvp, adults, children: kidsAllowed ? children : 0 })}>
          {rsvp === 'peut-etre' ? 'Enregistrer « peut-être »' : wait ? "Rejoindre la liste d'attente" : joinButtonLabel(ev)}
        </Btn></>}>

      <div className="flex flex-wrap gap-2 mb-4">
        {[['oui', 'Je participe'], ['peut-etre', 'Peut-être']].map(([k, l]) => (
          <button key={k} onClick={() => setRsvp(k)} aria-pressed={rsvp === k}
            className={`text-sm font-semibold px-3.5 py-2 rounded-xl border transition ${rsvp === k ? 'border-transparent text-white' : 'border-line hover:bg-canvas'}`}
            style={rsvp === k ? { background: 'var(--accent)' } : {}}>{l}</button>))}
      </div>
      <p className="text-[12px] text-muted -mt-2 mb-4">« Peut-être » ne compte pas dans le quorum : c'est un signal pour l'organisateur.</p>

      {rsvp === 'oui' && <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Field label="Adultes"><Input type="number" min={1} max={4} value={adults} onChange={e => setAdults(Math.max(1, Number(e.target.value) || 1))} /></Field>
        {kidsAllowed
          ? <Field label="Enfants" hint={kid.hint}><Input type="number" min={0} max={6} value={children} onChange={e => setChildren(Math.max(0, Number(e.target.value) || 0))} /></Field>
          : <Field label="Enfants"><div className="text-sm rounded-xl border border-line px-3 py-2.5 text-muted flex items-center gap-1.5"><Baby size={14} />{kid.label}</div></Field>}
      </div>}

      {wait && <div className="text-xs rounded-xl px-3 py-2.5 mb-4" style={{ background: STATUS.infoSoft, color: '#0B5E86' }}>
        L'activité est complète : vous serez placé en <b>liste d'attente</b> et prévenu dès qu'une place se libère.</div>}

      {/* Le prix, puis le consentement explicite. Case jamais pré-cochée. */}
      {rsvp === 'oui' && (price > 0
        ? <div className="rounded-2xl border-2 p-3.5" style={{ borderColor: STATUS.warn + '55', background: STATUS.warnSoft }}>
            <div className="flex items-center gap-2 text-sm font-bold" style={{ color: '#8A5A12' }}><Wallet size={16} /> Cette activité est payante</div>
            <div className="text-sm mt-1.5">
              <b>{money(price)} par personne</b>{ev.priceCovers && <> {ev.priceCovers}</>}.
              <div className="mt-1">Vous vous engagez pour <b>{plural(adults + (kidsAllowed ? children : 0), 'personne', 'personnes')}</b>, soit <b className="text-base">{money(amount)}</b>.</div>
            </div>
            <label className="flex items-start gap-2.5 mt-3 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0" />
              <span className="text-xs">J'ai compris que ma participation coûte <b>{money(amount)}</b>, à régler auprès de l'administration <b>uniquement si l'école confirme</b> l'activité. Si le quorum n'est pas atteint ou si l'école refuse, je ne dois rien.</span>
            </label>
          </div>
        : <div className="rounded-xl px-3 py-2.5 text-sm flex items-center gap-2" style={{ background: STATUS.okSoft, color: '#0A5E48' }}><Wallet size={15} /> <b>Activité gratuite.</b></div>)}
    </Modal>
  )
}

/* ── Décision de la Direction ─────────────────────────────────────────────── */
function DecideModal({ ev, clash, onClose, onSettle, role }) {
  const [note, setNote] = useState('')
  const aud = audienceOf(ev.audience)
  const isFinal = ev.status === 'vise'   // la Direction tranche ; l'Administration ne fait que viser
  const reasons = securityNeeds(ev)
  return (
    <Modal open onClose={onClose} title={isFinal ? "Approuver l'activité" : "Instruire l'activité"} size="lg"
      footer={<><Btn variant="danger" onClick={() => onSettle(ev, false, note)}><X size={15} /> Refuser</Btn>
        <Btn onClick={() => onSettle(ev, true, note)}><Check size={15} /> {isFinal ? "Approuver & réserver" : "Viser & transmettre à la Direction"}</Btn></>}>
      <div className="space-y-2 text-sm">
        <div className="font-extrabold text-base flex items-center gap-2"><Ic n={catOf(ev.cat).icon} size={17} className="accent-text" />{ev.title}</div>
        <div className="text-muted">{ev.desc}</div>
        <div className="grid sm:grid-cols-2 gap-2 pt-2">
          {[['Quand', `${format(parseISO(ev.date), 'EEEE d MMMM', { locale: fr })} · ${ev.time}`],
            ['Lieu', ev.place],
            ['Organisateur', ev.byName],
            ['Public', aud.label],
            ['Enfants', kidsOf(ev.kids).label],
            ['Participants', `${plural(adultCount(ev), 'adulte', 'adultes')}${childCount(ev) ? ` · ${plural(childCount(ev), 'enfant', 'enfants')}` : ''} (quorum ${ev.minParticipants})`],
            ['Prix', ev.pricePerPerson ? `${money(ev.pricePerPerson)} / personne : ${ev.priceCovers}` : 'Gratuit'],
            ['Total attendu', ev.pricePerPerson ? money(ev.participants.filter(p => p.rsvp === 'oui' && !p.waitlisted).reduce((s, p) => s + p.amountAgreed, 0)) : '·'],
          ].map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5">
            <span className="text-muted text-xs">{k}</span><span className="font-medium text-xs text-right">{v}</span></div>)}
        </div>
        {ev.audience !== 'mixte' && ev.reason && <div className="text-xs text-muted italic">Motif de non-mixité : {ev.reason}</div>}
        {clash && <div className="rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center gap-2" style={{ background: STATUS.dangerSoft, color: STATUS.danger }}>
          <AlertTriangle size={15} /> Conflit : « {clash.title} » occupe déjà {ev.place} ce jour-là.</div>}
        <Field label="Motif (obligatoire en cas de refus)">
          <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="ex. le terrain est réservé pour le cross de l'école" /></Field>
        {reasons.length > 0 && <div className="rounded-xl px-3 py-2.5 text-[12px]" style={{ background: '#EEF1F6', color: '#334155' }}>
          <div className="font-bold flex items-center gap-1.5 mb-1"><ShieldCheck size={13} /> Présence de l'agent de sécurité requise</div>
          <ul className="space-y-0.5">{reasons.map(r => <li key={r}> {r}</li>)}</ul>
          <div className="mt-1 opacity-80">L'agent est prévenu dès l'approbation ; il lui faut {SECURITY_NOTICE_H} h pour préparer.</div>
        </div>}
        <p className="text-[12px] text-muted">{isFinal
          ? `En approuvant, l'activité entre au calendrier de l'école, les ${adultCount(ev)} inscrits sont prévenus${ev.pricePerPerson ? ' du montant à régler' : ''}${reasons.length ? ", et l'agent de sécurité reçoit sa feuille de route" : ''}.`
          : "En visant, vous transmettez à la Direction, qui décidera. Rien n'est confirmé aux participants tant qu'elle n'a pas approuvé."} En refusant, personne ne paie.</p>
      </div>
    </Modal>
  )
}
