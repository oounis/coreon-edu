// Bulletin scolaire de l'enfant — port natif du modal web
// (app/src/components/Bulletin.jsx) + des blocs « forces / à renforcer » du
// tableau de bord parent (Dashboard.jsx). Tous les chiffres viennent de core/.
import { View, Text } from 'react-native'
import { db, studentById, classById, settings } from '@core/db.js'
import { bulletinFor, mentionFor, strengthsWeaknesses } from '@core/results.js'
import { frDateLabel } from '@core/clock.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Section, Avatar, Bar, EmptyState, C } from '../components.js'

const ACCENT = ROLE.parent.color
const OK = '#10B981', WARN = '#F59E0B'

// Petite boîte de synthèse (moyenne, mention, présence).
const Box = ({ label, value, color = C.ink }) => (
  <View style={{ flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', backgroundColor: '#fff' }}>
    <Text numberOfLines={1} style={{ fontWeight: '800', fontSize: 17, color }}>{value}</Text>
    <Text numberOfLines={1} style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>{label}</Text>
  </View>
)

// Ligne « leçon · matière · moyenne » des forces / points à renforcer.
const LessonLine = ({ l, color }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: color + '10', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 11, marginBottom: 6 }}>
    <Text numberOfLines={1} style={{ flex: 1, color: C.ink, fontSize: 13, fontWeight: '600' }}>
      {l.lesson} <Text style={{ color: C.muted, fontSize: 11, fontWeight: '400' }}> {l.subject}</Text>
    </Text>
    <Text style={{ color, fontWeight: '800', fontSize: 13 }}>{l.avg}/100</Text>
  </View>
)

