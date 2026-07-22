// Poste de sécurité — portage natif de app/src/pages/Security.jsx.
// TOUT le métier vient de core/src/security.js (registre des visiteurs, rondes,
// main courante, check-lists, consignes) et core/src/social.js (événements à
// couvrir). Cet écran affiche et appelle les mêmes mutations que le web.
import { useReducer, useState } from 'react'
import { View, Text, Pressable, ScrollView, Modal, Linking } from 'react-native'
import { db, mutate, uid, settings } from '@core/db.js'
import { notify } from '@core/notify.js'
import { ROLE } from '@core/theme.js'
import {
  URGENCES, CONSIGNES, CHECKPOINTS, checkpointOf, LOG_KINDS, logKindOf,
  ID_TYPES, PURPOSES, needsEscort, isInside, badgeNumber,
  CHECKLIST, CHECK_PHASES, checklistTotal, checklistDone, phaseDone, isPhaseComplete, checklistComplete,
} from '@core/security.js'
import {
  securityNeeds, needsSecurity, isNightEvent, securityNotice, SECURITY_NOTICE_H,
  adultCount, childCount,
} from '@core/social.js'
import { now as appNow, todayIso, frDateLabel } from '@core/clock.js'
import { Ic } from '../icons.js'
import { Screen, Card, Section, Chip, Badge, Avatar, Tile, Btn, Input, EmptyState, Bar, C } from '../components.js'

// Mêmes teintes que STATUS côté web (ui.jsx).
const OK = '#12946F', WARN = '#C97C1E', DANGER = '#DC4B54', INFO = '#0E7FB8', NEUTRAL = '#94A3B8'

// Heures & dates sans date-fns (interdit côté natif — cf. core/clock.js).
const p2 = n => String(n).padStart(2, '0')
const hm = d => `${p2(d.getHours())}:${p2(d.getMinutes())}`
// La promesse du formulaire (« enregistré, jamais affiché en entier ») vaut
// aussi à l'affichage : on masque tout ce qui dépasse 4 caractères.
const maskId = n => { const s = String(n || ''); return s.length > 4 ? s.slice(0, 4) + '****' : s }
const M3 = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const dayShort = d => `${d.getDate()} ${M3[d.getMonth()]}`
const fmtLong = iso => frDateLabel(new Date(iso + 'T00:00:00'))

