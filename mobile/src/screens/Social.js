// Espaces & activités — portage natif de app/src/pages/Social.jsx.
// TOUTES les règles (quorum, fenêtres, chaîne Administration → Direction,
// espaces, consentement au prix) viennent de core/src/social.js : cet écran
// ne fait qu'afficher et appeler les mêmes mutations que le web.
import { BRAND } from '@core/tokens.js'
import { useEffect, useReducer, useState } from 'react'
import { View, Text, Pressable, ScrollView, Modal } from 'react-native'
import { db, mutate, uid } from '@core/db.js'
import { notify } from '@core/notify.js'
import { ROLE } from '@core/theme.js'
import { now as appNow, isoOf, frDateLabel } from '@core/clock.js'
import {
  STATES, isLive, isDead, isPending, canDecide, sweep,
  SPACES, spaceOfRole, seesAllSpaces, belongsToSpace,
  CATEGORIES, CATEGORIES_OF, AUDIENCES_OF, defaultAudience, audienceOf, needsReason,
  KIDS, kidsOf, PLACES, ideasFor,
  DEFAULT_MIN, MIN_LEAD_DAYS, RSVP_WINDOW_H, SECURITY_NOTICE_H,
  earliestDate, addDays, rsvpDeadline, deadlinePassed,
  goingCount, adultCount, childCount, maybeList, waitlist, seatsLeft, isFull,
  hasJoined, participantOf, missingForQuorum, joinBlockedReason,
  amountFor, consentStale, promoteFromWaitlist, isLateWithdrawal, facilityClash,
  joinButtonLabel, needsSecurity, securityNeeds, securityNotice,
} from '@core/social.js'
import { Ic } from '../icons.js'
import { Screen, Card, Section, Chip, Badge, Avatar, Tile, Row, Btn, Input, EmptyState, Bar, C, confirmAsk } from '../components.js'

// Jetons d'état — mêmes teintes que STATUS côté web.
const OK = '#12946F', WARN = '#C97C1E', DANGER = '#DC4B54', INFO = '#0E7FB8'
const SPACE_TINT = { parent: ROLE.parent.color, teacher: ROLE.teacher.color, staff: ROLE.admin.color }