export default function Bulletin({ user, params }) {
  const d = db()
  const kids = (user.childIds || []).map(studentById).filter(Boolean)
  const child = (params?.childId && studentById(params.childId)) || kids[0] || null

  if (!child) return (
    <Screen title="Bulletin scolaire">
      <EmptyState icon="FileText" title="Aucun enfant associé"
        sub="Demandez à la direction de lier votre compte à votre enfant pour consulter son bulletin." />
    </Screen>
  )

  const cls = classById(child.classId)
  const cfg = settings()
  const b = bulletinFor(d, child.id)
  const childEvals = d.evaluations.filter(e => e.classId === child.classId)
  const sw = strengthsWeaknesses(childEvals, child.id)
  const recent = (b.sessions || []).slice(-6).reverse()   // les plus récentes d'abord
  const first = child.name.split(' ')[0]

  // Distinctions dédupliquées avec leur nombre (« Élève du jour ×3 »).
  const badgeCounts = Object.values((b.badges || []).reduce((acc, bd) => {
    const k = bd.key || bd.label
    acc[k] = acc[k] ? { ...acc[k], n: acc[k].n + 1 } : { ...bd, n: 1 }
    return acc
  }, {}))

  return (
    <Screen title="Bulletin scolaire" sub={`${cfg.schoolName} · Année ${cfg.year}`}>
      {/* ── identité élève ── */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={child.name} color={ACCENT} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: C.ink, fontSize: 17 }}>{child.name}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>
              {cls?.name || 'Classe'}{cls?.cycle ? ` · ${cls.cycle}` : ''}
            </Text>
          </View>
          <View style={{ backgroundColor: b.mention.color + '1A', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 11 }}>
            <Text style={{ color: b.mention.color, fontWeight: '800', fontSize: 12 }}>{b.mention.label}</Text>
          </View>
        </View>

        {/* ── synthèse ── */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <Box label="Moyenne générale" value={b.overall != null ? `${b.overall}/100` : '·'} color={b.mention.color} />
          <Box label="Mention" value={b.mention.label} color={b.mention.color} />
          <Box label="Présence" value={b.attRate != null ? `${b.attRate}%` : '·'} />
        </View>
      </Card>

      {/* ── moyennes par matière ── */}
      <Section title="Résultats par matière">
        <Card>
          {b.subjects.length === 0
            ? <EmptyState icon="Star" title="Aucune note disponible" sub={`Les moyennes de ${first} apparaîtront ici après les premières évaluations.`} />
            : b.subjects.map((s, i) => { const m = mentionFor(s.avg); return (
                <View key={s.subject} style={{ marginBottom: i === b.subjects.length - 1 ? 0 : 13 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                    <Text numberOfLines={1} style={{ flex: 1, color: C.ink, fontSize: 13, fontWeight: '700' }}>{s.subject}</Text>
                    <Text style={{ color: C.muted, fontSize: 11, marginRight: 8 }}>{s.count} éval.</Text>
                    <Text style={{ color: m.color, fontWeight: '800', fontSize: 13 }}>{s.avg}/100</Text>
                  </View>
                  <Bar pct={s.avg} color={m.color} />
                </View>) })}
        </Card>
      </Section>

      {/* ── forces / à renforcer ── */}
      {(sw.strong.length > 0 || sw.weak.length > 0) && (
        <Section title={`Où en est ${first} ?`}>
          <Card>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
              Par leçon, d'après les évaluations des enseignants : pour l'aider là où ça compte.
            </Text>
            <Text style={{ color: OK, fontWeight: '800', fontSize: 11, letterSpacing: 0.5, marginBottom: 6 }}>POINTS FORTS</Text>
            {sw.strong.length === 0
              ? <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>Encore un peu tôt : les points forts apparaîtront ici.</Text>
              : sw.strong.map(l => <LessonLine key={l.subject + l.lesson} l={l} color={OK} />)}
            <Text style={{ color: WARN, fontWeight: '800', fontSize: 11, letterSpacing: 0.5, marginTop: 8, marginBottom: 6 }}>À RENFORCER</Text>
            {sw.weak.length === 0
              ? <Text style={{ color: C.muted, fontSize: 12 }}>Rien à signaler · tout est au vert !</Text>
              : sw.weak.map(l => <LessonLine key={l.subject + l.lesson} l={l} color={WARN} />)}
          </Card>
        </Section>
      )}

      {/* ── distinctions ── */}
      {badgeCounts.length > 0 && (
        <Section title="Distinctions">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {badgeCounts.map(bd => (
              <View key={bd.key || bd.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 }}>
                <Ic n={bd.icon || 'Award'} size={14} color={ACCENT} />
                <Text style={{ color: C.ink, fontWeight: '700', fontSize: 12 }}>
                  {bd.label}{bd.n > 1 ? ` ×${bd.n}` : ''}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* ── dernières évaluations ── */}
      <Section title="Dernières évaluations">
        <Card>
          {recent.length === 0
            ? <EmptyState icon="ClipboardCheck" title="Aucune évaluation" sub={`Les évaluations de ${first} apparaîtront ici.`} />
            : recent.map((s, i) => { const m = mentionFor(s.score); return (
                <View key={s.at + s.subject} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: i === recent.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontWeight: '700', color: C.ink, fontSize: 14 }}>{s.subject}</Text>
                    <Text numberOfLines={1} style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>
                      {frDateLabel(new Date(s.at))}{s.teacher ? ` · ${s.teacher}` : ''}
                    </Text>
                    {!!s.note && <Text numberOfLines={2} style={{ color: C.muted, fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>« {s.note} »</Text>}
                    {!!s.badge && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Ic n={s.badge.icon || 'Award'} size={12} color={ACCENT} />
                        <Text style={{ color: ACCENT, fontWeight: '700', fontSize: 11 }}>{s.badge.label}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: m.color, fontWeight: '800', fontSize: 15 }}>{s.score}/100</Text>
                    <Text style={{ color: m.color, fontWeight: '700', fontSize: 10 }}>{m.label}</Text>
                  </View>
                </View>) })}
        </Card>
      </Section>

      {/* ── assiduité ── */}
      <Section title="Assiduité">
        <Card>
          {b.attTotal === 0
            ? <Text style={{ color: C.muted, fontSize: 13 }}>Aucun relevé de présence disponible.</Text>
            : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Box label="Présences" value={String(b.att.present)} color={OK} />
                <Box label="Absences" value={String(b.att.absent)} color="#E5484D" />
                <Box label="Retards" value={String(b.att.late)} color={WARN} />
              </View>
            )}
        </Card>
      </Section>

      <Text style={{ color: C.muted, fontSize: 11, textAlign: 'center', marginTop: 18 }}>
        Document généré par Coreon Edu : bulletin indicatif, sans valeur officielle dans cette démo.
      </Text>
    </Screen>
  )
}
