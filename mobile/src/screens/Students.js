// Élèves — port natif de app/src/pages/Students.jsx.
// Le web groupe par cycle puis par classe ; sur téléphone on aplatit : une
// recherche, des puces de classe, et la fiche se déplie dans la liste.
// Comme le web, tous les rôles autorisés (Direction, Administration,
// Surveillant, Enseignant) voient l'ensemble des élèves — le web ne filtre
// pas par classes de l'enseignant, on copie sa logique.
import { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { db, classById, userById, CYCLES } from '@core/db.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Chip, Avatar, Row, Btn, Input, EmptyState, C, tap } from '../components.js'

const CYCLE_COLOR = { Primaire: '#7539E4' } // même table que le web

export default function Students({ user, params, nav }) {
  const d = db()
  const accent = ROLE[user.role]?.color || '#7539E4'
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)                      // classe filtrée (null = toutes)
  const [openId, setOpenId] = useState(params?.openStudent || null) // fiche dépliée

  // Classes dans l'ordre des cycles, comme le regroupement du web.
  const classes = CYCLES.flatMap(c => d.classes.filter(cl => cl.cycle === c.cycle))

  const query = q.trim().toLowerCase()
  const list = d.students
    .filter(s => (sel ? s.classId === sel : true))
    .filter(s => (query ? s.name.toLowerCase().includes(query) : true))

  const toggle = id => { tap(); setOpenId(x => (x === id ? null : id)) }

  const Detail = ({ s }) => {
    const cls = classById(s.classId)
    const parent = userById(s.parentId)
    const rows = [
      ['Classe', cls ? `${cls.name} · ${cls.cycle}` : '·'],
      ['Genre', s.gender],
      ['Groupe sanguin', s.bloodGroup],
      ['Père', s.fatherName],
      ['Mère', s.motherName],
      ['Tél. tuteur', s.guardianPhone],
      ['Compte parent', parent?.name || '·'],
    ]
    return (
      <Card style={{ marginTop: 2, marginBottom: 10, borderWidth: 1, borderColor: accent + '33' }}>
        {rows.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Text style={{ color: C.muted, fontSize: 13 }}>{k}</Text>
            <Text style={{ color: C.ink, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 }}>{v || '·'}</Text>
          </View>
        ))}
        <View style={{ marginTop: 12 }}>
          <Btn small label="Bulletin" icon="FileText" color={accent}
            onPress={() => nav.navigate('~bulletin', { childId: s.id })} />
        </View>
      </Card>
    )
  }

  return (
    <Screen title="Élèves" sub={`${d.students.length} inscrits · ${d.classes.length} classes`}>
      <Input value={q} onChangeText={setQ} placeholder="Rechercher un élève par nom…" style={{ marginBottom: 12 }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ paddingRight: 8 }}>
        <Chip label="Toutes" color={accent} active={!sel} onPress={() => { tap(); setSel(null) }} />
        {classes.map(cl => (
          <Chip key={cl.id} label={cl.name} color={CYCLE_COLOR[cl.cycle] || accent}
            active={sel === cl.id} onPress={() => { tap(); setSel(cl.id) }} />
        ))}
      </ScrollView>

      {!!sel && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Ic n="GraduationCap" size={14} color={C.muted} />
          <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>
            {classById(sel)?.name} · {classById(sel)?.cycle} · {list.length} élève{list.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {list.length === 0 ? (
        <Card>
          <EmptyState icon="Search" title="Aucun élève ne correspond"
            sub={query ? "Vérifiez l'orthographe ou essayez un autre nom." : 'Aucun élève dans cette classe pour le moment.'} />
        </Card>
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {list.map(s => (
            <View key={s.id}>
              <Row
                avatar={<Avatar name={s.name} color={CYCLE_COLOR[classById(s.classId)?.cycle] || accent} size={40} />}
                title={s.name}
                sub={`${s.gender} · ${classById(s.classId)?.name || '·'}`}
                right={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ic n="Droplet" size={12} color="#FF6B81" />
                    <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>{s.bloodGroup}</Text>
                    <Ic n={openId === s.id ? 'ChevronUp' : 'ChevronDown'} size={15} color={C.muted} />
                  </View>
                }
                onPress={() => toggle(s.id)}
                style={openId === s.id ? { borderBottomWidth: 0 } : null}
              />
              {openId === s.id && <Detail s={s} />}
            </View>
          ))}
        </Card>
      )}
    </Screen>
  )
}
