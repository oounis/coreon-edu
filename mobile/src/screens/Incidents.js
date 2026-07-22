// Incidents — portage natif de app/src/pages/Incidents.jsx.
// Mêmes règles que le web : supervisor/admin/schooladmin signalent,
// admin/schooladmin résolvent, la sécurité consulte. Mutations et
// notifications identiques au web — seul le formulaire devient « à puces » :
// on compose le titre par des choix, on ne tape que la description.
import { useReducer, useState } from 'react'
import { View, Text, Pressable, ScrollView, Modal } from 'react-native'
import { db, mutate, uid, studentById } from '@core/db.js'
import { notify } from '@core/notify.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Chip, Badge, Btn, Input, EmptyState, C } from '../components.js'

// Mêmes teintes que le web : SEV_TINT sky/butter/coral (cf. ui.jsx TINTS).
const TYPES = ['Bagarre', 'Santé', 'Comportement', 'Sécurité', 'Autre']
const SEV_COLOR = { low: '#0E7FB8', medium: '#C97C1E', high: '#DC4B54' }
const SEV_FR = { low: 'Faible', medium: 'Moyenne', high: 'Élevée' }
const OK = '#12946F', WARN = '#C97C1E'
// Le titre se compose : type + contexte — zéro saisie obligatoire.
const CONTEXTS = ['dans la cour', 'en classe', 'dans le couloir', 'au portail', 'à la cantine', 'au gymnase', 'aux sanitaires']

const BLANK = () => ({ type: 'Bagarre', severity: 'medium', context: CONTEXTS[0], classId: '', studentId: '', body: '' })

// « il y a … » sans date-fns (interdit côté natif — cf. core/clock.js).
const ago = at => {
  const m = Math.round((Date.now() - at) / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `il y a ${h} h`
  return `il y a ${Math.round(h / 24)} j`
}

function Sheet({ title, onClose, children, footer }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0E213566', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '92%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18, paddingBottom: 8 }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: C.ink }} numberOfLines={2}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}><Ic n="X" size={20} color={C.muted} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14 }}>{children}</ScrollView>
          {footer && <View style={{ padding: 18, paddingTop: 10, paddingBottom: 28, borderTopWidth: 1, borderTopColor: C.line }}>{footer}</View>}
        </View>
      </View>
    </Modal>
  )
}
const Lbl = ({ children }) => <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted, marginTop: 14, marginBottom: 7 }}>{children}</Text>
const Wrap = ({ children }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }}>{children}</View>

