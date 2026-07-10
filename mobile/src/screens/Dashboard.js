import { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { db, studentById, classById } from '@core/db.js'
import { bulletinFor } from '@core/results.js'
import { unreadFor } from '@core/notify.js'
import { logout } from '@core/auth.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { C, S } from '../ui.js'

const Stat = ({ icon, label, value, sub, color }) => (
  <View style={[S.card, { flexBasis: '47%', flexGrow: 1 }]}>
    <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: color + '1A', marginBottom: 8 }}>
      <Ic n={icon} size={18} color={color} />
    </View>
    <Text style={S.value}>{value}</Text>
    <Text style={S.label}>{label}{sub ? ` · ${sub}` : ''}</Text>
  </View>
)

// Le tableau de bord parent du web, réduit à l'essentiel du téléphone :
// l'enfant en un coup d'œil. Toute la logique vient de core/ — rien n'est
// recalculé ici, web et mobile affichent donc toujours les mêmes chiffres.
function ParentBody({ u, d }) {
  const kids = (u.childIds || []).map(studentById).filter(Boolean)
  const [pickedId, setPickedId] = useState(kids[0]?.id)
  const child = kids.find(k => k.id === pickedId) || kids[0] || null
  const b = child ? bulletinFor(d, child.id) : null
  const months = (child && d.payments[child.id]) || []
  const paid = months.filter(m => m.status === 'paid').length
  const unread = unreadFor(u)
  const cls = child ? classById(child.classId) : null

  if (!child) return <View style={S.card}><Text style={S.sub}>Aucun enfant associé — demandez à la direction de lier votre compte.</Text></View>

  return (
    <>
      {kids.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {kids.map(k => (
            <Pressable key={k.id} onPress={() => setPickedId(k.id)}
              style={{ borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: k.id === child.id ? ROLE.parent.color : '#fff', borderWidth: 1, borderColor: C.line }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: k.id === child.id ? '#fff' : C.ink }}>{k.name.split(' ')[0]}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={[S.card, { marginBottom: 14 }]}>
        <Text style={{ fontWeight: '800', color: C.ink, fontSize: 17 }}>{child.name}</Text>
        <Text style={S.sub}>{cls ? cls.name : ''} · {b?.mention?.label || 'Pas encore de note'}</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Stat icon="Star" color="#2BD9A8" label="Moyenne générale" value={b?.overall != null ? `${b.overall}/100` : '—'} />
        <Stat icon="CreditCard" color="#36C5F0" label="Mois payés" value={`${paid}/${months.length}`} />
        <Stat icon="CalendarCheck" color="#8B5CF6" label="Présence" value={b?.attRate != null ? `${b.attRate}%` : '—'} />
        <Stat icon="Bell" color="#FFA62B" label="Non lues" value={String(unread)} />
      </View>

      {!!b?.subjects?.length && (
        <View style={[S.card, { marginTop: 14 }]}>
          <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 10 }}>Moyennes par matière</Text>
          {b.subjects.map(s => (
            <View key={s.subject} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: C.ink, fontSize: 13, fontWeight: '600' }}>{s.subject}</Text>
                <Text style={{ color: ROLE.parent.color, fontSize: 13, fontWeight: '800' }}>{s.avg}/100</Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: C.canvas, marginTop: 4 }}>
                <View style={{ height: 6, borderRadius: 3, width: `${s.avg}%`, backgroundColor: ROLE.parent.color }} />
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  )
}

// Les autres rôles n'ont pour l'instant qu'un aperçu chiffré : leurs écrans
// natifs (Évaluer, Appel, Badgeuse…) arrivent après le tableau de bord parent.
function StaffBody({ d }) {
  const stats = [
    ['Users', '#6366F1', 'Élèves', d.students.length],
    ['GraduationCap', '#2BD9A8', 'Classes', d.classes.length],
    ['ClipboardCheck', '#FFA62B', 'Évaluations', d.evaluations.length],
    ['Bell', '#FF6B81', 'Annonces', (d.notices || []).length],
  ]
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {stats.map(([icon, color, label, value]) => <Stat key={label} icon={icon} color={color} label={label} value={String(value)} />)}
    </View>
  )
}

export default function Dashboard({ user, onLogout }) {
  const d = db()
  const r = ROLE[user.role] || ROLE.admin
  const greet = useMemo(() => `Bonjour, ${user.name.split(' ')[0]}`, [user])

  return (
    <ScrollView style={S.screen} contentContainerStyle={{ padding: 20, paddingTop: 64 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
        <View style={{ flex: 1 }}>
          <Text style={S.h1}>{greet}</Text>
          <Text style={S.sub}>{user.role === 'parent' ? "Votre enfant, en un coup d'œil." : `${r.label} · ${d.settings?.schoolName || 'École Al-Nour'}`}</Text>
        </View>
        <Pressable onPress={() => { logout(); onLogout() }}
          style={{ borderWidth: 1, borderColor: C.line, backgroundColor: '#fff', borderRadius: 999, padding: 10 }}>
          <Ic n="LogOut" size={16} color={C.muted} />
        </Pressable>
      </View>

      <View style={{ alignSelf: 'flex-start', backgroundColor: r.soft, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, marginBottom: 16 }}>
        <Text style={{ color: r.color, fontWeight: '800', fontSize: 12 }}>{r.label}</Text>
      </View>

      {user.role === 'parent' ? <ParentBody u={user} d={d} /> : <StaffBody d={d} />}
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}