function Sheet({ title, onClose, children, footer }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0E213566', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '92%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18, paddingBottom: 8 }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: C.ink }} numberOfLines={2}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}><Ic n="X" size={20} color={C.muted} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14 }}>{children}</ScrollView>
          {footer && <View style={{ padding: 18, paddingTop: 10, paddingBottom: 28, borderTopWidth: 1, borderTopColor: C.line }}>{footer}</View>}
        </View>
      </View>
    </Modal>
  )
}
const Lbl = ({ children }) => <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, marginTop: 14, marginBottom: 7 }}>{children}</Text>
const Wrap = ({ children }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>{children}</View>
const Err = ({ msg }) => msg ? <Text style={{ color: DANGER, fontWeight: '700', fontSize: 12, marginBottom: 8 }}>{msg}</Text> : null

/* ── 1) Les événements à couvrir + la check-list ─────────────────────────── */
function EventsTab({ u, toCover, force, accent }) {
  const [open, setOpen] = useState(null)   // id de l'événement dont la check-list est ouverte
  if (!toCover.length) return (
    <Card><EmptyState icon="ShieldCheck" title="Aucun événement à couvrir"
      sub="Les activités approuvées qui demandent une présence de sécurité apparaîtront ici, dès leur validation par la Direction." /></Card>
  )
  return (<>
    {toCover.map(ev => {
      const reasons = securityNeeds(ev)
      const notice = securityNotice(ev)
      const checks = ev.security?.checks || {}
      const done = checklistDone(checks); const total = checklistTotal()
      const night = isNightEvent(ev)
      return (
        <Card key={ev.id} style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: night ? '#EEF1F6' : INFO + '14' }}>
              <Ic n={night ? 'Moon' : 'Sun'} size={19} color={C.muted} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontWeight: '800', color: C.ink, fontSize: 15 }}>{ev.title}</Text>
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>{fmtLong(ev.date)} · {ev.time} · {ev.place}</Text>
            </View>
            {night && <Badge label="SOIRÉE" color="#334155" />}
          </View>

          {/* Le préavis : un agent prévenu la veille ne peut pas reconnaître les lieux. */}
          {notice.short && (
            <View style={{ flexDirection: 'row', gap: 8, backgroundColor: WARN + '14', borderRadius: 12, padding: 10, marginTop: 10 }}>
              <Ic n="AlertTriangle" size={14} color={WARN} />
              <Text style={{ flex: 1, fontSize: 12, color: '#8A5A12' }}>
                Préavis court : <Text style={{ fontWeight: '800' }}>{notice.hours} h</Text> avant l'événement (minimum recommandé : {SECURITY_NOTICE_H} h). Signalez-le à la Direction.
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, marginTop: 10, marginBottom: 4 }}>Pourquoi une présence est nécessaire</Text>
          {reasons.map(r => <Text key={r} style={{ fontSize: 12, color: C.ink, marginTop: 2 }}> {r}</Text>)}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ic n="Users" size={12} color={C.muted} />
              <Text style={{ fontSize: 12, color: C.muted }}>{adultCount(ev)} adultes{childCount(ev) > 0 ? ` · ${childCount(ev)} enfants` : ''}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ic n="UserCheck" size={12} color={C.muted} />
              <Text style={{ fontSize: 12, color: C.muted }}>organisateur : {ev.byName}</Text>
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: C.ink }}>Check-list</Text>
              <Text style={{ fontSize: 12, color: C.muted }}>{done} / {total}</Text>
            </View>
            <Bar pct={(done / total) * 100} color={checklistComplete(checks) ? OK : INFO} height={8} />
          </View>

          <View style={{ marginTop: 12 }}>
            <Btn small icon="ShieldCheck" label={done ? 'Poursuivre la check-list' : 'Ouvrir la check-list'} color={accent} onPress={() => setOpen(ev.id)} />
          </View>
        </Card>
      )
    })}
    {open && <ChecklistSheet evId={open} u={u} onClose={() => setOpen(null)} force={force} />}
  </>)
}

