// Personnel — port natif (lecture seule) de app/src/pages/Staff.jsx
// (Direction & Administration). Le web a quatre onglets RH ; sur téléphone on
// garde l'essentiel du jour : les compteurs de présence, l'équipe avec son
// statut, les demandes de congé en attente et les soldes annuels.
import { useState } from 'react'
import { View, Text } from 'react-native'
import { db } from '@core/db.js'
import { ROLE } from '@core/theme.js'
import { isoOf } from '@core/clock.js'
import { Screen, Card, Section, Tile, Badge, Avatar, Row, Bar, Chip, EmptyState, C, tap } from '../components.js'

// Mêmes libellés/couleurs de statut que le web (ST + STATUS de ui.jsx).
const ST = { present: ['Présent', '#12946F'], late: ['Retard', '#C97C1E'], absent: ['Absent', '#DC4B54'], conge: ['Congé', '#8B5CF6'] }
const LEAVE_TYPES = { annuel: 'Congé annuel', maladie: 'Maladie', exceptionnel: 'Exceptionnel', permission: 'Permission (heures)' }
const LV_ST = { approved: ['Approuvé', '#12946F'], pending: ['En attente', '#C97C1E'], rejected: ['Refusé', '#DC4B54'] }
const QUOTA = 30 // jours de congé annuel / an — même règle que le web

// Même liste que le web : enseignants + administration/surveillance.
function staffList(d) {
  return [
    ...d.teachers.map(t => ({ id: t.id, name: t.name, sub: `${t.designation || 'Enseignant'} · ${t.subject || ''}` })),
    ...d.users.filter(u => ['admin', 'supervisor'].includes(u.role)).map(u => ({ id: u.id, name: u.name, sub: u.position || ROLE[u.role].label })),
  ]
}

