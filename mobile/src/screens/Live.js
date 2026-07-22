// Suivi en direct — port natif de app/src/pages/Live.jsx.
// Où est mon enfant en ce moment + le parcours complet de la journée
// (arrivée, séances, récré 10:00, cantine 12:15, sortie). Toute la logique
// vient de core/ : mêmes calculs que le web, même vérité.
import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { db, studentById, classById } from '@core/db.js'
import { DAYS } from '@core/data.js'
import { AREAS, fmt, daySegments, statusAt, schoolPhase, nowState } from '@core/livestatus.js'
import { studentSummary, mentionFor } from '@core/results.js'
import { now as appNow, isoOf, rentreeLabel } from '@core/clock.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Chip, Avatar, Bar, EmptyState, C } from '../components.js'

const ACCENT = ROLE.parent.color

const stopLabel = s => s.kind === 'class' ? (s.cell?.subject || 'Étude')
  : s.kind === 'cour' ? 'Récréation'
  : s.kind === 'cantine' ? 'Déjeuner' : 'Étude'

const STOP_ICON = { entree: 'DoorOpen', class: 'BookOpen', cour: 'Trees', cantine: 'Utensils' }
const ATT_BADGE = {
  present: { label: 'Présent', color: '#10B981' },
  late: { label: 'En retard', color: '#F59E0B' },
  absent: { label: 'Absent', color: '#E5484D' },
}

// Une étape du parcours : heure, pastille colorée par lieu, libellé.
function Stop({ stop, isCur, isFirst, isLast, done, onPress }) {
  const area = AREAS[stop.kind] || AREAS.class
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flexDirection: 'row', alignItems: 'stretch', opacity: pressed ? 0.7 : 1,
    })}>
      <Text style={{ width: 46, textAlign: 'right', fontSize: 12, fontWeight: isCur ? '800' : '600', color: isCur ? area.color : C.muted, paddingTop: 13 }}>
        {fmt(stop.time)}
      </Text>
      <View style={{ width: 34, alignItems: 'center' }}>
        <View style={{ position: 'absolute', left: 16, width: 2, backgroundColor: C.line, top: isFirst ? 16 : 0, bottom: isLast ? undefined : 0, height: isLast ? 16 : undefined }} />
        <View style={{
          marginTop: 9, width: isCur ? 22 : 12, height: isCur ? 22 : 12, borderRadius: 11,
          backgroundColor: done || isCur ? area.color : '#fff',
          borderWidth: 2, borderColor: done || isCur ? area.color : C.line,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {isCur && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
        </View>
      </View>
      <View style={{
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6,
        backgroundColor: isCur ? area.color + '14' : 'transparent', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 10,
      }}>
        <View style={{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: area.color + '1A' }}>
          <Ic n={STOP_ICON[stop.kind] || 'BookOpen'} size={15} color={area.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontWeight: isCur ? '800' : '700', color: C.ink, fontSize: 14 }}>{stop.label}</Text>
          <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12 }}>{stop.sub || area.label}</Text>
        </View>
        {isCur && (
          <View style={{ backgroundColor: area.color, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>ICI</Text>
          </View>
        )}
      </View>
    </Pressable>
  )
}