function ChecklistSheet({ evId, u, onClose, force }) {
  const [, bump] = useReducer(x => x + 1, 0)
  const fresh = db().socialEvents.find(x => x.id === evId)
  if (!fresh) return null
  const ev = fresh
  const checks = ev.security?.checks || {}

  const toggle = k => {
    mutate(db => {
      const e = db.socialEvents.find(x => x.id === ev.id)
      e.security = e.security || { checks: {}, notes: '' }
      e.security.checks = { ...e.security.checks, [k]: !e.security.checks[k] }
      e.security.agentName = u.name
    })
    bump(); force()
  }
  const finish = () => {
    // Clore la check-list écrit d'office dans la main courante : c'est la trace.
    mutate(db => {
      db.logbook.unshift({ id: uid('l'), at: Date.now(), agentName: u.name, kind: 'evenement',
        place: ev.place, text: `« ${ev.title} » · check-list de sécurité complétée (${checklistTotal()} points).` })
    })
    notify({ role: 'schooladmin', kind: 'info', actor: u.name, title: 'Événement sécurisé',
      body: `« ${ev.title} » : check-list complétée.`, link: '/app/security' })
    onClose(); force()
  }

  return (
    <Sheet title={ev.title} onClose={onClose}
      footer={<Btn icon="Check" color={OK} disabled={!checklistComplete(checks)}
        label={checklistComplete(checks) ? 'Clore la check-list' : `Encore ${checklistTotal() - checklistDone(checks)} point(s)`}
        onPress={finish} />}>

      <Text style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
        {fmtLong(ev.date)} · {ev.time} · {ev.place} · {adultCount(ev)} adultes attendus
      </Text>
      {CHECK_PHASES.map(ph => (
        <View key={ph.k} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontWeight: '800', color: C.ink, fontSize: 14 }}>{ph.label}</Text>
            <Badge label={`${phaseDone(checks, ph.k)} / ${CHECKLIST[ph.k].length}`} color={isPhaseComplete(checks, ph.k) ? OK : NEUTRAL} />
            <Text style={{ fontSize: 11, color: C.muted, flex: 1 }}>{ph.hint}</Text>
          </View>
          {CHECKLIST[ph.k].map(item => (
            <Pressable key={item.k} onPress={() => toggle(item.k)}
              style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 7 }}>
              <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: checks[item.k] ? OK : C.line, backgroundColor: checks[item.k] ? OK : '#fff', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                {!!checks[item.k] && <Ic n="Check" size={13} color="#fff" />}
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: checks[item.k] ? C.muted : C.ink, textDecorationLine: checks[item.k] ? 'line-through' : 'none' }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </Sheet>
  )
}

/* ── 2) Registre des visiteurs ───────────────────────────────────────────── */
const BLANK_V = () => ({ name: '', idType: 'CIN', idNumber: '', org: '', purpose: PURPOSES[0], hostName: '', vehicle: '', escortName: '' })

function VisitorsTab({ u, d, force, accent }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(BLANK_V)
  const [err, setErr] = useState('')
  const today = todayIso()
  const list = (d.visitors || []).filter(v => v.date === today).sort((a, b) => (b.inAt || '').localeCompare(a.inAt || ''))
  const inside = list.filter(isInside)

  const checkIn = () => {
    if (!f.name.trim()) return setErr('Nom du visiteur requis')
    if (!f.idNumber.trim()) return setErr("Pièce d'identité requise : c'est le seul contrôle réel")
    if (!f.hostName.trim()) return setErr('Qui reçoit ce visiteur ?')
    const escort = needsEscort(f.purpose)
    if (escort && !f.escortName.trim()) return setErr("Cette visite exige un accompagnateur : indiquez qui accompagne")
    const n = (d.visitors || []).length + 1
    mutate(db => {
      db.visitors.unshift({ id: uid('v'), date: today, name: f.name.trim(), idType: f.idType, idNumber: f.idNumber.trim(),
        org: f.org.trim(), purpose: f.purpose, hostName: f.hostName.trim(), inAt: hm(appNow()), outAt: null,
        badge: badgeNumber(n), escort, escortName: f.escortName.trim(), vehicle: f.vehicle.trim(), agentName: u.name })
      db.logbook.unshift({ id: uid('l'), at: Date.now(), agentName: u.name, kind: 'visiteur', place: 'Portail principal',
        text: `Entrée de ${f.name.trim()} (${f.purpose}) badge ${badgeNumber(n)}${escort ? `, accompagné par ${f.escortName.trim()}` : ''}.` })
    })
    setOpen(false); setF(BLANK_V()); setErr(''); force()
  }
  const checkOut = v => {
    const t = hm(appNow())
    mutate(db => {
      const x = db.visitors.find(y => y.id === v.id); if (x) x.outAt = t
      db.logbook.unshift({ id: uid('l'), at: Date.now(), agentName: u.name, kind: 'visiteur', place: 'Portail principal',
        text: `Sortie de ${v.name} badge ${v.badge} rendu à ${t}.` })
    })
    force()
  }

  return (<>
    <Section title="Registre des visiteurs" style={{ marginTop: 0 }}
      right={<Btn small icon="Plus" label="Entrée" color={accent} onPress={() => { setF(BLANK_V()); setErr(''); setOpen(true) }} />}>
      <Text style={{ fontSize: 12, color: C.muted, marginBottom: 10, marginTop: -6 }}>{today} · {inside.length} personne(s) actuellement dans l'école</Text>
      {list.length === 0
        ? <Card><EmptyState icon="DoorOpen" title="Aucun visiteur aujourd'hui" sub="Chaque personne extérieure est enregistrée avec sa pièce d'identité et un badge." /></Card>
        : list.map(v => (
            <Card key={v.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Avatar name={v.name} color={accent} size={34} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontWeight: '800', color: C.ink, fontSize: 14 }}>{v.name}</Text>
                    <Badge label={v.badge} color={NEUTRAL} />
                  </View>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }} numberOfLines={2}>{v.purpose} · reçu par {v.hostName}{v.org ? ` · ${v.org}` : ''}</Text>
                  <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                    {v.idType} {maskId(v.idNumber)}{v.vehicle ? ` · ${v.vehicle}` : ''}
                    {v.escort && <Text style={{ fontWeight: '800', color: WARN }}> accompagné par {v.escortName}</Text>}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={{ fontSize: 12, color: C.ink }}><Text style={{ fontWeight: '800' }}>{v.inAt}</Text>{v.outAt ? ` → ${v.outAt}` : ''}</Text>
                  {isInside(v)
                    ? <Btn small kind="ghost" icon="LogOut" label="Sortie" color={accent} onPress={() => checkOut(v)} />
                    : <Badge label="sorti" color={OK} />}
                </View>
              </View>
            </Card>
          ))}
    </Section>

    {open && (
      <Sheet title="Entrée d'un visiteur" onClose={() => { setOpen(false); setErr('') }}
        footer={<>
          <Err msg={err} />
          <Btn icon="LogIn" label="Enregistrer l'entrée" color={accent} onPress={checkIn} />
        </>}>
        <Lbl>Nom & prénom *</Lbl>
        <Input value={f.name} onChangeText={t => setF({ ...f, name: t })} placeholder="Nizar Ben Amor" />
        <Lbl>Société / organisme</Lbl>
        <Input value={f.org} onChangeText={t => setF({ ...f, org: t })} placeholder="Papeterie El Amel" />
        <Lbl>Pièce d'identité</Lbl>
        <Wrap>{ID_TYPES.map(t => <Chip key={t} label={t} color={accent} active={f.idType === t} onPress={() => setF({ ...f, idType: t })} />)}</Wrap>
        <Lbl>Numéro * : enregistré, jamais affiché en entier</Lbl>
        <Input value={f.idNumber} onChangeText={t => setF({ ...f, idNumber: t })} placeholder="0912xxxx" />
        <Lbl>Motif de la visite</Lbl>
        <Wrap>{PURPOSES.map(p => <Chip key={p} label={p} color={accent} active={f.purpose === p} onPress={() => setF({ ...f, purpose: p })} />)}</Wrap>
        <Lbl>Personne visitée *</Lbl>
        <Input value={f.hostName} onChangeText={t => setF({ ...f, hostName: t })} placeholder="Hela Morjane" />
        <Lbl>Véhicule (immatriculation)</Lbl>
        <Input value={f.vehicle} onChangeText={t => setF({ ...f, vehicle: t })} placeholder="214 TU 3120" />
        {needsEscort(f.purpose) && <>
          <Lbl>Accompagnateur * : cette visite mène auprès des élèves</Lbl>
          <Input value={f.escortName} onChangeText={t => setF({ ...f, escortName: t })} placeholder="Dali Brahmi" />
          <View style={{ flexDirection: 'row', gap: 8, backgroundColor: WARN + '14', borderRadius: 12, padding: 10, marginTop: 12 }}>
            <Ic n="AlertTriangle" size={14} color={WARN} />
            <Text style={{ flex: 1, fontSize: 12, color: '#8A5A12' }}>
              Un visiteur qui approche les élèves <Text style={{ fontWeight: '800' }}>ne circule jamais seul</Text>. Badge remis, accompagnateur désigné, sortie enregistrée.
            </Text>
          </View>
        </>}
      </Sheet>
    )}
  </>)
}

