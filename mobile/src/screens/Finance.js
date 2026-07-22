// « Frais & Finances » — port natif de app/src/pages/Finance.jsx.
//
// RÈGLE COPIÉE DU WEB : « À confirmer » n'est PAS de l'argent encaissé. Le
// parent signale son versement (Payments), et SEULE l'administration passe un
// mois en « Payé » ici, après encaissement. Le taux de recouvrement ne compte
// donc que les mois confirmés « Payé ». Un tap sur une case encaisse (→ payé) ;
// retaper un mois payé l'annule (→ impayé) — même cycle que le web.
import { useReducer, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { db, mutate, studentById, classById } from '@core/db.js'
import { notify } from '@core/notify.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Section, Chip, Avatar, Tile, Btn, EmptyState, Bar, C, tap } from '../components.js'

// Même palette de statuts que le web (ui.jsx STATUS) et que Payments.js mobile
const COL = { paid: '#12946F', pending: '#C97C1E', overdue: '#DC4B54', due: '#94A3B8' }
const FR = { paid: 'Payés', pending: 'À confirmer', overdue: 'En retard', due: 'Impayés' }
const NEXT = { due: 'paid', overdue: 'paid', pending: 'paid', paid: 'due' }

export default function Finance({ user, params, nav }) {
  const [, force] = useReducer(x => x + 1, 0)
  const d = db()
  const accent = (ROLE[user.role] || ROLE.admin).color
  const [classId, setClassId] = useState('all')

  const counts = { paid: 0, pending: 0, overdue: 0, due: 0 }
  Object.values(d.payments).forEach(a => a.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1 }))
  const total = counts.paid + counts.pending + counts.overdue + counts.due
  // Recouvrement : SEULS les mois « Payé » comptent — pas les « À confirmer ».
  const rate = total ? Math.round((counts.paid / total) * 100) : 0

  // Prévient le parent quand SON mois change d'état — même message que le web.
  const tellParent = (sid, month, status) => {
    const s = studentById(sid); if (!s?.parentId) return
    const msg = status === 'paid'
      ? { title: 'Paiement confirmé', body: `${month} confirmé pour ${s.name.split(' ')[0]} · merci !` }
      : { title: 'Paiement annulé', body: `${month} est repassé en impayé pour ${s.name.split(' ')[0]}. Contactez l'administration.` }
    notify({ to: s.parentId, kind: 'payment', actor: 'Administration', ...msg, link: '/app/payments' })
  }
  const cycle = (sid, mi) => {
    let month, next
    mutate(db => { const p = db.payments[sid][mi]; month = p.month; next = NEXT[p.status] || 'paid'; p.status = next })
    tellParent(sid, month, next)
    force()
  }

  // Les versements signalés par les parents, en attente d'encaissement.
  const toConfirm = d.students.flatMap(s => (d.payments[s.id] || [])
    .map((p, mi) => p.status === 'pending' ? { s, p, mi } : null).filter(Boolean))
  const confirmAll = () => {
    if (!toConfirm.length) return
    toConfirm.forEach(({ s, mi }) => { mutate(db => { db.payments[s.id][mi].status = 'paid' }) })
    toConfirm.forEach(({ s, p }) => tellParent(s.id, p.month, 'paid'))
    force()
  }
  const remind = sid => {
    const s = studentById(sid); const unpaid = (d.payments[sid] || []).filter(p => p.status !== 'paid').map(p => p.month)
    const parent = d.users.find(u => u.id === s?.parentId)
    if (parent) notify({ to: parent.id, kind: 'payment', title: 'Rappel de paiement', body: `${unpaid.length} mois impayé(s) pour ${s.name} : ${unpaid.join(', ')}` })
  }
  // relance groupée : tous les élèves avec au moins un mois en retard, en un tap
  const lateStudents = d.students.filter(s => (d.payments[s.id] || []).some(p => p.status === 'overdue'))
  const remindAll = () => {
    lateStudents.forEach(s => {
      const parent = d.users.find(u => u.id === s.parentId)
      const months = (d.payments[s.id] || []).filter(p => p.status === 'overdue').map(p => p.month)
      if (parent) notify({ to: parent.id, kind: 'payment', actor: 'Administration', title: 'Rappel de paiement', body: `Mois en retard pour ${s.name} : ${months.join(', ')}. Merci de régulariser auprès de l'administration.`, link: '/app/payments' })
    })
  }

  const students = d.students.filter(s => classId === 'all' || s.classId === classId)

  return (
    <Screen title="Frais & Finances" sub="Confirmez les versements signalés, encaissez, relancez les retards.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Tile icon="Wallet" color={COL.paid} label="Payés" value={String(counts.paid)} />
        <Tile icon="Hourglass" color={COL.pending} label="À confirmer" sub="signalés par les parents" value={String(counts.pending)} />
        <Tile icon="Wallet" color={COL.overdue} label="En retard" value={String(counts.overdue)} />
        <Tile icon="Wallet" color={COL.due} label="Impayés (à venir)" value={String(counts.due)} />
      </View>

      <Card style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontWeight: '800', color: C.ink, fontSize: 14 }}>Taux de recouvrement</Text>
          <Text style={{ fontWeight: '800', color: COL.paid, fontSize: 14 }}>{rate}%</Text>
        </View>
        <Bar pct={rate} color={COL.paid} height={8} />
        <Text style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>
          Seuls les mois confirmés « Payé » comptent : les versements « À confirmer » ne sont pas encore encaissés.
        </Text>
      </Card>

      {lateStudents.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Btn label={`Relancer tous les retards (${lateStudents.length})`} icon="BellRing" color={COL.overdue}
            onPress={() => { remindAll(); force() }} />
        </View>
      )}

      {toConfirm.length > 0 && (
        <Section title={`Versements signalés : à confirmer (${toConfirm.length})`}
          right={<Btn label="Tout confirmer" icon="Check" color={COL.paid} small onPress={confirmAll} />}>
          <Card>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>
              Un parent a signalé avoir payé. Confirmez après encaissement : le mois passe en « Payé » et le parent est prévenu.
            </Text>
            {toConfirm.map(({ s, p, mi }) => (
              <View key={s.id + p.month} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <Avatar name={s.name} color={COL.pending} size={32} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontWeight: '700', color: C.ink, fontSize: 14 }}>{s.name}</Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>{p.month} · signalé par le parent</Text>
                </View>
                <Btn label="Confirmer" icon="Check" color={COL.paid} small onPress={() => cycle(s.id, mi)} />
              </View>
            ))}
          </Card>
        </Section>
      )}

      <Section title="Échéanciers par élève">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 10 }}>
          <Chip label="Toutes" color={accent} active={classId === 'all'} onPress={() => setClassId('all')} />
          {d.classes.map(c => (
            <Chip key={c.id} label={c.name} color={accent} active={classId === c.id} onPress={() => setClassId(c.id)} />
          ))}
        </View>

        {students.length === 0 ? (
          <Card>
            <EmptyState icon="Wallet" title="Aucun élève"
              sub="Les échéanciers de paiement apparaîtront ici dès qu'un élève sera inscrit." />
          </Card>
        ) : (
          <Card>
            {students.map(s => {
              const months = d.payments[s.id] || []
              return (
                <View key={s.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar name={s.name} color={accent} size={30} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontWeight: '700', color: C.ink, fontSize: 14 }}>{s.name}</Text>
                      <Text style={{ color: C.muted, fontSize: 11 }}>{classById(s.classId)?.name || '·'}</Text>
                    </View>
                    <Pressable onPress={() => { tap(); remind(s.id); force() }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.6 : 1 })}>
                      <Ic n="BellRing" size={13} color={accent} />
                      <Text style={{ color: accent, fontWeight: '800', fontSize: 12 }}>Relancer</Text>
                    </Pressable>
                  </View>
                  {months.length === 0 ? (
                    <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>Aucune échéance établie.</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                      {months.map((p, mi) => (
                        <Pressable key={p.month} onPress={() => { tap(); cycle(s.id, mi) }}
                          style={({ pressed }) => ({ alignItems: 'center', width: 27, opacity: pressed ? 0.6 : 1 })}>
                          <View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: COL[p.status] }} />
                          <Text style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{p.month}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )
            })}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
              {Object.keys(COL).map(k => (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: COL[k] }} />
                  <Text style={{ fontSize: 11, color: C.muted }}>{FR[k]}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}
      </Section>
    </Screen>
  )
}
