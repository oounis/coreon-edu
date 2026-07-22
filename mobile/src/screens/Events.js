// Calendrier & événements — portage natif de app/src/pages/Events.jsx.
// Mois compact, jour sélectionné, liste « à venir », ajout par la Direction,
// les enseignants et les surveillants. Un membre ne supprime que SES événements ;
// la Direction peut tout supprimer (même règle que le web).
import { useMemo, useReducer, useState } from 'react'
import { View, Text, Pressable, ScrollView, Modal } from 'react-native'
import { db, mutate, uid } from '@core/db.js'
import { notify } from '@core/notify.js'
import { ROLE } from '@core/theme.js'
import { todayIso, frDateLabel } from '@core/clock.js'
import { Ic } from '../icons.js'
import { Screen, Card, Section, Chip, Btn, Input, EmptyState, C, confirmAsk } from '../components.js'

const TYPES = [
  { k: 'Événement', c: '#7539E4' }, { k: 'Réunion', c: '#0E7FB8' }, { k: 'Examen', c: '#DC4B54' },
  { k: 'Vacances', c: '#12946F' }, { k: 'Sortie', c: '#C97C1E' },
]
const tint = t => (TYPES.find(x => x.k === t) || TYPES[0]).c
const AUD = { all: 'Toute l’école', parent: 'Parents', teacher: 'Enseignants', supervisor: 'Surveillants' }
const DANGER = '#DC4B54'

// Français sans date-fns (interdit côté natif).
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const M3 = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const pad = n => String(n).padStart(2, '0')
const dOf = iso => new Date(iso + 'T00:00:00')
const fmtLong = iso => frDateLabel(dOf(iso))
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

const emptyForm = () => ({ title: '', type: 'Événement', time: '', place: '', audience: 'all', desc: '' })

