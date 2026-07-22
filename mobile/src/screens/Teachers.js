// Enseignants — port natif de app/src/pages/Teachers.jsx (Direction & Administration).
// Même lecture que le web : recherche (nom ou matière), regroupement par
// matière, et le profil se déplie dans la liste au lieu d'ouvrir une modale.
import { useState } from 'react'
import { View, Text } from 'react-native'
import { db, classById, TT_SUBJECTS } from '@core/db.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Avatar, Row, Input, EmptyState, C, tap } from '../components.js'

// Couleur de matière : même palette que l'emploi du temps (core).
const subjColor = s => (TT_SUBJECTS.find(([n]) => n === s) || [null, '#7539E4'])[1]

export default function Teachers({ user, params, nav }) {
  const d = db()
  const accent = ROLE[user.role]?.color || '#7539E4'
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)

  const query = q.trim().toLowerCase()
  const list = query
    ? d.teachers.filter(t => t.name.toLowerCase().includes(query) || (t.subject || '').toLowerCase().includes(query))
    : d.teachers
  const subjects = [...new Set(list.map(t => t.subject || 'Autre'))].sort()

  const toggle = id => { tap(); setOpenId(x => (x === id ? null : id)) }

  const Detail = ({ t }) => {
    const cls = (t.classes || []).map(id => classById(id)?.name).filter(Boolean)
    const rows = [
      ['Matière', t.subject],
      ['Classes', cls.length ? cls.join(', ') : '·'],
      ['Diplôme', t.qualification],
      ['Expérience', t.experience != null ? `${t.experience} ans` : '·'],
      ["Date d'embauche", t.joiningDate],
      ['Téléphone', t.phone],
      ['E-mail', t.email],
      ['Salaire', t.salary ? `${t.salary} DT` : '·'],
    ]
    return (
      <Card style={{ marginTop: 2, marginBottom: 10, borderWidth: 1, borderColor: accent + '33' }}>
        {rows.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Text style={{ color: C.muted, fontSize: 13 }}>{k}</Text>
            <Text style={{ color: C.ink, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 }}>{v || '·'}</Text>
          </View>
        ))}
      </Card>
    )
  }

  return (
    <Screen title="Enseignants" sub={`${d.teachers.length} membres · ${subjects.length} matières`}>
      <Input value={q} onChangeText={setQ} placeholder="Rechercher (nom ou matière)…" style={{ marginBottom: 14 }} />

      {list.length === 0 ? (
        <Card>
          <EmptyState icon="Search" title="Aucun résultat"
            sub="Aucun membre du personnel ne correspond à cette recherche." />
        </Card>
      ) : subjects.map(sub => {
        const col = subjColor(sub)
        const group = list.filter(t => (t.subject || 'Autre') === sub)
        return (
          <View key={sub} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: col + '1A', alignItems: 'center', justifyContent: 'center' }}>
                <Ic n="BookOpen" size={13} color={col} />
              </View>
              <Text style={{ fontWeight: '800', color: C.ink, fontSize: 15, flex: 1 }}>{sub}</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>{group.length}</Text>
            </View>
            <Card style={{ paddingVertical: 4 }}>
              {group.map(t => (
                <View key={t.id}>
                  <Row
                    avatar={<Avatar name={t.name} color={col} size={40} />}
                    title={t.name}
                    sub={`${t.designation || 'Enseignant'} · ${t.experience ?? 0} ans · ${(t.classes || []).length} classe${(t.classes || []).length > 1 ? 's' : ''}`}
                    right={<Ic n={openId === t.id ? 'ChevronUp' : 'ChevronDown'} size={15} color={C.muted} />}
                    onPress={() => toggle(t.id)}
                    style={openId === t.id ? { borderBottomWidth: 0 } : null}
                  />
                  {openId === t.id && <Detail t={t} />}
                </View>
              ))}
            </Card>
          </View>
        )
      })}
    </Screen>
  )
}
