// « Cantine » — portage natif de app/src/pages/Canteen.jsx.
// Le parent lit le menu de la semaine de SON enfant avec ses alertes en clair ;
// l'école voit « à ne pas servir à ». L'édition du menu reste sur le web.
import { useState } from 'react'
import { View, Text } from 'react-native'
import { studentById } from '@core/db.js'
import { DAYS, weekForChild, atRiskForDay, dishesOf, allergenOf } from '@core/canteen.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Chip, Badge, EmptyState, C } from '../components.js'

const WARN = '#C97C1E', OK = '#12946F'

export default function Canteen({ user }) {
  const accent = ROLE[user.role]?.color || '#7539E4'
  if (user.role === 'parent') return <ParentView user={user} accent={accent} />
  return <StaffView accent={accent} />
}

function ParentView({ user, accent }) {
  const kids = (user.childIds || []).map(studentById).filter(Boolean)
  const [kidId, setKidId] = useState(kids[0]?.id)
  const child = kids.find(k => k.id === kidId) || kids[0]
  if (!child) return (
    <Screen title="Cantine"><Card><EmptyState icon="UtensilsCrossed" title="Aucun enfant associé"
      sub="Demandez à la direction de lier votre compte à votre enfant." /></Card></Screen>
  )
  const week = weekForChild(child.id)
  return (
    <Screen title="Cantine" sub={`Le menu de la semaine de ${child.name.split(' ')[0]}.`}>
      {kids.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 12 }}>
          {kids.map(k => <Chip key={k.id} label={k.name.split(' ')[0]} color={accent} active={k.id === child.id} onPress={() => setKidId(k.id)} />)}
        </View>
      )}
      {week.map(day => (
        <Card key={day.key} style={{ marginBottom: 12, borderColor: day.risks.length ? WARN + '66' : C.line, borderWidth: 1 }}>
          <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 8 }}>{day.label}</Text>
          {day.dishes.length === 0
            ? <Text style={{ color: C.muted, fontSize: 13 }}>Menu à venir.</Text>
            : day.dishes.map((dish, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Ic n="UtensilsCrossed" size={13} color={C.muted} />
                <Text style={{ color: C.ink, fontSize: 13 }}>{dish.name}</Text>
              </View>))}
          {day.risks.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, backgroundColor: WARN + '15', borderRadius: 12, padding: 10, marginTop: 8 }}>
              <Ic n="TriangleAlert" size={15} color={WARN} />
              <Text style={{ flex: 1, color: WARN, fontSize: 12, fontWeight: '700' }}>
                Attention : {day.risks.map(r => `${r.label} (${r.dish})`).join(', ')}. L'école le sait.
              </Text>
            </View>)}
        </Card>))}
    </Screen>
  )
}

function StaffView({ accent }) {
  const totalAlerts = DAYS.reduce((n, d) => n + atRiskForDay(d.key).length, 0)
  return (
    <Screen title="Cantine" sub="Le menu se modifie sur le web · l'alerte, elle, vous suit partout.">
      <Card style={{ marginBottom: 12, backgroundColor: (totalAlerts ? WARN : OK) + '12' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ic n={totalAlerts ? 'TriangleAlert' : 'ShieldCheck'} size={20} color={totalAlerts ? WARN : OK} />
          <Text style={{ flex: 1, fontWeight: '800', color: C.ink }}>
            {totalAlerts ? `${totalAlerts} alerte(s) allergie cette semaine` : 'Aucune allergie en conflit cette semaine'}
          </Text>
        </View>
      </Card>
      {DAYS.map(day => {
        const dishes = dishesOf(day.key)
        const risk = atRiskForDay(day.key)
        return (
          <Card key={day.key} style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 8 }}>{day.label}</Text>
            {dishes.length === 0
              ? <Text style={{ color: C.muted, fontSize: 13 }}>Aucun plat prévu.</Text>
              : dishes.map((dish, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <Ic n="UtensilsCrossed" size={13} color={C.muted} />
                  <Text style={{ color: C.ink, fontSize: 13, flex: 1 }}>{dish.name}</Text>
                  {(dish.allergens || []).map(a => <Badge key={a} label={allergenOf(a)?.label || a} color={WARN} />)}
                </View>))}
            {risk.length > 0 && (
              <View style={{ borderTopWidth: 1, borderTopColor: C.line, marginTop: 8, paddingTop: 8 }}>
                <Text style={{ color: WARN, fontWeight: '800', fontSize: 12, marginBottom: 6 }}>À NE PAS SERVIR À</Text>
                {risk.map(r => (
                  <Text key={r.student.id} style={{ color: C.ink, fontSize: 13, marginBottom: 2 }}>
                    <Text style={{ fontWeight: '800' }}>{r.student.name.split(' ')[0]}</Text>
                    <Text style={{ color: C.muted }}> {r.allergens.map(a => a.label).join(', ')}</Text>
                  </Text>))}
              </View>)}
          </Card>)
      })}
    </Screen>
  )
}
