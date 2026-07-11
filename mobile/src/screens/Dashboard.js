import { useMemo, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { db, studentById, classById } from '@core/db.js'
import { bulletinFor } from '@core/results.js'
import { unreadFor } from '@core/notify.js'
import { ROLE } from '@core/theme.js'
import { statusAt, nowState, schoolPhase, AREAS, fmt } from '@core/livestatus.js'
import { rentreeLabel } from '@core/clock.js'
import { Ic } from '../icons.js'
import { Screen, Card, Tile, Chip, Bar, C } from '../components.js'

// Le tableau de bord parent du web, pensé téléphone : l'enfant en un coup
// d'œil. Toute la logique vient de core/ — web et mobile affichent toujours
// les mêmes chiffres.
function ParentBody({ u, d, nav }) {
  const kids = (u.childIds || []).map(studentById).filter(Boolean)
  const [pickedId, setPickedId] = useState(kids[0]?.id)
  const child = kids.find(k => k.id === pickedId) || kids[0] || null
  const b = child ? bulletinFor(d, child.id) : null
  const months = (child && d.payments[child.id]) || []
  const paid = months.filter(m => m.status === 'paid').length
  const unread = unreadFor(u)
  const cls = child ? classById(child.classId) : null

  // Bannière « où est mon enfant » — même calcul que le web (Dashboard.jsx).
  const ns = nowState()
  const phase = schoolPhase()
  const preview = phase === 'live' ? ns.nowMin : phase === 'after' ? 900 : phase === 'before' ? 480 : 630
  const live = cls ? statusAt(child.classId, ns.dayIdx, preview, false) : null
  const area = live ? AREAS[live.place] : null
  const pill = phase === 'live' ? `EN DIRECT · ${fmt(preview)}` : phase === 'after' ? 'Journée terminée' : phase === 'before' ? 'Ouvre à 08:00' : phase === 'vacances' ? "Vacances d'été" : 'Week-end'

  if (!child) return <Card><Text style={{ color: C.muted }}>Aucun enfant associé — demandez à la direction de lier votre compte.</Text></Card>

  return (
    <>
      {kids.length > 1 && (
        <View style={{ flexDirection: 'row', marginBottom: 14 }}>
          {kids.map(k => <Chip key={k.id} label={k.name.split(' ')[0]} color={ROLE.parent.color} active={k.id === child.id} onPress={() => setPickedId(k.id)} />)}
        </View>
      )}

      {live && (
        <Pressable onPress={() => nav.navigate('/app/live')} style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 14, backgroundColor: area?.color || '#10162B' }}>
          <View style={{ backgroundColor: '#10162Bcc', padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ic n="Radio" size={12} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>{pill} · SUIVI EN DIRECT</Text>
            </View>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 21, marginTop: 5 }}>
              {phase === 'vacances' ? "Vacances d'été" : live.title}
            </Text>
            <Text style={{ color: '#ffffffcc', fontSize: 13, marginTop: 2 }}>
              {child.name.split(' ')[0]} · {phase === 'vacances' ? `Reprise le ${rentreeLabel()}` : live.sub}
            </Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={{ fontWeight: '800', fontSize: 12, color: C.ink }}>Voir le parcours de la journée</Text>
              <Ic n="ArrowRight" size={13} color={C.ink} />
            </View>
          </View>
        </Pressable>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Tile icon="Star" color="#2BD9A8" label="Moyenne générale" sub={b?.mention?.label}
          value={b?.overall != null ? `${b.overall}/100` : '—'} onPress={() => nav.navigate('~bulletin', { childId: child.id })} />
        <Tile icon="CreditCard" color="#36C5F0" label="Mois payés" value={`${paid}/${months.length}`} onPress={() => nav.navigate('/app/payments')} />
        <Tile icon="CalendarCheck" color="#8B5CF6" label="Présence" value={b?.attRate != null ? `${b.attRate}%` : '—'} />
        <Tile icon="Bell" color="#FFA62B" label="Non lues" value={String(unread)} onPress={() => nav.navigate('/app/notifications')} />
      </View>

      {!!b?.subjects?.length && (
        <Card style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontWeight: '800', color: C.ink, flex: 1 }}>Moyennes par matière</Text>
            <Pressable onPress={() => nav.navigate('~bulletin', { childId: child.id })}><Text style={{ color: ROLE.parent.color, fontWeight: '800', fontSize: 13 }}>Bulletin →</Text></Pressable>
          </View>
          {b.subjects.map(s => (
            <View key={s.subject} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: C.ink, fontSize: 13, fontWeight: '600' }}>{s.subject}</Text>
                <Text style={{ color: ROLE.parent.color, fontSize: 13, fontWeight: '800' }}>{s.avg}/100</Text>
              </View>
              <Bar pct={s.avg} color={ROLE.parent.color} />
            </View>
          ))}
        </Card>
      )}
    </>
  )
}

// Les autres rôles : les chiffres du jour + raccourcis vers leurs onglets.
function StaffBody({ u, d, nav }) {
  const stats = [
    ['Users', '#6366F1', 'Élèves', d.students.length, '/app/students'],
    ['GraduationCap', '#2BD9A8', 'Classes', d.classes.length, null],
    ['ClipboardCheck', '#FFA62B', 'Évaluations', d.evaluations.length, u.role === 'teacher' ? '/app/evaluate' : null],
    ['Megaphone', '#FF6B81', 'Annonces', (d.notices || []).length, '/app/notices'],
  ]
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {stats.map(([icon, color, label, value, to]) => (
        <Tile key={label} icon={icon} color={color} label={label} value={String(value)}
          onPress={to ? () => nav.navigate(to) : undefined} />
      ))}
    </View>
  )
}

export default function Dashboard({ user, nav }) {
  const d = db()
  const r = ROLE[user.role] || ROLE.admin
  const greet = useMemo(() => `Bonjour, ${user.name.split(' ')[0]}`, [user])

  return (
    <Screen title={greet}
      sub={user.role === 'parent' ? "Votre enfant, en un coup d'œil." : `${r.label} · ${d.settings?.schoolName || 'École Al-Nour'}`}
      right={
        <View style={{ alignSelf: 'flex-start', backgroundColor: r.soft, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 }}>
          <Text style={{ color: r.color, fontWeight: '800', fontSize: 12 }}>{r.label}</Text>
        </View>
      }>
      {user.role === 'parent' ? <ParentBody u={user} d={d} nav={nav} /> : <StaffBody u={user} d={d} nav={nav} />}
    </Screen>
  )
}