const money = n => `${n} DT`
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`
const catOf = k => CATEGORIES.find(c => c.k === k) || CATEGORIES[0]

// Dates en français sans date-fns (interdit côté natif) — cf. core/clock.js.
const J3 = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const M3 = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const dOf = iso => new Date(iso + 'T00:00:00')
const fmtShort = iso => { const d = dOf(iso); return `${J3[d.getDay()]} ${d.getDate()} ${M3[d.getMonth()]}` }
const fmtLong = iso => frDateLabel(dOf(iso))
const untilLabel = ms => {
  if (ms <= 0) return 'imminente'
  const m = Math.round(ms / 60000)
  if (m < 60) return `dans ${m} min`
  const h = Math.round(m / 60)
  if (h < 48) return `dans ${h} h`
  return `dans ${Math.round(h / 24)} jours`
}

const BLANK = (space = 'parent') => ({
  title: '', cat: CATEGORIES_OF[space][0].k, desc: '', date: '', time: '18:00', place: PLACES[0],
  audience: defaultAudience(space), reason: '', kids: 'bienvenus', custom: false,
  minParticipants: DEFAULT_MIN, maxParticipants: 0, pricePerPerson: 0, priceCovers: '',
})

/* ── Briques locales (feuilles, libellés, compteurs) ─────────────────────── */
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
const Meta = ({ icon, text }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 12, marginBottom: 3 }}>
    <Ic n={icon} size={12} color={C.muted} />
    <Text style={{ fontSize: 12, color: C.muted }}>{text}</Text>
  </View>
)
const Err = ({ msg }) => msg ? <Text style={{ color: DANGER, fontWeight: '700', fontSize: 12, marginBottom: 8 }}>{msg}</Text> : null

function Stepper({ value, onChange, min = 0, max = 99, suffix = '' }) {
  const B = ({ d, icon }) => (
    <Pressable onPress={() => onChange(Math.min(max, Math.max(min, value + d)))} hitSlop={6}
      style={{ width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Ic n={icon} size={16} color={C.ink} />
    </Pressable>
  )
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <B d={-1} icon="Minus" />
      <Text style={{ minWidth: 54, textAlign: 'center', fontWeight: '800', fontSize: 16, color: C.ink }}>{value}{suffix}</Text>
      <B d={1} icon="Plus" />
    </View>
  )
}

/* ── Carte d'une activité ────────────────────────────────────────────────── */
function EventCard({ ev, u, isDirection, seesAll, onJoin, onWithdraw, onCancel, onDecide, onMarkPaid }) {
  const st = STATES[ev.status]
  const cat = catOf(ev.cat)
  const aud = audienceOf(ev.audience)
  const kid = kidsOf(ev.kids)
  const me = participantOf(ev, u.id)
  const mine = ev.by === u.id
  const blocked = joinBlockedReason(ev, u)
  const need = missingForQuorum(ev)
  const left = seatsLeft(ev)
  const stale = me && consentStale(ev, me)
  const deadline = rsvpDeadline(ev.at, ev.date)
  const pct = Math.min(100, Math.round((adultCount(ev) / (ev.minParticipants || 1)) * 100))
  const going = (ev.participants || []).filter(p => p.rsvp === 'oui' && !p.waitlisted)
  const spaceKey = ev.space || 'parent'

  return (
    <Card style={{ marginBottom: 14, opacity: isDead(ev.status) || ev.status === 'termine' ? 0.72 : 1 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Ic n={cat.icon} size={28} color={BRAND.action} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontWeight: '800', color: C.ink, fontSize: 15 }}>{ev.title}</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>proposé par {mine ? 'vous' : ev.byName}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            <Badge label={st.label} color={st.color} />
            {seesAll && <Badge label={SPACES[spaceKey].label} color={SPACE_TINT[spaceKey]} />}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
        <Meta icon="CalendarDays" text={`${fmtShort(ev.date)} · ${ev.time}`} />
        <Meta icon="MapPin" text={ev.place} />
        <Meta icon="Users" text={aud.short} />
        <Meta icon="Baby" text={kid.label} />
      </View>

      {!!ev.desc && <Text style={{ color: C.muted, fontSize: 13, marginTop: 7 }}>{ev.desc}</Text>}
      {ev.audience !== 'mixte' && !!ev.reason && <Text style={{ color: C.muted, fontSize: 12, fontStyle: 'italic', marginTop: 4 }}>Non mixte : {ev.reason}</Text>}

      {/* Le prix, en évidence — jamais une surprise le jour J. */}
      <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start', borderRadius: 12, padding: 10, marginTop: 10, backgroundColor: (ev.pricePerPerson ? WARN : OK) + '14' }}>
        <Ic n="Wallet" size={15} color={ev.pricePerPerson ? WARN : OK} />
        <View style={{ flex: 1 }}>
          {ev.pricePerPerson
            ? <>
                <Text style={{ fontSize: 12, color: C.ink }}><Text style={{ fontWeight: '800' }}>{money(ev.pricePerPerson)} par personne</Text>{ev.priceCovers ? `${ev.priceCovers}` : ''}</Text>
                <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>À régler auprès de l'administration, uniquement si l'école confirme l'activité.</Text>
              </>
            : <Text style={{ fontSize: 12, fontWeight: '800', color: C.ink }}>Gratuit</Text>}
        </View>
      </View>

      {isLive(ev.status) && (
        <View style={{ marginTop: 11 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink }}>
              {adultCount(ev)} / {ev.minParticipants} {(spaceKey === 'parent') ? 'parents' : 'personnes'}
              {childCount(ev) > 0 && <Text style={{ fontWeight: '400', color: C.muted }}> {plural(childCount(ev), 'enfant', 'enfants')}</Text>}
            </Text>
            <Text style={{ fontSize: 12, color: C.muted }}>{need > 0 ? `encore ${need}` : 'quorum atteint'}</Text>
          </View>
          <Bar pct={pct} color={need > 0 ? INFO : OK} height={8} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ic n="Clock" size={11} color={C.muted} />
              <Text style={{ fontSize: 12, color: C.muted }}>{deadlinePassed(ev) ? 'Inscriptions closes' : `Clôture ${untilLabel(deadline - Date.now())}`}</Text>
            </View>
            {left != null && <Text style={{ fontSize: 12, color: C.muted }}>{plural(left, 'place restante', 'places restantes')}</Text>}
          </View>
          {maybeList(ev).length > 0 && <Text style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{maybeList(ev).length} « peut-être » · ne comptent pas dans le quorum</Text>}
          {waitlist(ev).length > 0 && <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{waitlist(ev).length} en liste d'attente</Text>}
        </View>
      )}

      {ev.status === 'refuse' && !!ev.decision?.note && (
        <View style={{ borderRadius: 12, padding: 10, marginTop: 10, backgroundColor: DANGER + '14' }}>
          <Text style={{ fontSize: 12, color: DANGER, fontWeight: '600' }}>Refusé : {ev.decision.note}</Text>
        </View>
      )}
      {ev.status === 'echoue' && <Text style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Quorum non atteint avant la clôture. Personne n'a été débité.</Text>}

      {/* Participants + encaissement (Direction) */}
      {(ev.status === 'approuve' || ev.status === 'termine') && going.length > 0 && (
        <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 10, marginTop: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, marginBottom: 6 }}>
            {plural(adultCount(ev), 'participant', 'participants')}{ev.pricePerPerson ? " · règlement auprès de l'administration" : ''}
          </Text>
          {going.map(p => (
            <View key={p.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Avatar name={p.name} size={24} color={SPACE_TINT[spaceKey]} />
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: C.ink }}>
                {p.name}{p.children > 0 ? <Text style={{ color: C.muted }}> +{plural(p.children, 'enfant', 'enfants')}</Text> : null}
              </Text>
              {ev.pricePerPerson > 0 && <>
                <Text style={{ fontSize: 12, color: C.muted }}>{money(p.amountAgreed)}</Text>
                <Pressable disabled={!isDirection} onPress={() => onMarkPaid(ev, p.userId)}>
                  <Badge label={p.paid ? 'Réglé' : 'À régler'} color={p.paid ? OK : C.muted} />
                </Pressable>
              </>}
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' }}>
        {belongsToSpace(ev.space, u.role) && isLive(ev.status) && (
          me
            ? <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: OK + '14', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Ic n="Check" size={13} color={OK} />
                  <Text style={{ color: OK, fontWeight: '800', fontSize: 12 }}>{me.waitlisted ? "En liste d'attente" : me.rsvp === 'oui' ? 'Vous participez' : 'Peut-être'}</Text>
                </View>
                {stale && <Btn small label="Le prix a changé · reconfirmer" color={WARN} onPress={onJoin} />}
                <Btn small kind="ghost" label="Se désister" color={C.muted} onPress={onWithdraw} />
              </>
            : blocked
              ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
                  <Ic n="Ban" size={13} color={C.muted} />
                  <Text style={{ fontSize: 12, color: C.muted, flex: 1 }}>{blocked}</Text>
                </View>
              : <Btn small label={isFull(ev) ? "Rejoindre la liste d'attente" : joinButtonLabel(ev)} color={ev.pricePerPerson ? WARN : OK} onPress={onJoin} />
        )}
        {mine && isLive(ev.status) && <Btn small kind="ghost" icon="X" label="Annuler" color={DANGER} onPress={onCancel} />}
        {canDecide(ev, u) && <Btn small icon="ShieldCheck" label={ev.status === 'vise' ? 'Approuver' : 'Instruire'} color={ROLE[u.role]?.color || INFO} onPress={onDecide} />}
      </View>
    </Card>
  )
}

/* ── Proposer une activité — le titre est un CHOIX, pas un champ vide ────── */
function ProposeSheet({ f, setF, space, minDate, err, onSubmit, onClose, accent }) {
  const [filter, setFilter] = useState('tous')
  const cats = CATEGORIES_OF[space]
  const ideas = ideasFor(space)
  const shown = filter === 'tous' ? ideas : ideas.filter(i => i.cat === filter)
  const chosen = f.title && !f.custom
  const dates = [...Array(8)].map((_, i) => isoOf(addDays(appNow(), MIN_LEAD_DAYS + i)))
  const TIMES = ['09:00', '10:30', '14:00', '16:30', '18:00', '19:00']
  const pickIdea = idea => setF(prev => ({
    ...BLANK(space), date: prev.date, time: prev.time,
    title: idea.title, cat: idea.cat, desc: idea.desc, place: idea.place,
    audience: idea.audience, kids: idea.kids,
    minParticipants: idea.min, pricePerPerson: idea.price,
    priceCovers: idea.covers || '', custom: false,
  }))

  return (
    <Sheet title="Proposer une activité" onClose={onClose}
      footer={<>
        <Err msg={err} />
        <Btn label="Publier la proposition" icon="Sparkles" color={accent} disabled={!f.title.trim()} onPress={onSubmit} />
        <Text style={{ fontSize: 11, color: C.muted, marginTop: 9 }}>
          Ouverte {RSVP_WINDOW_H} h. Si {f.minParticipants || DEFAULT_MIN} personnes s'inscrivent, elle part à l'Administration puis à la Direction. Sinon elle s'annule et personne ne paie · rien n'est prélevé ici.
        </Text>
      </>}>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Ic n="Lightbulb" size={15} color={accent} />
        <Text style={{ fontWeight: '800', color: C.ink, fontSize: 13 }}>Quelle activité ? <Text style={{ color: C.muted, fontWeight: '500' }}>Le reste se remplit tout seul.</Text></Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {[{ k: 'tous', label: 'Tout', icon: 'Sparkles' }, ...cats].map(c => (
          <Chip key={c.k} icon={c.icon} label={c.label} color={accent} active={filter === c.k} onPress={() => setFilter(c.k)} />
        ))}
      </ScrollView>

      {shown.map(i => {
        const on = f.title === i.title && !f.custom
        return (
          <Pressable key={i.title} onPress={() => pickIdea(i)}
            style={{ borderWidth: 2, borderColor: on ? accent : C.line, backgroundColor: on ? accent + '12' : '#fff', borderRadius: 16, padding: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ic n={catOf(i.cat).icon} size={19} color={accent} />
              <Text style={{ flex: 1, fontWeight: '800', fontSize: 13, color: C.ink }}>{i.title}</Text>
            </View>
            <Text style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
              {i.place} · {audienceOf(i.audience).short} · quorum {i.min} · <Text style={{ fontWeight: '800', color: i.price ? WARN : OK }}>{i.price ? money(i.price) : 'gratuit'}</Text>
            </Text>
          </Pressable>
        )
      })}
      <Pressable onPress={() => setF({ ...BLANK(space), custom: true, date: f.date, time: f.time })}
        style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: f.custom ? accent : C.line, backgroundColor: f.custom ? accent + '12' : '#fff', borderRadius: 16, padding: 12, marginBottom: 8 }}>
        <Ic n="Pencil" size={15} color={C.ink} /><Text style={{ fontWeight: '800', fontSize: 13, color: C.ink }}>Autre activité</Text>
        <Text style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Écrivez votre propre titre et réglez tout vous-même.</Text>
      </Pressable>

      {f.custom && <>
        <Lbl>Titre *</Lbl>
        <Input value={f.title} onChangeText={t => setF({ ...f, title: t })} placeholder="ex. Tournoi de tennis de table" />
        <Lbl>Catégorie</Lbl>
        <Wrap>{cats.map(c => <Chip key={c.k} icon={c.icon} label={c.label} color={accent} active={f.cat === c.k} onPress={() => setF({ ...f, cat: c.k })} />)}</Wrap>
        <Lbl>Lieu</Lbl>
        <Wrap>{PLACES.map(p => <Chip key={p} label={p} color={accent} active={f.place === p} onPress={() => setF({ ...f, place: p })} />)}</Wrap>
        <Lbl>Qui peut participer ?</Lbl>
        <Wrap>{AUDIENCES_OF[space].map(a => <Chip key={a.k} label={a.short} color={accent} active={f.audience === a.k} onPress={() => setF({ ...f, audience: a.k })} />)}</Wrap>
        <Lbl>Les enfants</Lbl>
        <Wrap>{KIDS.map(k => <Chip key={k.k} label={k.label} color={accent} active={f.kids === k.k} onPress={() => setF({ ...f, kids: k.k })} />)}</Wrap>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <Lbl>Participants minimum</Lbl>
            <Stepper value={f.minParticipants} min={2} max={60} onChange={v => setF({ ...f, minParticipants: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <Lbl>Capacité max (0 = illimité)</Lbl>
            <Stepper value={f.maxParticipants} min={0} max={99} onChange={v => setF({ ...f, maxParticipants: v })} />
          </View>
        </View>
        <Lbl>Prix par personne (0 = gratuit)</Lbl>
        <Stepper value={f.pricePerPerson} min={0} max={60} suffix=" DT" onChange={v => setF({ ...f, pricePerPerson: v })} />
        {f.pricePerPerson > 0 && <>
          <Lbl>Le prix couvre… *</Lbl>
          <Input value={f.priceCovers} onChangeText={t => setF({ ...f, priceCovers: t })} placeholder="ex. la location du terrain et l'arbitre" />
        </>}
        <Lbl>Description</Lbl>
        <Input value={f.desc} onChangeText={t => setF({ ...f, desc: t })} multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top' }} placeholder="Ce qui est prévu, ce qu'il faut apporter…" />
      </>}

      {chosen && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: accent + '12', borderRadius: 12, padding: 10, marginTop: 12 }}>
          <Text style={{ fontSize: 18 }}>{catOf(f.cat).icon}</Text>
          <Text style={{ flex: 1, fontWeight: '800', fontSize: 13, color: C.ink }}>{f.title}</Text>
          <Text style={{ fontSize: 12, fontWeight: '800', color: f.pricePerPerson ? WARN : OK }}>{f.pricePerPerson ? `${money(f.pricePerPerson)}/pers.` : 'gratuit'}</Text>
        </View>
      )}

      {needsReason(f.audience) && <>
        <Lbl>Pourquoi cette activité n'est-elle pas ouverte à tous ? *</Lbl>
        <Input value={f.reason} onChangeText={t => setF({ ...f, reason: t })} placeholder="ex. cours de danse entre mamans, avec garde d'enfants" />
      </>}

      <Lbl>Date * · au plus tôt le {fmtShort(minDate)} : l'école doit réserver le lieu ({MIN_LEAD_DAYS} jours)</Lbl>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {dates.map(d => <Chip key={d} label={fmtShort(d)} color={accent} active={f.date === d} onPress={() => setF({ ...f, date: d })} />)}
      </ScrollView>
      <Lbl>Heure</Lbl>
      <Wrap>{TIMES.map(t => <Chip key={t} label={t} color={accent} active={f.time === t} onPress={() => setF({ ...f, time: t })} />)}</Wrap>
    </Sheet>
  )
}

/* ── S'inscrire — le consentement au prix vit ici, case JAMAIS pré-cochée ── */
function JoinSheet({ ev, u, onClose, onConfirm, accent }) {
  const me = participantOf(ev, u.id)
  const [rsvp, setRsvp] = useState(me?.rsvp || 'oui')
  const [adults, setAdults] = useState(me?.adults || 1)
  const [children, setChildren] = useState(me?.children || 0)
  const [agreed, setAgreed] = useState(false)
  const kid = kidsOf(ev.kids)
  const kidsAllowed = ev.kids === 'bienvenus' || ev.kids === 'pour'
  const price = ev.pricePerPerson || 0
  const amount = amountFor(ev, adults, kidsAllowed ? children : 0)
  const needsConsent = price > 0 && rsvp === 'oui'
  const wait = rsvp === 'oui' && ev.maxParticipants && goingCount(ev) + adults + (kidsAllowed ? children : 0) > ev.maxParticipants

  return (
    <Sheet title={ev.title} onClose={onClose}
      footer={<Btn color={accent} disabled={needsConsent && !agreed}
        label={rsvp === 'peut-etre' ? 'Enregistrer « peut-être »' : wait ? "Rejoindre la liste d'attente" : joinButtonLabel(ev)}
        onPress={() => onConfirm(ev, { rsvp, adults, children: kidsAllowed ? children : 0 })} />}>

      <Wrap>
        {[['oui', 'Je participe'], ['peut-etre', 'Peut-être']].map(([k, l]) =>
          <Chip key={k} label={l} color={accent} active={rsvp === k} onPress={() => setRsvp(k)} />)}
      </Wrap>
      <Text style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>« Peut-être » ne compte pas dans le quorum : c'est un signal pour l'organisateur.</Text>

      {rsvp === 'oui' && (
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Lbl>Adultes</Lbl>
            <Stepper value={adults} min={1} max={4} onChange={setAdults} />
          </View>
          <View style={{ flex: 1 }}>
            <Lbl>Enfants</Lbl>
            {kidsAllowed
              ? <Stepper value={children} min={0} max={6} onChange={setChildren} />
              : <Text style={{ fontSize: 12, color: C.muted, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 10 }}>{kid.label}</Text>}
          </View>
        </View>
      )}
      {kidsAllowed && !!kid.hint && rsvp === 'oui' && <Text style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{kid.hint}</Text>}

      {!!wait && (
        <View style={{ backgroundColor: INFO + '14', borderRadius: 12, padding: 10, marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: INFO }}>L'activité est complète : vous serez placé en <Text style={{ fontWeight: '800' }}>liste d'attente</Text> et prévenu dès qu'une place se libère.</Text>
        </View>
      )}

      {rsvp === 'oui' && (price > 0
        ? <View style={{ borderWidth: 2, borderColor: WARN + '55', backgroundColor: WARN + '12', borderRadius: 16, padding: 12, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ic n="Wallet" size={15} color={WARN} />
              <Text style={{ fontWeight: '800', fontSize: 13, color: '#8A5A12' }}>Cette activité est payante</Text>
            </View>
            <Text style={{ fontSize: 13, color: C.ink, marginTop: 6 }}>
              <Text style={{ fontWeight: '800' }}>{money(price)} par personne</Text>{ev.priceCovers ? `${ev.priceCovers}` : ''}.
            </Text>
            <Text style={{ fontSize: 13, color: C.ink, marginTop: 3 }}>
              Vous vous engagez pour <Text style={{ fontWeight: '800' }}>{plural(adults + (kidsAllowed ? children : 0), 'personne', 'personnes')}</Text>, soit <Text style={{ fontWeight: '800', fontSize: 15 }}>{money(amount)}</Text>.
            </Text>
            <Pressable onPress={() => setAgreed(a => !a)} style={{ flexDirection: 'row', gap: 9, marginTop: 11 }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: agreed ? WARN : C.line, backgroundColor: agreed ? WARN : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                {agreed && <Ic n="Check" size={14} color="#fff" />}
              </View>
              <Text style={{ flex: 1, fontSize: 12, color: C.ink }}>
                J'ai compris que ma participation coûte <Text style={{ fontWeight: '800' }}>{money(amount)}</Text>, à régler auprès de l'administration <Text style={{ fontWeight: '800' }}>uniquement si l'école confirme</Text> l'activité. Si le quorum n'est pas atteint ou si l'école refuse, je ne dois rien.
              </Text>
            </Pressable>
          </View>
        : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: OK + '14', borderRadius: 12, padding: 10, marginTop: 12 }}>
            <Ic n="Wallet" size={14} color={OK} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#0A5E48' }}>Activité gratuite.</Text>
          </View>)}
    </Sheet>
  )
}

/* ── Décision : l'Administration instruit, la Direction tranche ──────────── */
function DecideSheet({ ev, clash, role, onClose, onSettle, accent }) {
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const aud = audienceOf(ev.audience)
  const isFinal = ev.status === 'vise'
  const reasons = securityNeeds(ev)
  const total = (ev.participants || []).filter(p => p.rsvp === 'oui' && !p.waitlisted).reduce((s, p) => s + (p.amountAgreed || 0), 0)
  const rows = [
    ['Quand', `${fmtLong(ev.date)} · ${ev.time}`],
    ['Lieu', ev.place],
    ['Organisateur', ev.byName],
    ['Espace', SPACES[ev.space || 'parent'].label],
    ['Public', aud.label],
    ['Enfants', kidsOf(ev.kids).label],
    ['Participants', `${plural(adultCount(ev), 'adulte', 'adultes')}${childCount(ev) ? ` · ${plural(childCount(ev), 'enfant', 'enfants')}` : ''} (quorum ${ev.minParticipants})`],
    ['Prix', ev.pricePerPerson ? `${money(ev.pricePerPerson)} / personne : ${ev.priceCovers}` : 'Gratuit'],
    ['Total attendu', ev.pricePerPerson ? money(total) : '·'],
  ]
  return (
    <Sheet title={isFinal ? "Approuver l'activité" : "Instruire l'activité"} onClose={onClose}
      footer={<>
        <Err msg={err} />
        <Btn color={accent} icon="Check" label={isFinal ? 'Approuver & réserver' : 'Viser & transmettre à la Direction'} onPress={() => onSettle(ev, true, note, setErr)} />
        <View style={{ height: 9 }} />
        <Btn kind="ghost" color={DANGER} icon="X" label="Refuser" onPress={() => onSettle(ev, false, note, setErr)} />
      </>}>

      <Text style={{ fontWeight: '800', fontSize: 16, color: C.ink }}>{catOf(ev.cat).icon} {ev.title}</Text>
      {!!ev.desc && <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{ev.desc}</Text>}
      <View style={{ marginTop: 10 }}>
        {rows.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 7 }}>
            <Text style={{ fontSize: 12, color: C.muted }}>{k}</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.ink, flex: 1, textAlign: 'right' }}>{v}</Text>
          </View>
        ))}
      </View>
      {ev.audience !== 'mixte' && !!ev.reason && <Text style={{ fontSize: 12, color: C.muted, fontStyle: 'italic', marginTop: 8 }}>Motif de non-mixité : {ev.reason}</Text>}

      {!!clash && (
        <View style={{ flexDirection: 'row', gap: 8, backgroundColor: DANGER + '14', borderRadius: 12, padding: 10, marginTop: 10 }}>
          <Ic n="AlertTriangle" size={15} color={DANGER} />
          <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: DANGER }}>Conflit : « {clash.title} » occupe déjà {ev.place} ce jour-là.</Text>
        </View>
      )}

      {reasons.length > 0 && (
        <View style={{ backgroundColor: '#EEF1F6', borderRadius: 12, padding: 10, marginTop: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Ic n="ShieldCheck" size={13} color="#334155" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>Présence de l'agent de sécurité requise</Text>
          </View>
          {reasons.map(r => <Text key={r} style={{ fontSize: 12, color: '#334155', marginTop: 2 }}> {r}</Text>)}
          <Text style={{ fontSize: 11, color: '#33415599', marginTop: 5 }}>L'agent est prévenu dès l'approbation ; il lui faut {SECURITY_NOTICE_H} h pour préparer.</Text>
        </View>
      )}

      <Lbl>Motif (obligatoire en cas de refus)</Lbl>
      <Input value={note} onChangeText={setNote} multiline numberOfLines={2} style={{ minHeight: 60, textAlignVertical: 'top' }}
        placeholder="ex. le terrain est réservé pour le cross de l'école" />
      <Text style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
        {isFinal
          ? `En approuvant, l'activité entre au calendrier de l'école et les ${adultCount(ev)} inscrits sont prévenus${ev.pricePerPerson ? ' du montant à régler' : ''}${reasons.length ? ", et l'agent de sécurité reçoit sa feuille de route" : ''}.`
          : "En visant, vous transmettez à la Direction, qui décidera. Rien n'est confirmé aux participants tant qu'elle n'a pas approuvé."} En refusant, personne ne paie.
      </Text>
    </Sheet>
  )
}

/* ── Écran ────────────────────────────────────────────────────────────────── */
export default function Social({ user, params, nav }) {
  const u = user
  const [, force] = useReducer(x => x + 1, 0)
  const accent = (ROLE[u.role] || ROLE.admin).color
  const canPropose = u.role !== 'owner'          // chacun propose dans SON espace
  const isDirection = ['schooladmin', 'admin'].includes(u.role)
  const mySpace = spaceOfRole(u.role)
  const seesAll = seesAllSpaces(u.role)

  const [open, setOpen] = useState(false)
  const [f, setF] = useState(() => BLANK(mySpace))
  const [err, setErr] = useState('')
  const [join, setJoin] = useState(null)         // id de l'événement en cours d'inscription
  const [decide, setDecide] = useState(null)     // id de l'événement en cours de décision
  const [spaceFilter, setSpaceFilter] = useState('tous')

  // Le temps fait avancer les événements tout seul (échéances, quorums).
  useEffect(() => {
    let changed = []
    mutate(db => { changed = sweep(db.socialEvents || [], Date.now()) })
    changed.forEach(({ ev, to }) => {
      if (to === 'echoue') {
        notify({ to: ev.by, kind: 'info', actor: 'Espaces', title: 'Activité annulée', body: `« ${ev.title} » n'a pas réuni ${ev.minParticipants} participants. Personne n'a été débité.`, link: '/app/social' })
        ;(ev.participants || []).forEach(p => p.userId !== ev.by && notify({ to: p.userId, kind: 'info', actor: 'Espaces', title: 'Activité annulée', body: `« ${ev.title} » est annulée faute de participants. Vous n'avez rien à payer.`, link: '/app/social' }))
      }
      if (to === 'soumis') notify({ role: 'admin', kind: 'request', actor: 'Espaces', title: 'Activité à instruire', body: `« ${ev.title} » a atteint son quorum : vérifiez le lieu et la sécurité, puis visez.`, link: '/app/social' })
    })
    if (changed.length) force()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const d = db()
  const events = [...(d.socialEvents || [])]
    .filter(e => seesAll || (e.space || 'parent') === mySpace)
    .sort((a, b) => a.date.localeCompare(b.date))
  const live = events.filter(e => isLive(e.status))
  const toDecide = events.filter(e => canDecide(e, u))
  const pendingAll = events.filter(e => isPending(e.status))
  const settled = events.filter(e => e.status === 'approuve' || e.status === 'termine')
  const closed = events.filter(e => isDead(e.status))
  const myEvents = events.filter(e => hasJoined(e, u.id))
  const ordered = [...live, ...pendingAll, ...settled, ...closed]
    .filter(e => spaceFilter === 'tous' || (e.space || 'parent') === spaceFilter)

  const minDate = earliestDate(appNow())

  /* ── Proposer ── */
  const propose = () => {
    if (!f.title.trim()) return setErr('Donnez un titre à votre activité.')
    if (!f.date) return setErr('Choisissez une date.')
    if (f.date < minDate) return setErr(`La date doit être au moins ${MIN_LEAD_DAYS} jours après aujourd'hui : l'école doit réserver le lieu.`)
    if (needsReason(f.audience) && !f.reason.trim()) return setErr("Indiquez pourquoi l'activité n'est pas mixte.")
    const min = Number(f.minParticipants) || DEFAULT_MIN
    const max = f.maxParticipants ? Number(f.maxParticipants) : null
    if (max && max < min) return setErr('La capacité ne peut pas être inférieure au quorum.')
    const price = Math.max(0, Number(f.pricePerPerson) || 0)
    if (price > 0 && !f.priceCovers.trim()) return setErr("Dites ce que le prix couvre · les participants doivent le savoir avant de s'inscrire.")

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
    SPACES[mySpace].roles.forEach(r => notify({ role: r, kind: 'notice', actor: u.name, title: `Nouvelle activité · ${SPACES[mySpace].label}`, body: `${ev.title} · ${fmtShort(ev.date)}${price ? ` · ${money(price)}/pers.` : ' · gratuit'}`, link: '/app/social' }))
    setOpen(false); setF(BLANK(mySpace)); setErr(''); force()
  }

  /* ── S'inscrire / se désister / annuler ── */
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
    if (ev.by !== u.id) notify({ to: ev.by, kind: 'info', actor: u.name, title: 'Nouvelle inscription', body: `${u.name} ${rsvp === 'oui' ? 'participe à' : 'hésite pour'} « ${ev.title} »`, link: '/app/social' })
    setJoin(null); force()
  }

  const withdraw = ev => {
    const late = isLateWithdrawal(ev)
    confirmAsk({
      title: 'Se désister',
      message: late
        ? `« ${ev.title} » a lieu dans moins de 48 h : votre désistement est tardif · pensez à prévenir l'organisateur.`
        : `Vous ne participerez plus à « ${ev.title} ».`,
      cancelLabel: 'Rester inscrit', confirmLabel: 'Me désister',
      onConfirm: () => {
        let promoted = []
        mutate(db => {
          const e = db.socialEvents.find(x => x.id === ev.id)
          e.participants = e.participants.filter(p => p.userId !== u.id)
          promoted = promoteFromWaitlist(e)
          sweep([e])
        })
        promoted.forEach(p => notify({ to: p.userId, kind: 'info', actor: 'Espaces', title: "Une place s'est libérée", body: `Vous participez maintenant à « ${ev.title} ».`, link: '/app/social' }))
        force()
      },
    })
  }

  const cancelOwn = ev => {
    confirmAsk({
      title: "Annuler l'activité",
      message: `« ${ev.title} » sera annulée et les inscrits prévenus. Personne ne paie.`,
      cancelLabel: 'Garder', confirmLabel: "Annuler l'activité",
      onConfirm: () => {
        mutate(db => { const e = db.socialEvents.find(x => x.id === ev.id); e.status = 'annule' })
        ;(ev.participants || []).forEach(p => p.userId !== u.id && notify({ to: p.userId, kind: 'info', actor: ev.byName, title: 'Activité annulée', body: `« ${ev.title} » a été annulée par l'organisateur. Vous n'avez rien à payer.`, link: '/app/social' }))
        force()
      },
    })
  }

  /* ── Décision : Administration, puis Direction ── */
  const settle = (ev, approved, note, setSheetErr) => {
    const fresh = db().socialEvents.find(x => x.id === ev.id)
    if (!fresh || !canDecide(fresh, u)) { setDecide(null); return }
    if (!approved && !note.trim()) return setSheetErr('Indiquez le motif du refus : les participants le liront.')

    const isFinal = fresh.status === 'vise'
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
      notify({ role: 'schooladmin', kind: 'request', actor: u.name, title: 'Activité visée · décision attendue', body: `« ${ev.title} » a été visée par l'Administration. Votre approbation finale est requise.`, link: '/app/social' })
      notify({ to: ev.by, kind: 'info', actor: roleLabel, title: 'Votre activité avance', body: `« ${ev.title} » est visée par l'Administration ; la Direction doit encore l'approuver.`, link: '/app/social' })
      setDecide(null); return force()
    }

    if (next === 'approuve') {
      // L'activité entre au calendrier de l'école…
      mutate(db => {
        db.events.push({ id: uid('e'), date: ev.date, time: ev.time, title: ev.title, type: 'Événement', desc: `Activité proposée par ${ev.byName} (${SPACES[ev.space || 'parent'].label}).`, place: ev.place, audience: 'all', by: u.name })
      })
      // …et l'agent de sécurité est prévenu s'il doit couvrir la soirée.
      const reasons = securityNeeds(ev)
      if (reasons.length) {
        notify({ role: 'security', kind: 'notice', actor: 'Direction', title: 'Événement à couvrir', body: `« ${ev.title} » · ${fmtLong(ev.date)} à ${ev.time} · ${ev.place}. ${reasons[0]}`, link: '/app/security' })
        const notice = securityNotice({ ...ev, securityNotifiedAt: Date.now() })
        if (notice.short) notify({ role: 'schooladmin', kind: 'info', actor: 'Sécurité', title: 'Préavis court pour la sécurité', body: `« ${ev.title} » : l'agent est prévenu ${notice.hours} h avant (minimum ${SECURITY_NOTICE_H} h).`, link: '/app/security' })
      }
    }

    ;(ev.participants || []).forEach(p => notify({
      to: p.userId, kind: approved ? 'notice' : 'info', actor: roleLabel,
      title: approved ? 'Activité confirmée' : 'Activité refusée',
      body: approved
        ? `« ${ev.title} » est confirmée · ${ev.place} · ${fmtLong(ev.date)}${ev.pricePerPerson ? ` · ${money(amountFor(ev, p.adults, p.children))} à régler auprès de l'administration` : ' · gratuit'}`
        : `« ${ev.title} » n'a pas été retenue : ${note.trim()} Vous n'avez rien à payer.`,
      link: '/app/social',
    }))
    setDecide(null); force()
  }

  // Seule l'administration marque un participant comme ayant payé.
  const markPaid = (ev, userId) => {
    if (!isDirection) return
    mutate(db => { const e = db.socialEvents.find(x => x.id === ev.id); const p = e.participants.find(x => x.userId === userId); if (p) p.paid = !p.paid })
    force()
  }

  const joinEv = join && events.find(e => e.id === join)
  const decideEv = decide && events.find(e => e.id === decide)

  return (
    <Screen title={seesAll ? 'Espaces & activités' : SPACES[mySpace].label}
      sub={seesAll ? "Les activités des parents, des enseignants et du personnel · l'Administration instruit, la Direction approuve." : SPACES[mySpace].sub}
      right={canPropose ? <Btn small icon="Plus" label="Proposer" color={accent} onPress={() => { setF(BLANK(mySpace)); setErr(''); setOpen(true) }} /> : null}>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Tile icon="Sparkles" color={accent} label="Activités ouvertes" sub="inscriptions en cours" value={String(live.length)} />
        <Tile icon="Hourglass" color={WARN} label={seesAll ? 'En cours de validation' : "En attente de l'école"} value={String(pendingAll.length)} />
        <Tile icon="Check" color={OK} label="Confirmées" value={String(settled.length)} />
        {seesAll
          ? <Tile icon="Users" color="#7C5CD6" label="Propositions au total" value={String(events.length)} />
          : <Tile icon="UserCheck" color="#7C5CD6" label="Mes participations" value={String(myEvents.length)} />}
      </View>

      {/* File d'attente : ce qui attend MA décision, à mon étage de la chaîne. */}
      {toDecide.length > 0 && (
        <Section title={u.role === 'admin' ? 'Activités à instruire' : 'Activités à approuver'}>
          <Card>
            <Text style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
              {u.role === 'admin' ? 'Quorum atteint : vérifiez le lieu, la sécurité, puis visez pour la Direction.' : "Visées par l'Administration · votre approbation est finale."}
            </Text>
            {toDecide.map(ev => (
              <Row key={ev.id} avatar={<Text style={{ fontSize: 24 }}>{catOf(ev.cat).icon}</Text>}
                title={ev.title}
                sub={`${fmtShort(ev.date)} · ${ev.time} · ${ev.place} · par ${ev.byName}${facilityClash(ev, d.events) ? ' · lieu déjà pris ce jour-là' : ''}`}
                right={<Btn small label="Examiner" color={accent} onPress={() => setDecide(ev.id)} />} />
            ))}
          </Card>
        </Section>
      )}

      {seesAll && events.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 18 }}>
          <Chip label="Tous les espaces" color={accent} active={spaceFilter === 'tous'} onPress={() => setSpaceFilter('tous')} />
          {Object.values(SPACES).map(s => (
            <Chip key={s.key} label={s.label} color={SPACE_TINT[s.key]} active={spaceFilter === s.key} onPress={() => setSpaceFilter(s.key)} />
          ))}
        </ScrollView>
      )}

      <View style={{ marginTop: 16 }}>
        {ordered.length === 0
          ? <Card>
              <EmptyState icon="Sparkles" title="Aucune activité pour l'instant"
                sub={seesAll ? "Personne n'a encore rien proposé, dans aucun espace."
                  : canPropose ? 'Proposez la première : les autres vous rejoindront.'
                  : "Rien n'a encore été proposé dans cet espace."} />
              {canPropose && <Btn icon="Plus" label="Proposer une activité" color={accent} onPress={() => { setF(BLANK(mySpace)); setErr(''); setOpen(true) }} />}
            </Card>
          : ordered.map(ev => (
              <EventCard key={ev.id} ev={ev} u={u} isDirection={isDirection} seesAll={seesAll}
                onJoin={() => setJoin(ev.id)} onWithdraw={() => withdraw(ev)} onCancel={() => cancelOwn(ev)}
                onDecide={() => setDecide(ev.id)} onMarkPaid={markPaid} />
            ))}
      </View>

      {open && <ProposeSheet f={f} setF={setF} space={mySpace} minDate={minDate} err={err} accent={accent}
        onSubmit={propose} onClose={() => { setOpen(false); setErr('') }} />}
      {joinEv && <JoinSheet ev={joinEv} u={u} accent={accent} onClose={() => setJoin(null)} onConfirm={confirmJoin} />}
      {decideEv && <DecideSheet ev={decideEv} clash={facilityClash(decideEv, d.events)} role={u.role} accent={accent}
        onClose={() => setDecide(null)} onSettle={settle} />}
    </Screen>
  )
}