export default function Live({ user }) {
  const d = db()
  const kids = (user.childIds || []).map(studentById).filter(Boolean)
  const [kidId, setKidId] = useState(kids[0]?.id)
  const kid = kids.find(k => k.id === kidId) || kids[0] || null
  const cls = kid ? classById(kid.classId) : null

  // ── temps scolaire réel : le suivi vit aux heures de l'école ──
  const ns = nowState()
  const phase = schoolPhase()
  const defMin = phase === 'live' ? ns.nowMin : phase === 'after' ? 900 : phase === 'before' ? 480 : 630
  const [min, setMin] = useState(defMin)
  const [liveNow, setLiveNow] = useState(phase === 'live')
  useEffect(() => {
    if (!liveNow) return
    const t = setInterval(() => { const n = appNow(); setMin(n.getHours() * 60 + n.getMinutes()) }, 20000)
    return () => clearInterval(t)
  }, [liveNow])
  const exploring = !liveNow && min !== defMin
  const simulated = exploring && (phase === 'weekend' || phase === 'before')  // journée type, pas la réalité
  const replay = exploring && phase === 'after'                               // revoir la vraie journée

  const sick = useMemo(() => !!kid && d.incidents.some(i =>
    i.studentId === kid.id && i.type === 'Santé' && i.status === 'open' && (appNow().getTime() - i.at) < 86400000
  ), [d, kid])
  const st = useMemo(() => kid ? statusAt(kid.classId, ns.dayIdx, min, sick && phase === 'live') : null,
    [kid, ns.dayIdx, min, sick, phase])

  if (!kid) return (
    <Screen title="Suivi en direct">
      <EmptyState icon="Radio" title="Aucun enfant associé"
        sub="Demandez à la direction de lier votre compte à votre enfant pour activer le suivi en direct." />
    </Screen>
  )

  const first = kid.name.split(' ')[0]
  const picker = kids.length > 1 && (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 }}>
      {kids.map(k => <Chip key={k.id} label={k.name.split(' ')[0]} color={ACCENT} active={k.id === kid.id} onPress={() => setKidId(k.id)} />)}
    </View>
  )
  const kidHead = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Avatar name={kid.name} color={ACCENT} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '800', color: C.ink, fontSize: 16 }}>{kid.name}</Text>
        <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>{cls?.name} · École primaire</Text>
      </View>
    </View>
  )

  // ── vacances d'été : carte estivale à la place du parcours ──
  if (phase === 'vacances') return (
    <Screen title="Suivi en direct" sub={`C'est les vacances d'été · ${first} profite d'un repos bien mérité.`}>
      {picker}
      <Card>{kidHead}</Card>
      <Card style={{ marginTop: 14, backgroundColor: '#FFF7E8', borderColor: '#F59E0B33' }}>
        <View style={{ alignItems: 'center', paddingVertical: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F59E0B22', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Ic n="Sun" size={32} color="#F59E0B" />
          </View>
          <Text style={{ fontWeight: '800', color: '#B45309', fontSize: 18 }}>Vacances d'été</Text>
          <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
            L'école reprend le <Text style={{ fontWeight: '800', color: C.ink }}>{rentreeLabel()}</Text>.{'\n'}
            Le suivi en direct redémarrera automatiquement à la rentrée · bel été à {first} !
          </Text>
        </View>
      </Card>
    </Screen>
  )

  const area = AREAS[st.place]
  const segLen = Math.max(1, st.seg.end - st.seg.start)
  const done = Math.min(1, Math.max(0, (min - st.seg.start) / segLen))
  const remain = Math.max(0, st.seg.end - min)
  const segs = daySegments(kid.classId, ns.dayIdx)
  const open = segs[0].start, close = segs[segs.length - 1].end
  const day = ns.realWeekday ? DAYS[ns.dayIdx] : 'Lundi (journée type)'

  // ── récap de la journée (une fois l'école finie) ──
  const todayIso = isoOf(appNow())
  const att = (d.attendance?.[kid.classId + '_' + todayIso] || {})[kid.id] || null
  const attB = att ? ATT_BADGE[att] : null
  const evToday = d.evaluations.filter(e => e.classId === kid.classId && isoOf(new Date(e.at)) === todayIso)
    .map(e => ({ id: e.id, subject: e.subject, lesson: e.lesson, score: studentSummary(e, kid.id).score }))
    .filter(x => x.score != null)
  const lessons = segs.filter(s => s.kind === 'class').length

  const pill = liveNow ? { txt: `EN DIRECT · ${fmt(min)}`, bg: '#E5484D' }
    : simulated ? { txt: `Journée type · ${fmt(min)}`, bg: '#F59E0B' }
    : exploring ? { txt: `Aperçu · ${fmt(min)}`, bg: C.muted }
    : phase === 'after' ? { txt: 'Journée terminée', bg: '#8B5CF6' }
    : phase === 'before' ? { txt: `Ouvre à ${fmt(open)}`, bg: '#0BA5D8' }
    : phase === 'weekend' ? { txt: 'Week-end · journée type', bg: C.muted }
    : { txt: `Aperçu · ${fmt(min)}`, bg: C.muted }

  const stops = [
    { kind: 'entree', label: 'Arrivée', sub: `Cours à ${fmt(open)}`, time: open },
    ...segs.map(s => ({ kind: s.kind === 'free' ? 'class' : s.kind, label: stopLabel(s), sub: s.cell?.room, time: s.start })),
    { kind: 'entree', label: 'Sortie', sub: 'Fin des cours', time: close },
  ]
  const curIndex = min < open ? 0 : min >= close ? stops.length - 1
    : (() => { const j = segs.findIndex(s => min >= s.start && min < s.end); return (j < 0 ? segs.length - 1 : j) + 1 })()
  const showCur = liveNow || replay || simulated

  const sub = phase === 'live' ? `Le parcours de ${first}, en ce moment.`
    : phase === 'after' ? `La journée de ${first} est terminée : voici son récapitulatif.`
    : phase === 'before' ? `L'école n'a pas encore ouvert · aperçu de la journée de ${first}.`
    : `Pas d'école aujourd'hui · aperçu d'une journée type de ${first}.`

  return (
    <Screen title="Suivi en direct" sub={sub}>
      {picker}

      {/* ── carte statut : où est l'enfant maintenant ── */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: pill.bg, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 }}>
            {liveNow && <Ic n="Radio" size={11} color="#fff" />}
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>{pill.txt}</Text>
          </View>
          <Text style={{ color: C.muted, fontWeight: '700', fontSize: 12, marginLeft: 'auto' }}>{day}</Text>
        </View>

        {kidHead}

        {(phase === 'live' || replay || simulated) && (
          <View style={{ marginTop: 14, borderRadius: 16, padding: 14, backgroundColor: area.color + '12', borderWidth: simulated ? 2 : 0, borderColor: area.color + '55', borderStyle: simulated ? 'dashed' : 'solid' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ic n="MapPin" size={14} color={area.color} />
              <Text style={{ color: area.color, fontWeight: '800', fontSize: 13, flex: 1 }}>{area.label}</Text>
              {simulated && (
                <View style={{ backgroundColor: '#F59E0B22', borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
                  <Text style={{ color: '#B45309', fontWeight: '800', fontSize: 10 }}>SIMULATION</Text>
                </View>
              )}
            </View>
            <Text style={{ fontWeight: '800', color: C.ink, fontSize: 18, marginTop: 4 }}>{st.title}</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 1 }}>{st.sub}</Text>
            {remain > 0 && st.title !== 'Journée terminée' && st.title !== 'Avant l’école' && (
              <View style={{ marginTop: 10 }}>
                <Bar pct={Math.round(done * 100)} color={area.color} height={7} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ic n="Clock" size={12} color={C.muted} />
                    <Text style={{ color: C.muted, fontSize: 12 }}>Se termine à {fmt(st.seg.end)}</Text>
                  </View>
                  <Text style={{ color: area.color, fontWeight: '800', fontSize: 12 }}>{remain} min restantes</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {phase === 'after' && !exploring && (
          <View style={{ marginTop: 14, gap: 10 }}>
            <View style={{ borderRadius: 16, padding: 14, backgroundColor: '#8B5CF612' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ic n="Moon" size={14} color="#8B5CF6" />
                <Text style={{ color: '#8B5CF6', fontWeight: '800', fontSize: 13 }}>Journée terminée à {fmt(close)}</Text>
              </View>
              <Text style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>{lessons} séances au programme aujourd'hui.</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 }}>
              <Ic n="CalendarCheck" size={15} color={C.muted} />
              <Text style={{ color: C.muted, fontSize: 13, marginLeft: 8, flex: 1 }}>Présence du jour</Text>
              {attB
                ? <View style={{ backgroundColor: attB.color + '1A', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 }}>
                    <Text style={{ color: attB.color, fontWeight: '800', fontSize: 11 }}>{attB.label}</Text>
                  </View>
                : <Text style={{ color: C.muted, fontSize: 12 }}>non pointée</Text>}
            </View>
            <View style={{ borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ic n="ClipboardCheck" size={15} color={C.muted} />
                <Text style={{ color: C.muted, fontSize: 13 }}>Évaluations reçues aujourd'hui</Text>
              </View>
              {evToday.length === 0
                ? <Text style={{ color: C.muted, fontSize: 12 }}>Aucune évaluation aujourd'hui.</Text>
                : evToday.map(e => { const m = mentionFor(e.score); return (
                    <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                      <Text numberOfLines={1} style={{ flex: 1, color: C.ink, fontSize: 13, fontWeight: '600' }}>
                        {e.subject}{e.lesson ? <Text style={{ color: C.muted, fontWeight: '400' }}> {e.lesson}</Text> : null}
                      </Text>
                      <Text style={{ color: m.color, fontWeight: '800', fontSize: 13 }}>{e.score}/100</Text>
                    </View>) })}
            </View>
          </View>
        )}

        {phase === 'before' && !exploring && (
          <View style={{ marginTop: 14, borderRadius: 16, padding: 14, backgroundColor: '#0BA5D812' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ic n="Sun" size={14} color="#0BA5D8" />
              <Text style={{ color: '#0BA5D8', fontWeight: '800', fontSize: 13 }}>L'école ouvre à {fmt(open)}</Text>
            </View>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>Le suivi en direct démarrera automatiquement à l'arrivée de {first}.</Text>
          </View>
        )}

        {phase === 'weekend' && !exploring && (
          <View style={{ marginTop: 14, borderRadius: 16, padding: 14, backgroundColor: C.canvas }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ic n="Sun" size={14} color={C.muted} />
              <Text style={{ color: C.muted, fontWeight: '800', fontSize: 13 }}>Pas d'école aujourd'hui</Text>
            </View>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 3 }}>Bon week-end ! Le suivi reprendra lundi à {fmt(open)}.</Text>
          </View>
        )}
      </Card>

      {/* ── le parcours de la journée ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 10 }}>
        <Text style={{ fontWeight: '800', color: C.ink, fontSize: 16, flex: 1 }}>
          {phase === 'after' ? 'Revoir la journée' : phase === 'live' ? 'Parcours de la journée' : 'Une journée type'}
        </Text>
        {exploring && (
          <Pressable onPress={() => { setMin(defMin); setLiveNow(phase === 'live') }}>
            <Text style={{ color: ACCENT, fontWeight: '800', fontSize: 13 }}>
              {phase === 'live' ? 'Revenir à maintenant' : 'Réinitialiser'}
            </Text>
          </Pressable>
        )}
      </View>
      <Card>
        <Text style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
          Touchez une étape pour voir où en est la journée à ce moment-là.
        </Text>
        {stops.map((s, i) => (
          <Stop key={i} stop={s} isFirst={i === 0} isLast={i === stops.length - 1}
            isCur={showCur && i === curIndex} done={showCur && i < curIndex}
            onPress={() => { setLiveNow(false); setMin(s.time) }} />
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={{ color: C.muted, fontSize: 11 }}>{fmt(open)}</Text>
          <Text style={{ color: C.ink, fontWeight: '800', fontSize: 11 }}>{fmt(min)}</Text>
          <Text style={{ color: C.muted, fontSize: 11 }}>{fmt(close)}</Text>
        </View>
      </Card>
    </Screen>
  )
}