/* ── 3) Rondes ───────────────────────────────────────────────────────────── */
function RoundsTab({ u, d, force, accent }) {
  const today = todayIso()
  const [live, setLive] = useState(null)   // ronde en cours : { startAt, points:{} }
  const [anomaly, setAnomaly] = useState({})
  const [err, setErr] = useState('')
  const rounds = (d.rounds || []).filter(r => r.date === today).sort((a, b) => (b.startAt || '').localeCompare(a.startAt || ''))

  const start = () => { setLive({ startAt: hm(appNow()), points: {} }); setErr('') }
  const mark = k => setLive(l => ({ ...l, points: { ...l.points, [k]: { at: hm(appNow()), anomaly: anomaly[k] || '' } } }))
  const finish = () => {
    const points = CHECKPOINTS.filter(c => live.points[c.k]).map(c => ({ k: c.k, ...live.points[c.k] }))
    if (!points.length) return setErr('Pointez au moins une zone')
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
    setLive(null); setAnomaly({}); setErr(''); force()
  }

  return (<>
    <Section title={live ? `Ronde en cours · démarrée à ${live.startAt}` : 'Nouvelle ronde'} style={{ marginTop: 0 }}
      right={live
        ? <Btn small icon="Check" label="Clore" color={OK} onPress={finish} />
        : <Btn small icon="Flashlight" label="Démarrer" color={accent} onPress={start} />}>
      <Text style={{ fontSize: 12, color: C.muted, marginBottom: 10, marginTop: -6 }}>
        Pointez chaque zone à votre passage. Une anomalie remonte à la Direction et s'inscrit dans la main courante.
      </Text>
      <Err msg={err} />
      {CHECKPOINTS.map(cp => {
        const p = live?.points[cp.k]
        return (
          <Card key={cp.k} style={{ marginBottom: 8, backgroundColor: p ? OK + '10' : '#fff' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ic n="MapPin" size={14} color={p ? OK : NEUTRAL} />
              <Text style={{ flex: 1, fontWeight: '700', color: C.ink, fontSize: 14 }}>{cp.label}</Text>
              {p
                ? <Text style={{ fontSize: 12, fontWeight: '800', color: OK }}>{p.at}</Text>
                : live
                  ? <Btn small kind="ghost" label="Pointer" color={accent} onPress={() => mark(cp.k)} />
                  : <Text style={{ fontSize: 11, color: C.muted }}> </Text>}
            </View>
            {live && !p && (
              <Input style={{ marginTop: 8, fontSize: 12, padding: 9 }} placeholder="Anomalie (facultatif)"
                value={anomaly[cp.k] || ''} onChangeText={t => setAnomaly({ ...anomaly, [cp.k]: t })} />
            )}
            {!!p?.anomaly && (
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                <Ic n="AlertTriangle" size={12} color={WARN} />
                <Text style={{ flex: 1, fontSize: 12, color: WARN }}>{p.anomaly}</Text>
              </View>
            )}
          </Card>
        )
      })}
    </Section>

    <Section title="Rondes du jour">
      {rounds.length === 0
        ? <Card><EmptyState icon="Flashlight" title="Aucune ronde aujourd'hui" sub="Démarrez une ronde ci-dessus." /></Card>
        : rounds.map(r => (
            <Card key={r.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '700', color: C.ink, fontSize: 14 }}>{r.agentName}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>{r.startAt} → {r.endAt}</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {r.points.map(p => (
                  <Badge key={p.k} icon={p.anomaly ? 'TriangleAlert' : 'Check'} label={`${checkpointOf(p.k).label} · ${p.at}`} color={p.anomaly ? WARN : OK} />
                ))}
              </View>
              {r.points.filter(p => p.anomaly).map(p => (
                <View key={p.k} style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  <Ic n="AlertTriangle" size={12} color={WARN} />
                  <Text style={{ flex: 1, fontSize: 12, color: WARN }}><Text style={{ fontWeight: '800' }}>{checkpointOf(p.k).label} :</Text> {p.anomaly}</Text>
                </View>
              ))}
            </Card>
          ))}
    </Section>
  </>)
}

/* ── 4) Main courante ────────────────────────────────────────────────────── */
function LogTab({ u, d, force, accent }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ kind: 'consigne', place: 'Poste de garde', text: '' })
  const [err, setErr] = useState('')
  const log = [...(d.logbook || [])].sort((a, b) => b.at - a.at)

  const add = () => {
    if (!f.text.trim()) return setErr('Écrivez ce que vous constatez')
    mutate(db => { db.logbook.unshift({ id: uid('l'), at: Date.now(), agentName: u.name, kind: f.kind, place: f.place, text: f.text.trim() }) })
    if (f.kind === 'anomalie' || f.kind === 'alarme')
      notify({ role: 'schooladmin', kind: 'info', actor: u.name, title: logKindOf(f.kind).label, body: f.text.trim(), link: '/app/security' })
    setOpen(false); setF({ kind: 'consigne', place: 'Poste de garde', text: '' }); setErr(''); force()
  }
  const shift = kind => {
    mutate(db => { db.logbook.unshift({ id: uid('l'), at: Date.now(), agentName: u.name, kind, place: 'Poste de garde',
      text: kind === 'prise' ? 'Prise de service.' : 'Fin de service. Clés rendues.' }) })
    force()
  }

  return (<>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      <Btn small kind="ghost" icon="LogIn" label="Prise de service" color={OK} onPress={() => shift('prise')} />
      <Btn small kind="ghost" icon="LogOut" label="Fin de service" color={NEUTRAL} onPress={() => shift('fin')} />
      <Btn small icon="Plus" label="Écrire" color={accent} onPress={() => { setErr(''); setOpen(true) }} />
    </View>
    <Text style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
      Le journal du poste : prise de service, rondes, visiteurs, anomalies. On y écrit, on n'y efface pas.
    </Text>

    {log.length === 0
      ? <Card><EmptyState icon="BookOpen" title="Main courante vide" sub="Commencez par votre prise de service." /></Card>
      : log.map(l => {
          const k = logKindOf(l.kind)
          const at = new Date(l.at)
          return (
            <Card key={l.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Ic n={k.icon} size={17} color={k.color} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Badge label={k.label} color={k.color} />
                    <Text style={{ fontSize: 12, color: C.muted }}>{l.place}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: C.ink, marginTop: 4 }}>{l.text}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.muted }}>{hm(at)}</Text>
                  <Text style={{ fontSize: 11, color: C.muted }}>{dayShort(at)}</Text>
                  <Text style={{ fontSize: 11, color: C.muted }} numberOfLines={1}>{l.agentName}</Text>
                </View>
              </View>
            </Card>
          )
        })}

    {open && (
      <Sheet title="Écrire à la main courante" onClose={() => { setOpen(false); setErr('') }}
        footer={<>
          <Err msg={err} />
          <Btn icon="BookOpen" label="Inscrire" color={accent} onPress={add} />
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 9 }}>
            Une anomalie ou une alarme prévient immédiatement la Direction.
          </Text>
        </>}>
        <Lbl>Nature</Lbl>
        <Wrap>
          {Object.entries(LOG_KINDS).filter(([k]) => !['prise', 'fin'].includes(k)).map(([k, v]) => (
            <Chip key={k} icon={v.icon} label={v.label} color={v.color} active={f.kind === k} onPress={() => setF({ ...f, kind: k })} />
          ))}
        </Wrap>
        <Lbl>Lieu</Lbl>
        <Input value={f.place} onChangeText={t => setF({ ...f, place: t })} />
        <Lbl>Constat : faits, heure, personnes, actions menées</Lbl>
        <Input value={f.text} onChangeText={t => setF({ ...f, text: t })} multiline numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }} placeholder="Ce que vous avez vu, fait, et ce qui a suivi." />
      </Sheet>
    )}
  </>)
}

