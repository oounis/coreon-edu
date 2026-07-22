// « Mes paiements » — portage natif de app/src/pages/Payments.jsx.
//
// RÈGLE COPIÉE DU WEB : un parent NE PEUT PAS marquer ses frais comme payés.
// Il SIGNALE son versement (statut → « À confirmer ») et seule l'administration
// le confirme après encaissement (Finance.jsx). Aucun chemin ici ne pose 'paid'.
import { useReducer, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { db, mutate, studentById, settings } from '@core/db.js'
import { notify } from '@core/notify.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Chip, Avatar, Btn, EmptyState, C } from '../components.js'

// Même palette de statuts que le web (ui.jsx STATUS → Payments.jsx COL)
const COL = { paid: '#12946F', pending: '#C97C1E', overdue: '#DC4B54', due: '#94A3B8' }
const FR = { paid: 'Payé', pending: 'À confirmer', overdue: 'En retard', due: 'Impayé' }
const INFO = '#0E7FB8', INFO_SOFT = '#E6F1F8', INFO_INK = '#0B5E86'

export default function Payments({ user, params, nav }) {
  const [, force] = useReducer(x => x + 1, 0)
  // un parent de plusieurs enfants choisit lequel il consulte (même logique que le web)
  const kids = (user.childIds || []).map(studentById).filter(Boolean)
  const [kidId, setKidId] = useState(kids[0]?.id)
  const child = kids.find(k => k.id === kidId) || kids[0]
  const months = (child && db().payments[child.id]) || []
  const paid = months.filter(m => m.status === 'paid').length
  const declarable = months.filter(m => m.status === 'due' || m.status === 'overdue')
  const awaiting = months.filter(m => m.status === 'pending').length
  const counts = { paid: 0, pending: 0, overdue: 0, due: 0 }
  months.forEach(m => { counts[m.status] = (counts[m.status] || 0) + 1 })
  const accent = ROLE.parent.color

  const tellAdmins = body => {
    notify({ role: 'admin', kind: 'payment', actor: user.name, title: 'Paiement signalé', body, link: '/app/finance' })
    notify({ role: 'schooladmin', kind: 'payment', actor: user.name, title: 'Paiement signalé', body, link: '/app/finance' })
  }

  const declare = i => {
    const m = months[i]
    if (m.status === 'paid' || m.status === 'pending') return
    mutate(db => { db.payments[child.id][i].status = 'pending' })
    tellAdmins(`${child.name} · ${m.month} · à confirmer`)
    force()
  }

  const declareAll = () => {
    if (declarable.length === 0) return
    mutate(db => { db.payments[child.id].forEach(m => { if (m.status === 'due' || m.status === 'overdue') m.status = 'pending' }) })
    tellAdmins(`${child.name} · ${declarable.length} mois signalés : à confirmer`)
    force()
  }

  if (!child) return (
    <Screen title="Mes paiements">
      <Card>
        <EmptyState icon="CreditCard" title="Aucun enfant associé" sub="Demandez à la direction de lier votre compte à votre enfant." />
      </Card>
    </Screen>
  )

  return (
    <Screen title="Mes paiements" sub={`${child.name} · ${paid}/${months.length} mois confirmés`}>
      {kids.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 12 }}>
          {kids.map(k => (
            <Chip key={k.id} label={k.name.split(' ')[0]} color={accent} active={k.id === child.id} onPress={() => setKidId(k.id)} />
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10, backgroundColor: INFO_SOFT, borderRadius: 16, padding: 13, marginBottom: 14 }}>
        <View style={{ marginTop: 1 }}><Ic n="Info" size={16} color={INFO} /></View>
        <Text style={{ flex: 1, color: INFO_INK, fontSize: 13, lineHeight: 18 }}>
          Signalez votre versement ici : l'administration le confirme après encaissement, et le mois passe alors en <Text style={{ fontWeight: '800' }}>Payé</Text>.
          {awaiting > 0 && <Text> Vous avez <Text style={{ fontWeight: '800' }}>{awaiting} mois</Text> en attente de confirmation.</Text>}
        </Text>
      </View>

      {declarable.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Btn label={`Signaler un versement (${declarable.length})`} icon="Send" color={accent} onPress={declareAll} />
        </View>
      )}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <Avatar name={child.name} color={accent} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: C.ink, fontSize: 15 }}>{child.name}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>Frais de scolarité · mensuels · en {settings().currency}</Text>
          </View>
        </View>

        {months.length === 0 && (
          <EmptyState icon="CreditCard" title="Aucune échéance" sub="L'échéancier de paiement apparaîtra ici dès qu'il sera établi." />
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {months.map((m, i) => (
            <View key={m.month} style={{ flexBasis: '30%', flexGrow: 1, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 9, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink }}>{m.month}</Text>
              <View style={{ alignSelf: 'stretch', height: 6, borderRadius: 3, marginTop: 6, backgroundColor: COL[m.status] }} />
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{FR[m.status]}</Text>
              {m.status === 'paid' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 }}>
                  <Ic n="Check" size={11} color={C.muted} />
                  <Text style={{ fontSize: 11, color: C.muted }}>Confirmé</Text>
                </View>
              ) : m.status === 'pending' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 }}>
                  <Ic n="Hourglass" size={11} color={COL.pending} />
                  <Text style={{ fontSize: 11, color: COL.pending, fontWeight: '700' }}>En attente</Text>
                </View>
              ) : (
                <Pressable onPress={() => declare(i)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6, opacity: pressed ? 0.6 : 1 })}>
                  <Ic n="Send" size={11} color={accent} />
                  <Text style={{ fontSize: 11, color: accent, fontWeight: '800' }}>Signaler</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </Card>

      {months.length > 0 && (
        <Card style={{ marginTop: 14 }}>
          <Text style={{ fontWeight: '800', color: C.ink, marginBottom: 10 }}>Récapitulatif</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {Object.keys(COL).map(k => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: COL[k] }} />
                <Text style={{ fontSize: 12, color: C.muted }}>
                  {FR[k]} · <Text style={{ fontWeight: '800', color: C.ink }}>{counts[k]}</Text>
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}
    </Screen>
  )
}
