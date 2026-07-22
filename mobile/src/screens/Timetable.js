// « Emploi du temps » — portage natif de app/src/pages/Timetable.jsx, en
// LECTURE SEULE (pas d'édition de case sur mobile pour l'instant).
//
// Même sélection de vue que le web : le parent voit les classes de ses enfants,
// l'enseignant voit ses propres séances (ou ses classes), Direction /
// Administration / Surveillant choisissent une classe. Rendu vertical jour par
// jour (Lundi → Vendredi) — plus lisible qu'une grille sur un téléphone.
import { useState } from 'react'
import { View, Text } from 'react-native'
import { db, studentById, TT_SUBJECTS } from '@core/db.js'
import { DAYS, timetableFor, teacherTimetable } from '@core/data.js'
import { schoolPhase } from '@core/livestatus.js'
import { now, rentreeLabel } from '@core/clock.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Chip, Badge, EmptyState, C } from '../components.js'

// Couleur d'une séance : la palette TT_SUBJECTS du cœur, sinon celle de la case.
const colorOf = cell => (TT_SUBJECTS.find(([n]) => n === cell.subject) || [])[1] || cell.color || '#7539E4'

export default function Timetable({ user, params, nav }) {
  const d = db()
  const accent = (ROLE[user.role] || ROLE.admin).color

  // Qui voit quoi — copié de Timetable.jsx (web)
  let classes = d.classes, teacher = null
  if (user.role === 'teacher') {
    teacher = d.teachers.find(t => t.id === (user.teacherId || user.id))
    classes = d.classes.filter(c => (teacher?.classes || []).includes(c.id))
  }
  if (user.role === 'parent') {
    const kids = (user.childIds || []).map(studentById).filter(Boolean)
    classes = d.classes.filter(c => kids.some(k => k.classId === c.id))
  }

  const [mode, setMode] = useState(user.role === 'teacher' ? 'me' : 'class')
  const [classId, setClassId] = useState(classes[0]?.id || d.classes[0]?.id)
  const me = mode === 'me' && teacher
  const grid = me ? teacherTimetable(teacher) : timetableFor(classId)
  const clsName = d.classes.find(c => c.id === classId)?.name
  const sessions = grid.reduce((n, r) => n + r.cells.filter(Boolean).length, 0)
  const wd = now().getDay()
  const todayIdx = wd >= 1 && wd <= 5 ? wd - 1 : -1
  const summer = schoolPhase() === 'vacances'

  if (!me && !classId) return (
    <Screen title="Emploi du temps">
      <EmptyState icon="CalendarDays" title="Aucune classe" sub="L'emploi du temps apparaîtra ici dès qu'une classe sera créée." />
    </Screen>
  )

  return (
    <Screen title="Emploi du temps"
      sub={`${me ? `${teacher.name} · ${teacher.subject}` : `Classe ${clsName || '·'}`} · ${sessions} séances · Lun–Ven`}>

      {(user.role === 'teacher' || classes.length > 1) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 14 }}>
          {user.role === 'teacher' && (
            <Chip label="Mes cours" icon="GraduationCap" color={accent} active={mode === 'me'} onPress={() => setMode('me')} />
          )}
          {classes.map(c => (
            <Chip key={c.id} label={c.name} color={accent} active={mode === 'class' && c.id === classId}
              onPress={() => { setMode('class'); setClassId(c.id) }} />
          ))}
        </View>
      )}

      {summer && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF3C7', borderRadius: 16, padding: 13, marginBottom: 14 }}>
          <Ic n="Sun" size={16} color="#92400E" />
          <Text style={{ flex: 1, color: '#92400E', fontSize: 13, fontWeight: '600' }}>
            Vacances d'été · voici l'emploi du temps type ; les cours reprennent le {rentreeLabel()}.
          </Text>
        </View>
      )}

      {sessions === 0 && (
        <EmptyState icon="CalendarDays" title="Aucune séance" sub="La semaine est vide pour le moment · la Direction établit l'emploi du temps sur le web." />
      )}

      {sessions > 0 && DAYS.map((day, di) => {
        const rows = grid
          .map((r, pi) => ({ start: r.start, end: r.end, cell: r.cells[di], pi }))
          .filter(r => r.cell)
        return (
          <View key={day} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={{ fontWeight: '800', color: di === todayIdx ? accent : C.ink, fontSize: 16, flex: 1 }}>{day}</Text>
              {di === todayIdx && <Badge label="Aujourd'hui" color={accent} />}
              <Text style={{ color: C.muted, fontSize: 12 }}>{rows.length} séance{rows.length > 1 ? 's' : ''}</Text>
            </View>
            <Card style={{ paddingVertical: 6 }}>
              {rows.length === 0 && (
                <Text style={{ color: C.muted, fontSize: 13, paddingVertical: 8 }}>Aucune séance ce jour.</Text>
              )}
              {rows.map((r, idx) => {
                const color = colorOf(r.cell)
                return (
                  <View key={r.pi} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
                    borderBottomWidth: idx < rows.length - 1 ? 1 : 0, borderBottomColor: C.line,
                  }}>
                    <View style={{ width: 46 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: C.ink }}>{r.start}</Text>
                      <Text style={{ fontSize: 11, color: C.muted }}>{r.end}</Text>
                    </View>
                    <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: color }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontWeight: '800', color, fontSize: 14 }}>{r.cell.subject}</Text>
                      <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>
                        {r.cell.room}{r.cell.className ? ` · ${r.cell.className}` : ''}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </Card>
          </View>
        )
      })}
    </Screen>
  )
}