export default function Events({ user, params, nav }) {
  const u = user
  const [, force] = useReducer(x => x + 1, 0)
  const accent = (ROLE[u.role] || ROLE.admin).color
  const canAdd = ['owner', 'schooladmin', 'admin', 'teacher', 'supervisor'].includes(u.role)
  const isDirection = ['owner', 'schooladmin', 'admin'].includes(u.role)
  const canDelete = e => isDirection || e.by === u.name

  const today = todayIso()
  const [cur, setCur] = useState(() => { const t = dOf(today); return { y: t.getFullYear(), m: t.getMonth() } })
  const [sel, setSel] = useState(today)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(emptyForm())
  const [err, setErr] = useState('')

  const events = db().events
  const byDay = useMemo(() => { const m = {}; events.forEach(e => { (m[e.date] = m[e.date] || []).push(e) }); return m }, [events])

  // Grille du mois, semaine commençant le lundi — sans date-fns.
  const cells = useMemo(() => {
    const first = new Date(cur.y, cur.m, 1)
    const offset = (first.getDay() + 6) % 7
    const dim = new Date(cur.y, cur.m + 1, 0).getDate()
    const total = Math.ceil((offset + dim) / 7) * 7
    return Array.from({ length: total }, (_, i) => {
      const n = i - offset + 1
      return n >= 1 && n <= dim ? `${cur.y}-${pad(cur.m + 1)}-${pad(n)}` : null
    })
  }, [cur])

  const goMonth = delta => setCur(({ y, m }) => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() } })
  const goToday = () => { const t = dOf(today); setCur({ y: t.getFullYear(), m: t.getMonth() }); setSel(today) }
  const jumpTo = iso => { const d = dOf(iso); setCur({ y: d.getFullYear(), m: d.getMonth() }); setSel(iso) }

  const add = () => {
    if (!f.title.trim()) return setErr('Donnez un titre à l’événement.')
    const ev = { id: uid('e'), date: sel, time: f.time.trim(), title: f.title.trim(), type: f.type, desc: f.desc.trim(), place: f.place.trim(), audience: f.audience, by: u.name }
    mutate(d => { d.events.push(ev) })
    const roles = f.audience === 'all' ? ['parent', 'teacher', 'supervisor'] : [f.audience]
    roles.forEach(r => notify({ role: r, kind: 'notice', actor: u.name, title: 'Nouvel événement · ' + ev.title, body: `${dOf(sel).getDate()} ${M3[dOf(sel).getMonth()]}${ev.time ? ' à ' + ev.time : ''}`, link: '/app/events' }))
    setOpen(false); setF(emptyForm()); setErr(''); force()
  }

  const del = ev => {
    if (!canDelete(ev)) return
    confirmAsk({
      title: 'Supprimer cet événement ?',
      message: `« ${ev.title} » sera retiré du calendrier de l'école. Cette action est définitive.`,
      cancelLabel: 'Annuler', confirmLabel: 'Supprimer',
      onConfirm: () => { mutate(d => { d.events = d.events.filter(e => e.id !== ev.id) }); force() },
    })
  }

  const selList = (byDay[sel] || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const upcoming = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6)

  return (
    <Screen title="Calendrier" sub="Réunions, examens, sorties et vacances : au même endroit."
      right={canAdd ? <Btn small icon="Plus" label="Ajouter" color={accent} onPress={() => { setF(emptyForm()); setErr(''); setOpen(true) }} /> : null}>

      {/* ── Le mois ── */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: C.ink }}>{MOIS[cur.m]} {cur.y}</Text>
          <Pressable onPress={() => goMonth(-1)} hitSlop={8} style={{ padding: 6 }}><Ic n="ChevronLeft" size={20} color={C.ink} /></Pressable>
          <Pressable onPress={goToday} style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
            <Text style={{ fontWeight: '700', fontSize: 13, color: accent }}>Aujourd’hui</Text>
          </Pressable>
          <Pressable onPress={() => goMonth(1)} hitSlop={8} style={{ padding: 6 }}><Ic n="ChevronRight" size={20} color={C.ink} /></Pressable>
        </View>

        <View style={{ flexDirection: 'row' }}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <Text key={i} style={{ flexBasis: `${100 / 7}%`, textAlign: 'center', fontSize: 11, fontWeight: '700', color: C.muted, marginBottom: 4 }}>{d}</Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((iso, i) => {
            if (!iso) return <View key={i} style={{ flexBasis: `${100 / 7}%`, height: 46 }} />
            const evs = byDay[iso] || []
            const active = iso === sel
            const isToday = iso === today
            return (
              <Pressable key={i} onPress={() => setSel(iso)}
                style={{ flexBasis: `${100 / 7}%`, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: active ? accent + '18' : 'transparent', borderWidth: active ? 1.5 : 0, borderColor: accent }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? accent : 'transparent' }}>
                  <Text style={{ fontSize: 13, fontWeight: isToday || active ? '800' : '600', color: isToday ? '#fff' : C.ink }}>{Number(iso.slice(8, 10))}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 3, height: 5, marginTop: 2 }}>
                  {evs.slice(0, 3).map(e => <View key={e.id} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: tint(e.type) }} />)}
                </View>
              </Pressable>
            )
          })}
        </View>
      </Card>

      {/* ── Le jour sélectionné ── */}
      <Section title={cap(fmtLong(sel))}
        right={canAdd ? <Pressable onPress={() => { setF(emptyForm()); setErr(''); setOpen(true) }} hitSlop={8}
          style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: accent + '1A', alignItems: 'center', justifyContent: 'center' }}>
          <Ic n="Plus" size={16} color={accent} /></Pressable> : null}>
        {selList.length === 0
          ? <Card><EmptyState icon="CalendarDays" title="Aucun événement ce jour"
              sub={canAdd ? 'Touchez + pour en ajouter un à cette date.' : 'Sélectionnez un autre jour du calendrier.'} /></Card>
          : selList.map(e => (
            <Card key={e.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 4, borderRadius: 2, backgroundColor: tint(e.type) }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ flex: 1, fontWeight: '800', fontSize: 14, color: C.ink }}>{e.title}</Text>
                    {canDelete(e) && (
                      <Pressable onPress={() => del(e)} hitSlop={8}><Ic n="Trash2" size={16} color={C.muted} /></Pressable>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                    <View style={{ backgroundColor: tint(e.type) + '1A', borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, marginRight: 8, marginBottom: 3 }}>
                      <Text style={{ color: tint(e.type), fontWeight: '800', fontSize: 11 }}>{e.type}</Text>
                    </View>
                    {!!e.time && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginRight: 10 }}>
                      <Ic n="Clock" size={11} color={C.muted} /><Text style={{ fontSize: 12, color: C.muted }}>{e.time}</Text></View>}
                    {!!e.place && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginRight: 10 }}>
                      <Ic n="MapPin" size={11} color={C.muted} /><Text style={{ fontSize: 12, color: C.muted }}>{e.place}</Text></View>}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ic n="Users" size={11} color={C.muted} /><Text style={{ fontSize: 12, color: C.muted }}>{AUD[e.audience] || 'Toute l’école'}</Text></View>
                  </View>
                  {!!e.desc && <Text style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>{e.desc}</Text>}
                </View>
              </View>
            </Card>
          ))}
      </Section>

      {/* ── À venir ── */}
      <Section title="À venir">
        <Card>
          {upcoming.length === 0
            ? <EmptyState icon="CalendarDays" title="Rien de prévu" sub="Les prochains événements apparaîtront ici." />
            : upcoming.map((e, i) => (
              <Pressable key={e.id} onPress={() => jumpTo(e.date)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: i < upcoming.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
                <View style={{ width: 44, alignItems: 'center' }}>
                  <Text style={{ fontSize: 19, fontWeight: '800', color: tint(e.type) }}>{e.date.slice(8, 10)}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: C.muted, textTransform: 'uppercase' }}>{M3[dOf(e.date).getMonth()]}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontWeight: '700', fontSize: 13, color: C.ink }}>{e.title}</Text>
                  <Text style={{ fontSize: 12, color: C.muted }}>{e.type}{e.time ? ' · ' + e.time : ''}{e.place ? ' · ' + e.place : ''}</Text>
                </View>
                <Ic n="ChevronRight" size={15} color={C.muted} />
              </Pressable>
            ))}
        </Card>
      </Section>

      {/* ── Ajouter — l'événement se crée sur le jour sélectionné ── */}
      {open && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={{ flex: 1, backgroundColor: '#0E213566', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '90%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18, paddingBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>Nouvel événement</Text>
                  <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{cap(fmtLong(sel))} · changez de jour depuis le calendrier.</Text>
                </View>
                <Pressable onPress={() => setOpen(false)} hitSlop={12}><Ic n="X" size={20} color={C.muted} /></Pressable>
              </View>
              <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, marginTop: 10, marginBottom: 7 }}>Titre *</Text>
                <Input value={f.title} onChangeText={t => setF({ ...f, title: t })} placeholder="ex. Réunion parents" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, marginTop: 14, marginBottom: 7 }}>Type</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
                  {TYPES.map(t => <Chip key={t.k} label={t.k} color={t.c} active={f.type === t.k} onPress={() => setF({ ...f, type: t.k })} />)}
                </View>
                <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, marginTop: 14, marginBottom: 7 }}>Heure (optionnel)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
                  {['08:00', '09:00', '10:30', '14:00', '16:30', '18:00'].map(t =>
                    <Chip key={t} label={t} color={accent} active={f.time === t} onPress={() => setF({ ...f, time: f.time === t ? '' : t })} />)}
                </View>
                <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, marginTop: 14, marginBottom: 7 }}>Lieu (optionnel)</Text>
                <Input value={f.place} onChangeText={t => setF({ ...f, place: t })} placeholder="ex. Salle des fêtes" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, marginTop: 14, marginBottom: 7 }}>Destinataires</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>
                  {Object.entries(AUD).map(([k, v]) => <Chip key={k} label={v} color={accent} active={f.audience === k} onPress={() => setF({ ...f, audience: k })} />)}
                </View>
                <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, marginTop: 14, marginBottom: 7 }}>Description (optionnel)</Text>
                <Input value={f.desc} onChangeText={t => setF({ ...f, desc: t })} multiline numberOfLines={3}
                  style={{ minHeight: 70, textAlignVertical: 'top' }} placeholder="Détails de l’événement…" />
              </ScrollView>
              <View style={{ padding: 18, paddingTop: 10, paddingBottom: 28, borderTopWidth: 1, borderTopColor: C.line }}>
                {!!err && <Text style={{ color: DANGER, fontWeight: '700', fontSize: 12, marginBottom: 8 }}>{err}</Text>}
                <Btn icon="CalendarDays" label="Ajouter au calendrier" color={accent} disabled={!f.title.trim()} onPress={add} />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  )
}