/* ── 5) Consignes ────────────────────────────────────────────────────────── */
function ConsignesTab() {
  return (<>
    <Section title="Numéros d'urgence · Tunisie" style={{ marginTop: 0 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {URGENCES.map(x => (
          <Card key={x.k} style={{ flexBasis: '47%', flexGrow: 1 }}
            onPress={() => Linking.openURL(`tel:${x.num}`).catch(() => {})}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: DANGER }}>{x.num}</Text>
            <Text style={{ fontWeight: '800', color: C.ink, fontSize: 14, marginTop: 2 }}>{x.label}</Text>
            <Text style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{x.hint}</Text>
          </Card>
        ))}
      </View>
    </Section>

    <Section title="Procédures d'urgence">
      {CONSIGNES.map(cg => (
        <Card key={cg.k} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <Ic n={cg.icon} size={22} color={cg.color} />
            <Text style={{ fontWeight: '800', fontSize: 15, color: cg.color }}>{cg.label}</Text>
          </View>
          {cg.steps.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 9, marginBottom: 7 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: cg.color + '1E', marginTop: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: cg.color }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: C.ink }}>{s}</Text>
            </View>
          ))}
        </Card>
      ))}
      <Text style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
        Ces consignes suivent le cadre tunisien : Code de la sécurité et de la prévention des risques d'incendie
        (loi 2009-11) et instructions de la Protection civile : plan d'évacuation affiché, équipe de sécurité désignée,
        moyens de secours vérifiés. Elles ne remplacent pas la formation de l'agent, elles la rappellent.
      </Text>
    </Section>
  </>)
}

