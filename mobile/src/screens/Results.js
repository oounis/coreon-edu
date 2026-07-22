// « Suivi élèves » — port natif de app/src/pages/Results.jsx pour la direction.
//
// Adaptation téléphone : pas d'onglets de période ni de graphes recharts — les
// moyennes viennent de bulletinFor() (toute l'année, les mêmes chiffres que le
// bulletin), les courbes deviennent des barres et des tuiles. Tap sur un élève
// → son bulletin complet ('~bulletin').
import { useMemo, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { db, classById } from '@core/db.js'
import { bulletinFor } from '@core/results.js'
import { BUCKETS } from '@core/data.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Section, Chip, Badge, Avatar, Tile, Input, EmptyState, Bar, C, tap } from '../components.js'

// Même sémantique de tendance que le web (Results.jsx TrendArrow / STATUS)
const T_OK = '#12946F', T_BAD = '#DC4B54', T_FLAT = '#94A3B8'
// Médailles du top 3 — mêmes teintes que le web (RankRow)
const MEDAL_BG = ['#FFF4DD', '#EEF1F6', '#FCEEE2']
const MEDAL_INK = ['#E59A12', '#64748B', '#B45309']

function Trend({ t }) {
  const up = t > 2, down = t < -2
  const color = up ? T_OK : down ? T_BAD : T_FLAT
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Ic n={up ? 'TrendingUp' : down ? 'TrendingDown' : 'Minus'} size={13} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '800', color }}>{up ? `+${t}` : down ? `${t}` : 'stable'}</Text>
    </View>
  )
}

// Ligne de classement — rang (médaille pour le top 3), élève, tendance, moyenne.
function RankRow({ x, i, accent, onPress }) {
  const medal = i < 3
  return (
    <Pressable onPress={() => { tap(); onPress() }} style={({ pressed }) => ({
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: C.line, opacity: pressed ? 0.7 : 1,
    })}>
      <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: medal ? MEDAL_BG[i] : '#EEF1F6' }}>
        <Text style={{ fontSize: 12, fontWeight: '800', color: medal ? MEDAL_INK[i] : '#64748B' }}>{i + 1}</Text>
      </View>
      <Avatar name={x.s.name} color={accent} size={34} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontWeight: '700', color: C.ink, fontSize: 14 }}>{x.s.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
          <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12 }}>
            {classById(x.s.classId)?.name || '·'} · {x.count} évaluation{x.count > 1 ? 's' : ''}
          </Text>
          <Trend t={x.trend} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <Text style={{ fontWeight: '800', fontSize: 15, color: x.b.mention.color }}>{x.b.overall}/100</Text>
        <Badge label={x.b.mention.label} color={x.b.mention.color} />
      </View>
    </Pressable>
  )
}