export default function Incidents({ user, params, nav }) {
  const u = user
  const [, force] = useReducer(x => x + 1, 0)
  const accent = (ROLE[u.role] || ROLE.admin).color
  // Mêmes droits que le web : la sécurité voit la liste, sans signaler.
  const canReport = ['supervisor', 'admin', 'schooladmin'].includes(u.role)
  const canResolve = ['admin', 'schooladmin'].includes(u.role)

  const [open, setOpen] = useState(false)
  const [f, setF] = useState(BLANK)
  const d = db()
  const title = `${f.type} ${f.context}`
  const students = f.classId ? d.students.filter(s => s.classId === f.classId) : []

  const report = () => {
    if (!title.trim()) return
    const id = uid('inc'); const s = f.studentId ? studentById(f.studentId) : null
    mutate(db => { db.incidents.unshift({ id, at: Date.now(), by: u.name, studentId: f.studentId || null, type: f.type, title: title.trim(), body: f.body.trim(), severity: f.severity, status: 'open' }) })
    notify({ role: 'admin', kind: 'incident', title: `Incident : ${f.type}`, body: `${u.name} a signalé : ${title.trim()}${s ? ` (${s.name})` : ''}` })
    notify({ role: 'schooladmin', kind: 'incident', title: `Incident : ${f.type}`, body: `${title.trim()}${s ? ` (${s.name})` : ''}` })
    if (s?.parentId) notify({ to: s.parentId, kind: 'incident', title: "Note de l'école concernant votre enfant", body: `${f.type} : ${title.trim()}` })
    setOpen(false); setF(BLANK()); force()
  }

  const resolve = id => { mutate(db => { const i = db.incidents.find(x => x.id === id); if (i) i.status = 'resolved' }); force() }

  return (
    <Screen title="Incidents" sub="Signalez et suivez ce qui se passe à l'école."
      right={canReport ? <Btn small icon="Plus" label="Signaler" color={accent} onPress={() => { setF(BLANK()); setOpen(true) }} /> : null}>

      {d.incidents.length === 0
        ? <Card><EmptyState icon="ShieldAlert" title="Aucun incident" sub="Aucun incident signalé pour le moment." /></Card>
        : d.incidents.map(i => {
            const s = i.studentId ? studentById(i.studentId) : null
            const sev = SEV_COLOR[i.severity] || SEV_COLOR.medium
            return (
              <Card key={i.id} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: sev + '1A' }}>
                    <Ic n="ShieldAlert" size={18} color={sev} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontWeight: '800', color: C.ink, fontSize: 14 }}>{i.title}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                      <Badge label={i.type} color={accent} />
                      <Badge label={SEV_FR[i.severity] || i.severity} color={sev} />
                      <Badge label={i.status === 'open' ? 'Ouvert' : 'Résolu'} color={i.status === 'open' ? WARN : OK} />
                    </View>
                    {!!i.body && <Text style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>{i.body}</Text>}
                    <Text style={{ color: C.muted, fontSize: 12, marginTop: 5 }}>par {i.by}{s ? ` · ${s.name}` : ''} · {ago(i.at)}</Text>
                  </View>
                </View>
                {canResolve && i.status === 'open' && (
                  <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <Btn small kind="ghost" icon="Check" label="Résoudre" color={OK} onPress={() => resolve(i.id)} />
                  </View>
                )}
              </Card>
            )
          })}

      {open && (
        <Sheet title="Signaler un incident" onClose={() => setOpen(false)}
          footer={<Btn icon="ShieldAlert" label="Signaler & notifier" color={accent} onPress={report} />}>

          <Lbl>Type</Lbl>
          <Wrap>{TYPES.map(t => <Chip key={t} label={t} color={accent} active={f.type === t} onPress={() => setF({ ...f, type: t })} />)}</Wrap>

          <Lbl>Gravité</Lbl>
          <Wrap>{['low', 'medium', 'high'].map(k => (
            <Chip key={k} label={SEV_FR[k]} color={SEV_COLOR[k]} active={f.severity === k} onPress={() => setF({ ...f, severity: k })} />
          ))}</Wrap>

          <Lbl>Où / contexte</Lbl>
          <Wrap>{CONTEXTS.map(cx => <Chip key={cx} label={cx} color={accent} active={f.context === cx} onPress={() => setF({ ...f, context: cx })} />)}</Wrap>

          <Lbl>Classe (pour cibler un élève, facultatif)</Lbl>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip label="aucune" color={accent} active={!f.classId} onPress={() => setF({ ...f, classId: '', studentId: '' })} />
            {d.classes.map(cl => <Chip key={cl.id} label={cl.name} color={accent} active={f.classId === cl.id} onPress={() => setF({ ...f, classId: cl.id, studentId: '' })} />)}
          </ScrollView>

          {!!f.classId && <>
            <Lbl>Élève (facultatif)</Lbl>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chip label=", aucun" color={accent} active={!f.studentId} onPress={() => setF({ ...f, studentId: '' })} />
              {students.map(s => <Chip key={s.id} label={s.name} color={accent} active={f.studentId === s.id} onPress={() => setF({ ...f, studentId: s.id })} />)}
            </ScrollView>
          </>}

          <Lbl>Détails (facultatif)</Lbl>
          <Input value={f.body} onChangeText={t => setF({ ...f, body: t })} multiline numberOfLines={3}
            style={{ minHeight: 70, textAlignVertical: 'top' }} placeholder="Ce qui s'est passé + mesure prise" />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: accent + '12', borderRadius: 12, padding: 10, marginTop: 14 }}>
            <Ic n="ShieldAlert" size={16} color={SEV_COLOR[f.severity]} />
            <Text style={{ flex: 1, fontWeight: '800', fontSize: 13, color: C.ink }}>{title}</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: SEV_COLOR[f.severity] }}>{SEV_FR[f.severity]}</Text>
          </View>
          <Text style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
            L'Administration et la Direction sont notifiées immédiatement{f.studentId ? ', ainsi que le parent de l’élève concerné' : ''}.
          </Text>
        </Sheet>
      )}
    </Screen>
  )
}