/* ── Écran ────────────────────────────────────────────────────────────────── */
export default function Security({ user, params, nav }) {
  const u = user
  const [, force] = useReducer(x => x + 1, 0)
  const accent = (ROLE[u.role] || ROLE.admin).color
  const [tab, setTab] = useState('evenements')

  const d = db()
  const today = todayIso()
  const insideNow = (d.visitors || []).filter(v => v.date === today && isInside(v)).length
  // Les événements approuvés que l'agent doit couvrir, les plus proches d'abord.
  const toCover = (d.socialEvents || [])
    .filter(e => e.status === 'approuve' && e.date >= today && needsSecurity(e))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const tonight = toCover.filter(e => e.date === today)
  const openIncidents = (d.incidents || []).filter(i => i.status === 'open').length
  const roundsToday = (d.rounds || []).filter(r => r.date === today).length

  const TABS = [
    ['evenements', 'À couvrir', toCover.length],
    ['visiteurs', 'Visiteurs', insideNow],
    ['rondes', 'Rondes', 0],
    ['journal', 'Main courante', 0],
    ['consignes', 'Consignes', 0],
  ]

  return (
    <Screen title="Poste de sécurité" sub={`${settings().schoolName} · portail, visiteurs, rondes et soirées`}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Tile icon="CalendarClock" color="#7539E4" label="Ce soir" sub={tonight.length ? 'à couvrir' : 'rien de prévu'} value={String(tonight.length)} />
        <Tile icon="UserCheck" color="#7C5CD6" label="Visiteurs dans l'école" value={String(insideNow)} />
        <Tile icon="Flashlight" color={INFO} label="Rondes aujourd'hui" value={String(roundsToday)} />
        <Tile icon="AlertTriangle" color={DANGER} label="Incidents ouverts" value={String(openIncidents)} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, marginBottom: 16 }}>
        {TABS.map(([k, label, count]) => (
          <Chip key={k} label={count ? `${label} · ${count}` : label} color={accent} active={tab === k} onPress={() => setTab(k)} />
        ))}
      </ScrollView>

      {tab === 'evenements' && <EventsTab u={u} toCover={toCover} force={force} accent={accent} />}
      {tab === 'visiteurs' && <VisitorsTab u={u} d={d} force={force} accent={accent} />}
      {tab === 'rondes' && <RoundsTab u={u} d={d} force={force} accent={accent} />}
      {tab === 'journal' && <LogTab u={u} d={d} force={force} accent={accent} />}
      {tab === 'consignes' && <ConsignesTab />}
    </Screen>
  )
}
