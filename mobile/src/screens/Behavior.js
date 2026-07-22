// « Comportement » — portage natif de app/src/pages/Behavior.jsx.
// La règle n°9 tient aussi dans la poche : on OBSERVE, on ne note pas, on ne
// compare personne. Le parent lit le parcours de SON enfant — l'encouragement
// d'abord. La saisie de l'enseignant reste sur le web pour l'instant.
import { useState } from 'react'
import { View, Text } from 'react-native'
import { db, studentById } from '@core/db.js'
import { entriesFor, traitOf } from '@core/behavior.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Chip, Badge, EmptyState, C } from '../components.js'

const TONE = { ok: '#0E7A5C', warn: '#975D16' }
const when = at => new Date(at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export default function Behavior({ user }) {
  const accent = ROLE[user.role]?.color || '#7539E4'
  const isParent = user.role === 'parent'
  const kids = isParent
    ? (user.childIds || []).map(studentById).filter(Boolean)
    : (db().students || []).filter(s => !s.archived).slice(0, 40)
  const [kidId, setKidId] = useState(kids[0]?.id)
  const child = kids.find(k => k.id === kidId) || kids[0]

  if (!child) return (
    <Screen title="Comportement">
      <Card><EmptyState icon="Smile" title="Aucun enfant associé"
        sub="Demandez à la direction de lier votre compte à votre enfant." /></Card>
    </Screen>
  )
  const list = entriesFor(child.id)
  const positives = list.filter(e => traitOf(e.trait)?.positive).length

  return (
    <Screen title={isParent ? 'Comportement de mon enfant' : 'Comportement'}
      sub={`${child.name.split(' ')[0]} · ${positives} encouragement${positives > 1 ? 's' : ''} sur ${list.length} observation${list.length > 1 ? 's' : ''}`}>
      {kids.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 12 }}>
          {kids.map(k => <Chip key={k.id} label={k.name.split(' ')[0]} color={accent} active={k.id === child.id} onPress={() => setKidId(k.id)} />)}
        </View>
      )}

      {!isParent && (
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: C.muted, fontSize: 13 }}>Lecture seule sur mobile : la saisie des observations se fait sur le web.</Text>
        </Card>
      )}

      <Card style={{ marginBottom: 12, backgroundColor: '#F6F3FF' }}>
        <Text style={{ color: '#452083', fontSize: 13, lineHeight: 19 }}>
          <Text style={{ fontWeight: '800' }}>La règle de la maison : </Text>
          on observe pour encourager, jamais pour classer. Aucune note, aucune comparaison entre enfants.
        </Text>
      </Card>

      {list.length === 0 && (
        <Card><EmptyState icon="Smile" title="Aucune observation pour l'instant"
          sub="Les encouragements et repères de l'équipe apparaîtront ici." /></Card>
      )}
      {list.map(e => {
        const t = traitOf(e.trait)
        return (
          <Card key={e.id} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: (TONE[t?.tone] || C.muted) + '1E' }}>
                <Ic n={t?.icon || 'Smile'} size={19} color={TONE[t?.tone] || C.muted} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontWeight: '800', color: C.ink, fontSize: 14 }}>{t?.label || e.trait}</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>{when(e.at)} · {e.byName}</Text>
              </View>
              <Badge label={t?.positive ? 'Encouragement' : 'À accompagner'} color={TONE[t?.tone] || C.muted} />
            </View>
            {!!e.note && <Text style={{ color: C.ink, fontSize: 13, marginTop: 8, lineHeight: 19 }}>« {e.note} »</Text>}
          </Card>)
      })}
    </Screen>
  )
}