export default function Staff({ user, params, nav }) {
  const d = db()
  const staff = staffList(d)
  const [tab, setTab] = useState('presence')

  const today = isoOf(new Date())
  const sa = d.staffAttendance || {}
  // Comme le web : sans pointage enregistré aujourd'hui, tout le monde est
  // considéré présent (l'appel du jour se fait sur le web).
  const marks = sa[today] || Object.fromEntries(staff.map(x => [x.id, 'present']))
  const counts = Object.values(marks).reduce((a, v) => { a[v] = (a[v] || 0) + 1; return a }, { present: 0, late: 0, absent: 0, conge: 0 })

  // Historique 30 jours par personne (abs/retards/congés), comme le DayTab web.
  const cutoff = isoOf(new Date(Date.now() - 30 * 86400000))
  const hist = {}
  for (const iso in sa) {
    if (iso < cutoff) continue
    for (const [id, st] of Object.entries(sa[iso])) {
      const h = hist[id] = hist[id] || { absent: 0, late: 0, conge: 0 }
      if (h[st] != null) h[st]++
    }
  }

  // Congés : demandes en attente, historique récent, soldes annuels.
  const leaves = [...(d.staffLeaves || [])].sort((a, b) => b.at - a.at)
  const pending = leaves.filter(l => l.status === 'pending')
  const decided = leaves.filter(l => l.status !== 'pending')
  const year = new Date().getFullYear()
  const usedAnnual = id => leaves
    .filter(l => l.staffId === id && l.status === 'approved' && l.type === 'annuel' && new Date(l.from).getFullYear() === year)
    .reduce((n, l) => n + l.days, 0)
  const nameOf = id => staff.find(x => x.id === id)?.name || id

  const LeaveRow = ({ lv }) => {
    const [lbl, col] = LV_ST[lv.status] || LV_ST.pending
    return (
      <Row
        avatar={<Avatar name={nameOf(lv.staffId)} color={col} size={36} />}
        title={`${nameOf(lv.staffId)} · ${LEAVE_TYPES[lv.type] || lv.type}`}
        sub={lv.type === 'permission'
          ? `${lv.from}${lv.hours ? ` · ${lv.hours} h` : ''}${lv.reason ? ` · « ${lv.reason} »` : ''}`
          : `${lv.from} → ${lv.to} · ${lv.days} j ouvrés${lv.reason ? ` · « ${lv.reason} »` : ''}`}
        right={<Badge label={lbl} color={col} />}
      />
    )
  }

  return (
    <Screen title="Personnel" sub="Présence, congés et fiabilité de l'équipe.">
      <View style={{ flexDirection: 'row', marginBottom: 14 }}>
        <Chip label="Présence" icon="BriefcaseBusiness" color="#7539E4" active={tab === 'presence'} onPress={() => { tap(); setTab('presence') }} />
        <Chip label={pending.length ? `Congés · ${pending.length}` : 'Congés'} icon="Plane" color="#8B5CF6" active={tab === 'conges'} onPress={() => { tap(); setTab('conges') }} />
      </View>

      {tab === 'presence' && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Tile icon="BriefcaseBusiness" color={ST.present[1]} label="Présents" value={String(counts.present)} />
            <Tile icon="Clock" color={ST.late[1]} label="Retards" value={String(counts.late)} />
            <Tile icon="UserX" color={ST.absent[1]} label="Absents" value={String(counts.absent)} />
            <Tile icon="Plane" color={ST.conge[1]} label="En congé" value={String(counts.conge)} />
          </View>

          <Section title="L'équipe aujourd'hui">
            {staff.length === 0 ? (
              <Card><EmptyState icon="BriefcaseBusiness" title="Aucun membre du personnel" sub="Les enseignants et l'administration apparaîtront ici." /></Card>
            ) : (
              <Card style={{ paddingVertical: 4 }}>
                {staff.map(x => {
                  const st = marks[x.id] || 'present'
                  const [lbl, col] = ST[st]
                  const h = hist[x.id]
                  return (
                    <Row key={x.id}
                      avatar={<Avatar name={x.name} color={col} size={40} />}
                      title={x.name}
                      sub={`${x.sub}${h ? ` · 30 j : ${h.absent} abs · ${h.late} ret · ${h.conge} congés` : ''}`}
                      right={<Badge label={lbl} color={col} />}
                    />
                  )
                })}
              </Card>
            )}
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
              L'appel du personnel se fait depuis le portail web : ici, la lecture du jour.
            </Text>
          </Section>
        </>
      )}

      {tab === 'conges' && (
        <>
          <Section title="Demandes à traiter" style={{ marginTop: 0 }}>
            {pending.length === 0 ? (
              <Card><EmptyState icon="Plane" title="Aucune demande en attente" sub="Les nouvelles demandes de congé apparaîtront ici." /></Card>
            ) : (
              <Card style={{ paddingVertical: 4 }}>
                {pending.map(lv => <LeaveRow key={lv.id} lv={lv} />)}
              </Card>
            )}
            {pending.length > 0 && (
              <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
                L'approbation des congés se fait depuis le portail web (Direction).
              </Text>
            )}
          </Section>

          <Section title="Historique des congés">
            {decided.length === 0 ? (
              <Card><EmptyState icon="Plane" title="Aucun congé enregistré" /></Card>
            ) : (
              <Card style={{ paddingVertical: 4 }}>
                {decided.slice(0, 8).map(lv => <LeaveRow key={lv.id} lv={lv} />)}
              </Card>
            )}
          </Section>

          <Section title={`Soldes de congé annuel · quota ${QUOTA} j / ${year}`}>
            <Card>
              {staff.map(x => {
                const left = Math.max(0, QUOTA - usedAnnual(x.id))
                const col = left > 10 ? '#12946F' : left > 4 ? '#C97C1E' : '#DC4B54'
                return (
                  <View key={x.id} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text numberOfLines={1} style={{ color: C.ink, fontSize: 13, fontWeight: '600', flex: 1, marginRight: 10 }}>{x.name}</Text>
                      <Text style={{ color: col, fontSize: 13, fontWeight: '800' }}>{left} j</Text>
                    </View>
                    <Bar pct={(left / QUOTA) * 100} color={col} />
                  </View>
                )
              })}
            </Card>
          </Section>
        </>
      )}
    </Screen>
  )
}
