// « Journal du jour » — portage natif de app/src/pages/Journal.jsx, côté PARENT.
// Le parent lit la journée de son enfant de crèche/maternelle : humeur, repas,
// siestes, changes, mot de l'éducatrice. La SAISIE reste sur l'ordinateur de la
// classe pour l'instant — on le dit, on ne le cache pas.
import { useState } from 'react'
import { View, Text } from 'react-native'
import { db, studentById, classById } from '@core/db.js'
import { entry, MEALS, ATE, MOODS, DIAPER, napMinutes, isNapping } from '@core/journal.js'
import { todayIso } from '@core/clock.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Chip, Badge, EmptyState, C } from '../components.js'

const TONE = { ok: '#12946F', warn: '#C97C1E', danger: '#DC4B54', info: '#0E7FB8', neutral: '#7C879B' }
const early = s => classById(s.classId)?.cycle === 'Petite enfance'

export default function Journal({ user }) {
  const accent = ROLE[user.role]?.color || '#7539E4'
  const kids = user.role === 'parent'
    ? (user.childIds || []).map(studentById).filter(Boolean).filter(early)
    : (db().students || []).filter(s => !s.archived && early(s)).slice(0, 30)
  const [kidId, setKidId] = useState(kids[0]?.id)
  const child = kids.find(k => k.id === kidId) || kids[0]

  if (!child) return (
    <Screen title="Journal du jour">
      <Card><EmptyState icon="BookOpen" title="Aucun enfant en petite enfance"
        sub="Le journal du jour concerne la crèche et la maternelle." /></Card>
    </Screen>
  )
  const j = entry(child.id, todayIso())
  const mood = MOODS.find(m => m.key === j.mood)
  const nap = napMinutes(j)

  return (
    <Screen title="Journal du jour" sub={`${child.name.split(' ')[0]} · aujourd'hui`}>
      {kids.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 12 }}>
          {kids.map(k => <Chip key={k.id} label={k.name.split(' ')[0]} color={accent} active={k.id === child.id} onPress={() => setKidId(k.id)} />)}
        </View>
      )}

      {user.role !== 'parent' && (
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: C.muted, fontSize: 13 }}>Lecture seule sur mobile : la saisie du journal se fait sur l'ordinateur de la classe.</Text>
        </Card>
      )}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Ic n={mood?.icon || 'Smile'} size={22} color={accent} />
          <Text style={{ fontWeight: '800', color: C.ink, fontSize: 15 }}>
            {mood ? `Humeur : ${mood.label.toLowerCase()}` : 'Humeur non renseignée'}
          </Text>
        </View>

        <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 8 }}>Les repas</Text>
        <View style={{ gap: 8, marginBottom: 14 }}>
          {MEALS.map(m => {
            const ate = ATE.find(a => a.key === j.meals?.[m.key])
            return (
              <View key={m.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ic n={m.icon} size={16} color={C.muted} />
                <Text style={{ flex: 1, color: C.ink, fontSize: 13 }}>{m.label}</Text>
                {ate ? <Badge label={ate.label} color={TONE[ate.tone]} /> : <Text style={{ color: C.muted, fontSize: 12 }}> </Text>}
              </View>)
          })}
        </View>

        <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 8 }}>La sieste</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Ic n="Moon" size={16} color={C.muted} />
          <Text style={{ color: C.ink, fontSize: 13 }}>
            {isNapping(j) ? 'En sieste en ce moment…' : nap > 0 ? `${Math.floor(nap / 60)} h ${String(nap % 60).padStart(2, '0')} de sieste` : 'Pas encore de sieste'}
          </Text>
        </View>

        {(j.diapers || []).length > 0 && (<>
          <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 8 }}>Le change</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {j.diapers.map((d, i) => {
              const k = DIAPER.find(x => x.key === (d.kind || d))
              return <Badge key={i} label={k?.label || String(d.kind || d)} color={TONE[k?.tone || 'info']} />
            })}
          </View>
        </>)}

        {j.note ? (<>
          <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 6 }}>Le mot de l'éducatrice</Text>
          <Text style={{ color: C.ink, fontSize: 14, lineHeight: 20 }}>« {j.note} »</Text>
        </>) : (
          <Text style={{ color: C.muted, fontSize: 13 }}>Pas encore de mot de l'éducatrice aujourd'hui.</Text>
        )}
      </Card>
    </Screen>
  )
}
