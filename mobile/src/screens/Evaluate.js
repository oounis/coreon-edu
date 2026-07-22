// Évaluer une classe en 30 secondes — LA fonctionnalité phare, version tactile.
// Le web glisse-dépose les élèves dans des réponses colorées ; au doigt on fait
// TAP-TAP : on touche un élève (il se sélectionne), puis une réponse (il s'y range).
// Toucher un élève déjà placé le renvoie dans le vivier. Même données, même
// mutation, même forme d'évaluation que le web (app/src/pages/Evaluate.jsx) :
// les bulletins des parents sont calculés par le même code du cœur.
import { useMemo, useState, useReducer } from 'react'
import { View, Text, Pressable } from 'react-native'
import { teacherSchedule, QUESTIONS, BUCKETS, BADGES } from '@core/data.js'
import { db, mutate, uid } from '@core/db.js'
import { notify } from '@core/notify.js'
import { studentSummary, mentionFor } from '@core/results.js'
import { now, frDateLabel } from '@core/clock.js'
import { schoolPhase } from '@core/livestatus.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Btn, Input, EmptyState, C } from '../components.js'

const ACCENT = ROLE.teacher.color        // accent enseignant, comme var(--accent) au web
const OK = '#12946F'                     // « EN COURS » (STATUS.ok du web)

