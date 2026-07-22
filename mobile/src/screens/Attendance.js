// L'appel (« roll call »), version téléphone — port fidèle de app/src/pages/Attendance.jsx.
// Enseignant / surveillant : une liste d'élèves, un tap par élève pour cycler
// présent → absent → retard, un bouton Enregistrer. Direction / administration :
// vue école en lecture (taux, absents du jour, classes), un tap pour prévenir un parent.
// La feuille est écrite EXACTEMENT comme au web : db.attendance[classId_date] = {sid:statut}.
import { useMemo, useState, useEffect, useReducer } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { db, mutate, studentById, classById , attParts } from '@core/db.js'
import { notify } from '@core/notify.js'
import { teacherSchedule, currentClass } from '@core/data.js'
import { todayIso, isoOf, frDateLabel } from '@core/clock.js'
import { schoolPhase } from '@core/livestatus.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Section, Btn, Badge, Avatar, Tile, Bar, EmptyState, C } from '../components.js'

const CYCLE = { present: 'absent', absent: 'late', late: 'present' }
const COL = { present: '#12946F', absent: '#DC4B54', late: '#C97C1E' }   // STATUS ok/danger/warn du web
const FR = { present: 'Présent', absent: 'Absent', late: 'Retard' }
const dOf = iso => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d) }

// Un appel déjà enregistré ne connaît pas les élèves inscrits depuis. On complète
// leur marque à « présent » : sans cela ils restaient sur undefined, incliquables
// (CYCLE[undefined] === undefined) et faisaient basculer les compteurs à NaN.
function hydrateMarks(saved, students) {
  const base = Object.fromEntries(students.map(s => [s.id, 'present']))
  if (!saved) return base
  for (const s of students) if (saved[s.id]) base[s.id] = saved[s.id]
  return base
}

export default function Attendance({ user, params, nav }) {
  // Même règle d'accès que le web : direction & administration voient l'école,
  // enseignant & surveillant font l'appel.
  if (['schooladmin', 'admin'].includes(user.role)) return <SchoolView user={user} />
  return <MarkView user={user} />
}

