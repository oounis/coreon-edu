// « Accidents » — portage natif de app/src/pages/Accidents.jsx, côté PARENT.
// Le parent lit la déclaration envoyée par l'école et CONFIRME l'avoir lue —
// le maillon final de la chaîne à deux regards. La déclaration se rédige sur
// le web (schéma corporel) ; la signature du parent, elle, tient dans la poche.
import { useReducer } from 'react'
import { View, Text } from 'react-native'
import { studentById } from '@core/db.js'
import { accidents, forChild, acknowledge, STAGES, SEVERITY, INJURY_KINDS } from '@core/accidents.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Badge, Btn, EmptyState, C, tap } from '../components.js'

const TONE = { ok: '#12946F', warn: '#C97C1E', danger: '#DC4B54', info: '#0E7FB8', neutral: '#7C879B' }
const when = at => new Date(at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export default function Accidents({ user }) {
  const [, force] = useReducer(x => x + 1, 0)
  const isParent = user.role === 'parent'
  const list = isParent
    ? (user.childIds || []).flatMap(forChild).filter(a => ['envoye', 'accuse'].includes(a.stage))
    : accidents()
  const sorted = [...list].sort((a, b) => (b.at || 0) - (a.at || 0))

  const sign = a => {
    tap()
    const r = acknowledge(a.id, user.name)
    if (!r?.error) force()
  }

  return (
    <Screen title="Accidents" sub={isParent ? "Ce que l'école vous a déclaré · et votre confirmation de lecture." : 'La déclaration se rédige sur le web (schéma corporel).'}>
      {sorted.length === 0 && (
        <Card><EmptyState icon="HeartPulse" title={isParent ? 'Rien à signaler' : 'Aucun accident déclaré'}
          sub={isParent ? "Si l'école vous déclare un incident, il apparaîtra ici." : 'Les déclarations apparaîtront ici.'} /></Card>
      )}
      {sorted.map(a => {
        const s = studentById(a.childId)
        const st = STAGES[a.stage] || STAGES.brouillon
        const sev = SEVERITY[a.severity]
        return (
          <Card key={a.id} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontWeight: '800', color: C.ink, fontSize: 15, flex: 1 }}>{s?.name || 'Enfant'}</Text>
              {sev && <Badge label={sev.label} color={TONE[sev.tone]} />}
              <Badge label={st.label} color={TONE[st.tone]} />
            </View>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>
              {when(a.at)} · {INJURY_KINDS[a.kind]?.label || a.kind} · déclaré par {a.byName}
            </Text>
            {!!a.whatHappened && <Text style={{ color: C.ink, fontSize: 14, lineHeight: 20, marginBottom: 10 }}>{a.whatHappened}</Text>}

            {isParent && a.stage === 'envoye' && (
              <View style={{ backgroundColor: '#FBF1E3', borderRadius: 12, padding: 12 }}>
                <Text style={{ color: C.ink, fontSize: 13, marginBottom: 10 }}>
                  <Text style={{ fontWeight: '800' }}>Merci de confirmer que vous avez lu cette déclaration.</Text> C'est ce qui permet à l'école de savoir que vous êtes au courant.
                </Text>
                <Btn label="J'ai lu et je confirme" icon="Check" color={ROLE.parent.color} onPress={() => sign(a)} />
              </View>
            )}
            {a.stage === 'accuse' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ic n="Check" size={14} color={TONE.ok} />
                <Text style={{ color: TONE.ok, fontSize: 12, fontWeight: '700' }}>Lecture confirmée{a.ack?.by ? ` par ${a.ack.by}` : ''}</Text>
              </View>
            )}
          </Card>)
      })}
    </Screen>
  )
}