const pad = n => String(n).padStart(2, '0')
const fmtAt = ts => { const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}` }

// ── Petites briques locales ─────────────────────────────────────────────────
const LivePill = () => (
  <View style={{ backgroundColor: OK, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>● EN COURS</Text>
  </View>
)

// Pastille élève du vivier : gros gabarit tactile, état « sélectionné » très visible.
function PoolChip({ s, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999,
      paddingVertical: 10, paddingHorizontal: 14,
      backgroundColor: selected ? ACCENT : '#fff',
      borderWidth: 1.5, borderColor: selected ? ACCENT : C.line,
      opacity: pressed ? 0.8 : 1,
      transform: [{ scale: selected ? 1.04 : 1 }],
    })}>
      {selected && <Ic n="Hand" size={13} color="#fff" />}
      <Text style={{ fontWeight: '700', fontSize: 14, color: selected ? '#fff' : C.ink }}>{s.name}</Text>
    </Pressable>
  )
}

// Une réponse colorée : cible du second tap. S'illumine quand un élève est en main.
function BucketZone({ b, students, armed, onDrop, onRemove }) {
  return (
    <Pressable onPress={armed ? onDrop : undefined} style={({ pressed }) => ({
      flexBasis: '47%', flexGrow: 1, minHeight: 128, borderRadius: 18, padding: 12,
      backgroundColor: armed ? b.soft : '#fff',
      borderWidth: armed ? 2 : 1, borderColor: armed ? b.color : C.line,
      borderStyle: armed ? 'dashed' : 'solid',
      opacity: pressed && armed ? 0.75 : 1,
    })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Ic n={b.icon} size={15} color={b.color} />
        <Text style={{ color: b.color, fontWeight: '800', fontSize: 13, flex: 1, marginLeft: 5 }}>{b.label}</Text>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: b.color, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>{students.length}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {students.map(s => (
          <Pressable key={s.id} onPress={() => onRemove(s.id)} style={({ pressed }) => ({
            backgroundColor: b.color, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11, opacity: pressed ? 0.7 : 1,
          })}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{s.name.split(' ')[0]}</Text>
          </Pressable>
        ))}
        {!students.length && armed && <Text style={{ color: b.color, fontSize: 12, fontWeight: '600' }}>Toucher pour placer ici</Text>}
      </View>
    </Pressable>
  )
}

export default function Evaluate({ user, params, nav }) {
  const sched = useMemo(() => teacherSchedule(), [])
  const [, force] = useReducer(x => x + 1, 0)
  const [slot, setSlot] = useState(null)
  const [step, setStep] = useState(0)                 // 0..4 questions, 5 badges & note, 6 succès
  const [placements, setPlacements] = useState({})    // {qid:{sid:bucketKey}} — même forme que le web
  const [badges, setBadges] = useState({})
  const [note, setNote] = useState('')
  const [lesson, setLesson] = useState('')
  const [sel, setSel] = useState(null)                // élève « en main » (tap 1)
  const [badgeSel, setBadgeSel] = useState(null)
  const [saved, setSaved] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const cls = slot ? { slot, cls: slot.cls, students: slot.students, isLive: slot.isLive } : null
  const students = cls ? cls.students : []
  const q = QUESTIONS[step]
  const place = placements[q?.id] || {}
  const pool = students.filter(s => !place[s.id])
  const classHistory = useMemo(() => (cls ? db().evaluations.filter(e => e.classId === cls.cls.id) : []), [step, slot])

  const putIn = bucketKey => {
    if (!sel) return
    setPlacements(prev => ({ ...prev, [q.id]: { ...(prev[q.id] || {}), [sel]: bucketKey } }))
    setSel(null)
  }
  const takeOut = sid => setPlacements(prev => { const cur = { ...(prev[q.id] || {}) }; delete cur[sid]; return { ...prev, [q.id]: cur } })
  const autoFill = b => { setPlacements(prev => { const cur = { ...(prev[q.id] || {}) }; pool.forEach(s => { cur[s.id] = b }); return { ...prev, [q.id]: cur } }); setSel(null) }
  const goStep = i => { setSel(null); setErr(''); setStep(i) }
  function reset() { setStep(0); setPlacements({}); setBadges({}); setNote(''); setLesson(''); setSaved([]); setSel(null); setBadgeSel(null); setErr('') }
  function backToSchedule() { setSlot(null); reset() }

  function submit() {
    if (saving) return                                 // un double-tap créait deux évaluations
    const cleanPlacements = {}
    for (const qid in placements) { const p = placements[qid]; if (p && Object.keys(p).length) cleanPlacements[qid] = p }
    const graded = students.filter(s => studentSummary({ placements: cleanPlacements }, s.id).score != null)
    if (graded.length === 0) { setErr("Placez au moins un élève sur une réponse avant d'enregistrer."); return }
    setSaving(true)
    const teacher = user?.name || 'Enseignant'
    // On ne conserve que les badges des élèves réellement notés (même règle que le web).
    const cleanBadges = Object.fromEntries(Object.entries(badges).filter(([sid]) => graded.some(s => s.id === sid)))
    const ev = { id: uid('ev'), at: Date.now(), classId: cls.cls.id, className: cls.cls.name, subject: cls.slot.subject, lesson: lesson.trim() || null, teacher, placements: cleanPlacements, badges: cleanBadges, note }
    mutate(db => { db.evaluations.unshift(ev) })
    students.forEach(s => { if (s.parentId) { const sum = studentSummary(ev, s.id); if (sum.score != null) notify({ to: s.parentId, kind: 'evaluation', title: `Nouvelle évaluation pour ${s.name.split(' ')[0]}`, body: `${cls.slot.subject} : ${sum.score}/100${sum.badge ? ` · ${sum.badge.label}` : ''}`, link: '/app' }) } })
    notify({ role: 'admin', kind: 'evaluation', actor: teacher, title: `Évaluation enregistrée · ${cls.cls.name}`, body: `${cls.slot.subject} · ${graded.length} élèves notés`, link: '/app/students' })
    notify({ role: 'schooladmin', kind: 'evaluation', actor: teacher, title: `Évaluation enregistrée · ${cls.cls.name}`, body: `${cls.slot.subject} · ${graded.length} élèves notés`, link: '/app/students' })
    setSaved(graded.map(s => { const sum = studentSummary(ev, s.id); return { name: s.name, ...sum, mention: mentionFor(sum.score) } }))
    setStep(6); setSaving(false); force()
  }

  /* ── 0) Mode été : pas de séances à évaluer ─────────────────────────────── */
  if (schoolPhase() === 'vacances') return (
    <Screen title="Évaluation rapide" sub="Le cœur de Coreon Edu : en pause estivale.">
      <EmptyState icon="Sun" title="L'évaluation en classe est en pause"
        sub="Il n'y a pas de séances à évaluer pendant les vacances : votre emploi du temps redémarrera automatiquement avec la nouvelle année scolaire." />
    </Screen>
  )

  /* ── 1) Choix de la séance ───────────────────────────────────────────────── */
  if (!slot) return (
    <Screen title="Mon emploi du temps" sub="Choisissez la classe à évaluer : la séance en cours est mise en avant.">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <Ic n="CalendarDays" size={15} color={ACCENT} />
        <Text style={{ color: C.muted, fontSize: 13, textTransform: 'capitalize' }}>{frDateLabel(now())}</Text>
      </View>
      <View style={{ gap: 12 }}>
        {sched.map((s, i) => (
          <Card key={i} onPress={() => { reset(); setSlot(s) }}
            style={s.isLive ? { borderColor: ACCENT, borderWidth: 2 } : null}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ic n="Clock" size={14} color={ACCENT} />
              <Text style={{ color: ACCENT, fontWeight: '800', fontSize: 13, flex: 1, marginLeft: 6 }}>{s.start} – {s.end}</Text>
              {s.isLive && <LivePill />}
            </View>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 19, marginTop: 6 }}>
              {s.cls.name} <Text style={{ color: C.muted, fontWeight: '500', fontSize: 15 }}> {s.subject}</Text>
            </Text>
            {!!s.cls.grade && <Text style={{ color: C.muted, fontSize: 13 }}>{s.cls.grade}</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ic n="Users" size={14} color={C.muted} /><Text style={{ color: C.muted, fontSize: 13 }}>{s.students.length} élèves</Text>
              </View>
              {!!s.room && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ic n="MapPin" size={14} color={C.muted} /><Text style={{ color: C.muted, fontSize: 13 }}>{s.room}</Text>
              </View>}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 }}>
              <Text style={{ color: ACCENT, fontWeight: '800', fontSize: 14 }}>Évaluer cette classe</Text>
              <Ic n="ChevronRight" size={15} color={ACCENT} />
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  )

  /* ── 3) Succès ───────────────────────────────────────────────────────────── */
  if (step === 6) return (
    <Screen title="">
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' }}>
          <Ic n="Check" size={32} color="#fff" />
        </View>
        <Text style={{ color: C.ink, fontWeight: '800', fontSize: 23, marginTop: 14 }}>Enregistré & partagé</Text>
        <Text style={{ color: C.muted, fontSize: 14, marginTop: 4, textAlign: 'center' }}>
          {cls.cls.name} · {cls.slot.subject} · {saved.length} élèves notés.{'\n'}Parents et direction notifiés.
        </Text>
      </View>
      {saved.length > 0 && (
        <Card style={{ marginTop: 20 }}>
          <Text style={{ color: ACCENT, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', marginBottom: 8 }}>Notes enregistrées</Text>
          {saved.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < saved.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
              <Text style={{ color: C.ink, fontWeight: '600', fontSize: 14, flex: 1 }}>{s.name}</Text>
              {!!s.badge && <View style={{ marginRight: 8 }}><Ic n={s.badge.icon} size={14} color={ACCENT} /></View>}
              <Text style={{ fontWeight: '800', fontSize: 14, color: s.mention?.color }}>{s.score}/100</Text>
            </View>
          ))}
        </Card>
      )}
      <Card style={{ marginTop: 14 }}>
        <Text style={{ color: C.muted, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', marginBottom: 8 }}>
          Historique de la classe · {classHistory.length} évaluation(s)
        </Text>
        {classHistory.slice(0, 6).map(e => (
          <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 }}>
            <Text style={{ color: C.ink, fontSize: 13 }}>{e.subject}{e.lesson ? ` · ${e.lesson}` : ''}</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>{fmtAt(e.at)}</Text>
          </View>
        ))}
      </Card>
      <View style={{ gap: 10, marginTop: 20 }}>
        <Btn label="Nouvelle évaluation · cette classe" icon="Zap" color={ACCENT} onPress={reset} />
        <Btn label="Emploi du temps" icon="ChevronLeft" color={ACCENT} kind="outline" onPress={backToSchedule} />
      </View>
    </Screen>
  )

  /* ── 2) Évaluation ───────────────────────────────────────────────────────── */
  return (
    <Screen title="Évaluation rapide" sub="Touchez un élève, puis sa réponse. Cinq questions, en quelques secondes.">
      <Card style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 15 }}>
              {cls.cls.name} · {cls.slot.subject} <Text style={{ color: C.muted, fontWeight: '400', fontSize: 13 }}> {cls.cls.grade}</Text>
            </Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{cls.slot.start}–{cls.slot.end} · {students.length} élèves</Text>
          </View>
          {cls.isLive && <LivePill />}
        </View>
        <Input value={lesson} onChangeText={setLesson} maxLength={40} placeholder="Leçon du jour (ex. Les fractions)" style={{ marginTop: 10 }} />
        <Pressable onPress={backToSchedule} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 10 }}>
          <Ic n="ChevronLeft" size={14} color={ACCENT} />
          <Text style={{ color: ACCENT, fontWeight: '800', fontSize: 13 }}>Emploi du temps</Text>
        </Pressable>
      </Card>

      {/* fil d'avancement : 5 questions + l'étape badges */}
      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 16 }}>
        {[...QUESTIONS.map((_, i) => i), 5].map(i => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= step ? ACCENT : '#E7EAF3' }} />
        ))}
      </View>

      {step < 5 ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: ACCENT, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' }}>Question {step + 1} sur 5</Text>
              <Text style={{ color: C.ink, fontWeight: '800', fontSize: 18, marginTop: 2 }}>{q.text}</Text>
            </View>
            <Text style={{ color: Object.keys(place).length === students.length ? OK : C.muted, fontWeight: '800', fontSize: 13 }}>
              {Object.keys(place).length}/{students.length} placés
            </Text>
          </View>

          {/* Vivier : premier tap */}
          <Card style={{ borderStyle: 'dashed', padding: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {pool.length ? pool.map(s => (
                <PoolChip key={s.id} s={s} selected={sel === s.id} onPress={() => setSel(sel === s.id ? null : s.id)} />
              )) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 }}>
                  <Ic n="Check" size={15} color={OK} />
                  <Text style={{ color: OK, fontWeight: '700', fontSize: 13 }}>Tous placés</Text>
                </View>
              )}
            </View>
            {pool.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 10 }}>
                <Text style={{ color: C.muted, fontSize: 11 }}>Rapide :</Text>
                {BUCKETS.map(b => (
                  <Pressable key={b.key} onPress={() => autoFill(b.key)} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 }}>
                    <Text style={{ color: C.muted, fontSize: 11 }}>tous → {b.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>
          <Text style={{ color: sel ? ACCENT : C.muted, fontSize: 12, fontWeight: sel ? '800' : '400', marginBottom: 8 }}>
            {sel ? "2. Touchez une réponse pour placer l'élève ↓" : '1. Touchez un élève pour le prendre en main'}
          </Text>

          {/* Réponses : second tap */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {BUCKETS.map(b => (
              <BucketZone key={b.key} b={b} armed={!!sel}
                students={students.filter(s => place[s.id] === b.key)}
                onDrop={() => putIn(b.key)} onRemove={takeOut} />
            ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 10 }}>
            <Btn label="Retour" icon="ChevronLeft" color={ACCENT} kind="outline" small onPress={() => step > 0 && goStep(step - 1)} disabled={step === 0} />
            <Pressable onPress={() => { setPlacements(p => ({ ...p, [q.id]: {} })); setSel(null) }} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: C.muted, fontSize: 12 }}>réinitialiser</Text>
            </Pressable>
            <Btn label={step < 4 ? 'Suivant' : 'Badges & note'} icon="ChevronRight" color={ACCENT} small onPress={() => goStep(step + 1)} />
          </View>
        </>
      ) : (
        <>
          <Text style={{ color: C.ink, fontWeight: '800', fontSize: 18 }}>Badges & une note rapide</Text>
          <Text style={{ color: C.muted, fontSize: 13, marginTop: 2, marginBottom: 12 }}>Facultatif : touchez un élève, puis un badge.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {students.map(s => {
              const B = BADGES.find(b => b.key === badges[s.id])
              const on = badgeSel === s.id
              return (
                <Pressable key={s.id} onPress={() => setBadgeSel(on ? null : s.id)} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 13,
                  backgroundColor: '#fff', borderWidth: 1.5, borderColor: on ? ACCENT : C.line,
                }}>
                  <Text style={{ color: on ? ACCENT : C.ink, fontWeight: '700', fontSize: 13 }}>{s.name}</Text>
                  {!!B && <Ic n={B.icon} size={14} color={ACCENT} />}
                </Pressable>
              )
            })}
          </View>
          {!!badgeSel && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {BADGES.map(b => (
                <Pressable key={b.key} onPress={() => { setBadges(p => ({ ...p, [badgeSel]: b.key })); setBadgeSel(null) }} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 13,
                  backgroundColor: ROLE.teacher.soft, borderWidth: 1, borderColor: ACCENT,
                }}>
                  <Ic n={b.icon} size={14} color={ACCENT} />
                  <Text style={{ color: C.ink, fontWeight: '700', fontSize: 13 }}>{b.label}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => { setBadges(p => { const n = { ...p }; delete n[badgeSel]; return n }); setBadgeSel(null) }} style={{ paddingVertical: 8, paddingHorizontal: 13 }}>
                <Text style={{ color: C.muted, fontSize: 13 }}>retirer</Text>
              </Pressable>
            </View>
          )}
          <Input value={note} onChangeText={setNote} multiline placeholder="Note facultative pour les parents / l'administration…" style={{ minHeight: 90, textAlignVertical: 'top' }} />
          {!!err && <Text style={{ color: C.danger, fontSize: 13, fontWeight: '700', marginTop: 10 }}>{err}</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
            <Btn label="Retour" icon="ChevronLeft" color={ACCENT} kind="outline" small onPress={() => goStep(4)} />
            <Btn label={saving ? 'Enregistrement…' : 'Enregistrer & partager'} icon="Zap" color={ACCENT} onPress={submit} disabled={saving} />
          </View>
        </>
      )}
    </Screen>
  )
}