export default function Results({ user, params, nav }) {
  const d = db()
  const accent = (ROLE[user.role] || ROLE.admin).color
  const [classId, setClassId] = useState('all')
  const [q, setQ] = useState('')

  // Un bulletin par élève évalué — mêmes moyennes/mentions que l'écran Bulletin.
  const all = useMemo(() => d.students.map(s => {
    const b = bulletinFor(d, s.id)
    if (b.overall == null) return null
    const arr = b.sessions.map(x => x.score)
    const half = Math.floor(arr.length / 2)
    // même calcul de tendance que le web : 2e moitié des notes vs 1re moitié
    const trend = arr.length < 3 ? 0
      : Math.round(arr.slice(half).reduce((a, x) => a + x, 0) / (arr.length - half) - arr.slice(0, half).reduce((a, x) => a + x, 0) / half)
    return { s, b, trend, count: arr.length }
  }).filter(Boolean), [d])

  const scoped = all.filter(x => classId === 'all' || x.s.classId === classId)
  const ranked = [...scoped].sort((a, b) => b.b.overall - a.b.overall || b.count - a.count)
  const evals = d.evaluations.filter(e => classId === 'all' || e.classId === classId)
  const overall = ranked.length ? Math.round(ranked.reduce((s, x) => s + x.b.overall, 0) / ranked.length) : null
  const struggling = ranked.filter(x => x.b.overall < 40).length

  // Répartition des niveaux, toutes réponses confondues (comme la barre du web)
  const dist = Object.fromEntries(BUCKETS.map(bk => [bk.key, 0]))
  evals.forEach(e => Object.values(e.placements || {}).forEach(p => Object.values(p || {}).forEach(k => { if (k in dist) dist[k]++ })))
  const distTotal = Object.values(dist).reduce((s, x) => s + x, 0)

  // Moyenne par classe (uniquement en vue « toute l'école », comme le web)
  const classAvgs = d.classes.map(c => {
    const list = all.filter(x => x.s.classId === c.id)
    return { c, n: list.length, avg: list.length ? Math.round(list.reduce((s, x) => s + x.b.overall, 0) / list.length) : null }
  }).filter(x => x.avg != null).sort((a, b) => b.avg - a.avg)

  const best = [...ranked].sort((a, b) => b.trend - a.trend)[0]
  const query = q.trim().toLowerCase()
  const rows = ranked.filter(x => !query || x.s.name.toLowerCase().includes(query))

  return (
    <Screen title="Suivi élèves" sub="Les élèves à féliciter et ceux à accompagner.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginBottom: 14 }}>
        <Chip label="Toutes les classes" color={accent} active={classId === 'all'} onPress={() => setClassId('all')} />
        {d.classes.map(c => (
          <Chip key={c.id} label={c.name} color={accent} active={classId === c.id} onPress={() => setClassId(c.id)} />
        ))}
      </View>

      {ranked.length === 0 ? (
        <Card>
          <EmptyState icon="BarChart3" title="Aucune évaluation"
            sub="Choisissez une autre classe, ou attendez les premières évaluations des enseignants." />
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Tile icon="ClipboardCheck" color={accent} label="Évaluations" value={String(evals.length)} />
            <Tile icon="Gauge" color="#2BD9A8" label="Moyenne générale" value={overall != null ? `${overall}/100` : '·'} />
            <Tile icon="Users" color="#22D3EE" label="Élèves évalués" value={String(ranked.length)} />
            <Tile icon="LifeBuoy" color="#FF6B81" label="En difficulté" sub="moy. < 40" value={String(struggling)} />
          </View>

          {!!best && best.trend > 2 && (
            <Card style={{ marginTop: 14 }} onPress={() => nav.navigate('~bulletin', { childId: best.s.id })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: T_OK + '1A' }}>
                  <Ic n="TrendingUp" size={18} color={T_OK} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontWeight: '800', color: C.ink, fontSize: 14 }}>Meilleure progression</Text>
                  <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>
                    {best.s.name} · {classById(best.s.classId)?.name || '·'}
                  </Text>
                </View>
                <Text style={{ fontWeight: '800', fontSize: 16, color: T_OK }}>+{best.trend} pts</Text>
              </View>
            </Card>
          )}

          <Section title="Répartition des niveaux">
            <Card>
              {BUCKETS.map(bk => (
                <View key={bk.key} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ic n={bk.icon} size={13} color={bk.color} />
                    <Text style={{ flex: 1, color: C.ink, fontSize: 13, fontWeight: '600' }}>{bk.label}</Text>
                    <Text style={{ color: bk.color, fontSize: 13, fontWeight: '800' }}>{dist[bk.key]}</Text>
                  </View>
                  <Bar pct={distTotal ? (dist[bk.key] / distTotal) * 100 : 0} color={bk.color} />
                </View>
              ))}
              <Text style={{ color: C.muted, fontSize: 11 }}>Toutes réponses confondues · {distTotal} placements</Text>
            </Card>
          </Section>

          {classId === 'all' && classAvgs.length > 1 && (
            <Section title="Moyenne par classe">
              <Card>
                {classAvgs.map(({ c, n, avg }) => (
                  <Pressable key={c.id} onPress={() => { tap(); setClassId(c.id) }} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: C.ink, fontSize: 13, fontWeight: '700' }}>{c.name} <Text style={{ color: C.muted, fontWeight: '400', fontSize: 12 }}> {n} élèves</Text></Text>
                      <Text style={{ color: accent, fontSize: 13, fontWeight: '800' }}>{avg}/100</Text>
                    </View>
                    <Bar pct={avg} color={accent} />
                  </Pressable>
                ))}
              </Card>
            </Section>
          )}

          <Section title="Classement des élèves">
            <Input value={q} onChangeText={setQ} placeholder="Rechercher un élève…" style={{ marginBottom: 10 }} />
            <Card>
              {rows.length === 0 ? (
                <EmptyState icon="Search" title="Aucun élève ne correspond" sub="Essayez un autre nom." />
              ) : rows.map((x, i) => (
                <RankRow key={x.s.id} x={x} i={i} accent={accent}
                  onPress={() => nav.navigate('~bulletin', { childId: x.s.id })} />
              ))}
            </Card>
          </Section>
        </>
      )}
    </Screen>
  )
}