/* ── Enseignant / Surveillant : faire l'appel ───────────────────────────── */
function MarkView({ user }) {
  const accent = (ROLE[user.role] || ROLE.teacher).color
  const schedule = useMemo(() => teacherSchedule(), [])
  const live = useMemo(() => currentClass(), [])
  const [, force] = useReducer(x => x + 1, 0)
  // La séance en cours si elle existe, sinon la première du planning — et
  // l'enseignant peut toujours changer de classe.
  const [slotIdx, setSlotIdx] = useState(() => {
    const i = live ? schedule.findIndex(s => s.classId === live.slot.classId && s.start === live.slot.start) : -1
    return i >= 0 ? i : 0
  })
  const cls = schedule[slotIdx]
  const today = todayIso(); const key = cls.classId + '_' + today
  const [marks, setMarks] = useState(() => hydrateMarks(db().attendance[key], cls.students))
  const [saving, setSaving] = useState(false)
  const [okMsg, setOkMsg] = useState('')
  // Changer de classe recharge la feuille d'appel correspondante.
  useEffect(() => { setMarks(hydrateMarks(db().attendance[key], cls.students)); setOkMsg('') }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const counts = cls.students.reduce((a, s) => { const v = marks[s.id]; if (a[v] != null) a[v]++; return a }, { present: 0, absent: 0, late: 0 })
  const history = Object.keys(db().attendance || {}).filter(k => k.startsWith(cls.classId + '_')).map(k => {
    const m = db().attendance[k]; const c = { present: 0, absent: 0, late: 0 }; Object.values(m).forEach(v => c[v] != null && c[v]++)
    return { date: k.split('_').slice(1).join('_'), ...c }
  }).sort((a, b) => b.date.localeCompare(a.date))

  const save = () => {
    if (saving) return                                  // pas de double-enregistrement
    setSaving(true)
    mutate(db => { db.attendance[key] = marks })
    const flagged = cls.students.filter(s => marks[s.id] !== 'present')
    notify({ role: 'admin', kind: 'info', title: `Appel · ${cls.cls.name}`, body: `${counts.present} présents · ${counts.absent} absents · ${counts.late} retards (${cls.subject})`, link: '/app/attendance' })
    notify({ role: 'schooladmin', kind: 'info', title: `Appel · ${cls.cls.name}`, body: `${counts.absent} absent(s), ${counts.late} retard(s)`, link: '/app/attendance' })
    flagged.forEach(s => { if (s.parentId) notify({ to: s.parentId, kind: 'info', title: `Présence de ${s.name.split(' ')[0]}`, body: `${s.name} a été marqué(e) ${FR[marks[s.id]].toLowerCase()} aujourd'hui (${cls.subject}).`, link: '/app' }) })
    setOkMsg('Appel enregistré · direction et parents notifiés')
    setTimeout(() => setOkMsg(''), 5000)
    force(); setTimeout(() => setSaving(false), 600)
  }

  if (schoolPhase() === 'vacances') return (
    <Screen title="Appel / Présence" sub="Pas d'appel pendant les vacances d'été.">
      <EmptyState icon="Sun" title="L'appel du matin est en pause"
        sub="Les élèves sont en vacances · la feuille d'appel se rouvrira le jour de la rentrée." />
    </Screen>
  )

  return (
    <Screen title="Appel / Présence" sub={`${cls.cls.name} · ${cls.subject} · ${today}`}>
      {/* Choix de la séance */}
      <Card style={{ padding: 12, marginBottom: 14 }}>
        <Text style={{ color: C.muted, fontWeight: '700', fontSize: 11, marginBottom: 8, paddingHorizontal: 2 }}>Séance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {schedule.map((s, i) => (
              <Pressable key={`${s.classId}-${s.start}`} onPress={() => setSlotIdx(i)} style={{
                flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 13,
                backgroundColor: i === slotIdx ? accent : '#fff',
                borderWidth: 1, borderColor: i === slotIdx ? accent : C.line,
              }}>
                <Text style={{ color: i === slotIdx ? '#fff' : C.ink, fontWeight: '700', fontSize: 13 }}>
                  {s.cls.name} <Text style={{ fontWeight: '400', opacity: 0.75 }}> {s.start}</Text>
                </Text>
                {s.isLive && (
                  <View style={{ backgroundColor: i === slotIdx ? '#ffffff40' : COL.present + '22', borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7 }}>
                    <Text style={{ color: i === slotIdx ? '#fff' : COL.present, fontWeight: '800', fontSize: 10 }}>EN COURS</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Card>

      {/* Compteurs */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        {Object.entries(counts).map(([k, v]) => (
          <Card key={k} style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' }}>
            <Text style={{ color: COL[k], fontWeight: '800', fontSize: 18 }}>{v}</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{FR[k]}</Text>
          </Card>
        ))}
      </View>

      {/* La liste : un tap = changer le statut */}
      <Card style={{ padding: 10 }}>
        {cls.students.length === 0
          ? <EmptyState icon="Users" title="Aucun élève dans cette classe" sub="Ajoutez des élèves depuis la page Élèves." />
          : cls.students.map((s, i) => {
            const st = marks[s.id] || 'present'
            return (
              <Pressable key={s.id} onPress={() => setMarks(m => ({ ...m, [s.id]: CYCLE[m[s.id]] ?? 'absent' }))}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 6,
                  borderBottomWidth: i < cls.students.length - 1 ? 1 : 0, borderBottomColor: C.line,
                  backgroundColor: pressed ? C.canvas : 'transparent', borderRadius: 12,
                })}>
                <Avatar name={s.name} color={COL[st]} size={36} />
                <Text style={{ flex: 1, color: C.ink, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>{s.name}</Text>
                <Badge label={FR[st]} color={COL[st]} />
              </Pressable>
            )
          })}
        <Text style={{ color: C.muted, fontSize: 11, marginTop: 8, paddingHorizontal: 4 }}>
          Touchez un élève pour changer : présent → absent → retard. La direction et les parents concernés sont notifiés à l'enregistrement.
        </Text>
      </Card>

      <View style={{ marginTop: 14 }}>
        <Btn label={saving ? 'Enregistrement…' : "Enregistrer l'appel"} icon="Check" color={accent} onPress={save} disabled={saving} />
        {!!okMsg && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8 }}>
            <Ic n="CheckCheck" size={14} color={COL.present} />
            <Text style={{ color: COL.present, fontWeight: '700', fontSize: 13 }}>{okMsg}</Text>
          </View>
        )}
      </View>

      <Section title={`Appels enregistrés · ${cls.cls.name}`}>
        <Card>
          {history.length ? history.map((h, i) => (
            <View key={h.date} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: i < history.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
              <Text style={{ color: C.muted, fontSize: 13, flex: 1 }}>{h.date}</Text>
              <Text style={{ fontSize: 12 }}>
                <Text style={{ color: COL.present, fontWeight: '800' }}>{h.present}</Text><Text style={{ color: C.muted }}> présents </Text>
                <Text style={{ color: COL.absent, fontWeight: '800' }}>{h.absent}</Text><Text style={{ color: C.muted }}> absents </Text>
                <Text style={{ color: COL.late, fontWeight: '800' }}>{h.late}</Text><Text style={{ color: C.muted }}> retards</Text>
              </Text>
            </View>
          )) : <EmptyState icon="CalendarCheck" title="Aucun appel enregistré" sub="Les appels de cette classe apparaîtront ici après le premier enregistrement." />}
        </Card>
      </Section>
    </Screen>
  )
}

/* ── Direction / Administration : vue école (élèves) ────────────────────── */
function SchoolView({ user }) {
  const d = db()
  const [, force] = useReducer(x => x + 1, 0)
  const [sentMsg, setSentMsg] = useState('')

  // Même agrégation que le web : par jour, puis cumuls 30 jours par élève et par classe.
  const A = useMemo(() => {
    const days = {} // iso → {present,absent,late, absents:[{sid,classId,status}]}
    for (const key in (d.attendance || {})) {
      const { classId, iso } = attParts(key)
      const day = days[iso] = days[iso] || { present: 0, absent: 0, late: 0, absents: [] }
      for (const [sid, st] of Object.entries(d.attendance[key])) {
        day[st] != null && day[st]++
        if (st !== 'present') day.absents.push({ sid, classId, status: st })
      }
    }
    const dates = Object.keys(days).sort()
    const latest = dates[dates.length - 1]
    const cutoff = isoOf(new Date(Date.now() - 30 * 86400000))
    const perStudent = {}, perClass = {}
    for (const key in (d.attendance || {})) {
      const { classId, iso } = attParts(key)
      if (iso < cutoff) continue
      const pc = perClass[classId] = perClass[classId] || { present: 0, absent: 0, late: 0 }
      for (const [sid, st] of Object.entries(d.attendance[key])) {
        pc[st] != null && pc[st]++
        const ps = perStudent[sid] = perStudent[sid] || { present: 0, absent: 0, late: 0 }
        ps[st] != null && ps[st]++
      }
    }
    const chronic = Object.entries(perStudent)
      .map(([sid, c]) => ({ s: studentById(sid), ...c, total: c.present + c.absent + c.late }))
      .filter(x => x.s && x.absent >= 4)
      .sort((a, b) => b.absent - a.absent)
    return { days, latest, chronic, perClass }
  }, [d])

  if (!A.latest) return (
    <Screen title="Présence · vue école" sub="Le suivi de présence des élèves.">
      <Card><EmptyState icon="CalendarCheck" title="Aucun appel enregistré" sub="Les appels des enseignants alimenteront cette vue." /></Card>
    </Screen>
  )

  const today = A.days[A.latest]
  const total = today.present + today.absent + today.late
  const rate = total ? Math.round(today.present / total * 100) : 100
  const dayLabel = frDateLabel(dOf(A.latest))

  const notifyParent = (s, body) => {
    const parent = d.users.find(x => x.id === s.parentId)
    if (!parent) { setSentMsg(`${s.name} n'a pas de compte parent lié`); return }
    notify({ to: parent.id, kind: 'info', actor: 'Direction', title: `Présence de ${s.name.split(' ')[0]}`, body })
    setSentMsg(`Parent de ${s.name.split(' ')[0]} prévenu`); force()
  }

  return (
    <Screen title="Présence · vue école" sub="Le suivi de présence des élèves. Un tap sur la cloche prévient le parent.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Tile icon="CalendarCheck" color={COL.present} label="Taux de présence" sub={dayLabel} value={`${rate}%`} />
        <Tile icon="UserX" color={COL.absent} label="Absents" value={String(today.absent)} />
        <Tile icon="Clock" color={COL.late} label="Retards" value={String(today.late)} />
        <Tile icon="TriangleAlert" color="#8B5CF6" label="Absences répétées" sub="≥ 4 sur 30 j" value={String(A.chronic.length)} />
      </View>
      {!!sentMsg && <Text style={{ color: COL.present, fontWeight: '700', fontSize: 13, marginTop: 10 }}>{sentMsg}</Text>}

      <Section title={`Absents & retards · ${dayLabel}`}>
        <Card style={{ padding: 10 }}>
          {today.absents.length === 0
            ? <EmptyState icon="Check" title="Personne ne manque" sub="Tous les élèves sont présents." />
            : today.absents.map(({ sid, classId, status }, i) => {
              const s = studentById(sid); if (!s) return null
              return (
                <View key={sid} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: i < today.absents.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
                  <Avatar name={s.name} color={COL[status]} size={32} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{s.name}</Text>
                    <Text style={{ color: C.muted, fontSize: 11 }}>{classById(classId)?.name}</Text>
                  </View>
                  <Badge label={FR[status]} color={COL[status]} />
                  <Pressable onPress={() => notifyParent(s, `${s.name} a été marqué(e) ${FR[status].toLowerCase()} le ${dayLabel}.`)}
                    style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.canvas }}>
                    <Ic n="BellRing" size={15} color={C.muted} />
                  </Pressable>
                </View>
              )
            })}
        </Card>
      </Section>

      <Section title="Absences répétées · 30 derniers jours">
        <Card style={{ padding: 10 }}>
          {A.chronic.length === 0
            ? <EmptyState icon="Check" title="Aucun absentéisme répété" sub="Aucun élève n'a manqué 4 jours ou plus ce mois-ci." />
            : A.chronic.map((x, i) => (
              <View key={x.s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: i < A.chronic.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
                <Avatar name={x.s.name} color={COL.absent} size={32} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{x.s.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>{classById(x.s.classId)?.name} · {x.absent} absences · {x.late} retards</Text>
                </View>
                <Text style={{ color: COL.absent, fontWeight: '800', fontSize: 13 }}>{x.total ? Math.round(x.absent / x.total * 100) : 0}%</Text>
                <Btn label="Parent" icon="BellRing" color={(ROLE[user.role] || ROLE.admin).color} kind="outline" small
                  onPress={() => notifyParent(x.s, `${x.s.name} cumule ${x.absent} absences sur les 30 derniers jours. Merci de contacter la direction.`)} />
              </View>
            ))}
        </Card>
      </Section>

      <Section title="Présence par classe · 30 derniers jours">
        <Card>
          {Object.entries(A.perClass).map(([cid, c], i) => {
            const t = c.present + c.absent + c.late; const r = t ? Math.round(c.present / t * 100) : 100
            const col = r >= 95 ? COL.present : r >= 90 ? COL.late : COL.absent
            return (
              <View key={cid} style={{ marginBottom: i < Object.keys(A.perClass).length - 1 ? 12 : 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13, flex: 1 }}>{classById(cid)?.name || cid}</Text>
                  <Text style={{ color: col, fontWeight: '800', fontSize: 13 }}>{r}%</Text>
                  <Text style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>{c.absent} abs · {c.late} ret</Text>
                </View>
                <Bar pct={r} color={col} />
              </View>
            )
          })}
        </Card>
      </Section>
    </Screen>
  )
}
