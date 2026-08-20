// Inscriptions — portage natif de app/src/pages/Admissions.jsx (issue #13 :
// pour une Direction, « Inscriptions » tombait sur « Bientôt sur mobile »).
//
// Les règles du web sont conservées À L'IDENTIQUE, elles vivent dans le cœur
// (core/src/admissions.js) : pas de saut d'étape, pas d'étude sans pièces
// obligatoires, un refus se MOTIVE, et la capacité décide à l'inscription —
// une classe pleine bascule en liste d'attente, jamais de place inventée.
//
// Seule différence assumée : les PIÈCES se consultent ici mais se JOIGNENT
// depuis le web (le téléphone n'a pas le composant Attach). On le dit à l'écran
// plutôt que de cocher une case sans fichier derrière.
import { useState } from 'react'
import { View, Text, Pressable, ScrollView, Modal, Linking } from 'react-native'
import {
  applications, appById, STAGES, docsFor, docsComplete, hasDoc, advance,
  openClasses, enrol, summary, stageLabel,
} from '@core/admissions.js'
import { labelOf } from '@core/levels.js'
import { ROLE } from '@core/theme.js'
import { Ic } from '../icons.js'
import { Screen, Card, Chip, Badge, Avatar, Row, Btn, Input, EmptyState, Tile, C } from '../components.js'

// Mêmes teintes que STATUS côté web (ui.jsx) ; « info » = l'accent bleu du web.
const TONE = { ok: '#12946F', warn: '#C97C1E', danger: '#DC4B54', info: '#2563EB' }
const toneOf = stage => TONE[STAGES[stage]?.tone] || C.muted

const p2 = n => String(n).padStart(2, '0')
const dmy = at => { const d = new Date(at); return isNaN(d) ? '·' : `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}` }
const ageOf = dob => {
  const d = new Date(dob); if (isNaN(d)) return null
  const n = new Date(); let a = n.getFullYear() - d.getFullYear()
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--
  return a
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
const Info = ({ label, value, onPress }) => (
  <View style={{ width: '50%', paddingRight: 10, marginBottom: 10 }}>
    <Text style={{ fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase' }}>{label}</Text>
    <Pressable onPress={onPress} disabled={!onPress}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: onPress ? '#2563EB' : C.ink, marginTop: 2 }}>{value || '·'}</Text>
    </Pressable>
  </View>
)

export default function Admissions({ user }) {
  const accent = ROLE[user.role]?.color || '#7539E4'
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)
  const [filter, setFilter] = useState('actives')
  const [open, setOpen] = useState(null)          // id de la candidature ouverte
  const [refusing, setRefusing] = useState(null)  // id en cours de refus
  const [refuseNote, setRefuseNote] = useState('')
  const [flash, setFlash] = useState(null)        // { text, color } — retour court, sans toast natif
  const say = (text, color = TONE.ok) => { setFlash({ text, color }); setTimeout(() => setFlash(null), 3500) }

  const s = summary()
  const all = applications()
  const rows = all.filter(a =>
    filter === 'toutes' ? true
    : filter === 'actives' ? !STAGES[a.stage]?.terminal
    : a.stage === filter)

  const go = (id, stage, note) => {
    if (stage === 'refuse' && !note) { setRefusing(id); setRefuseNote(''); return }
    const r = advance(id, stage, user?.name || 'Administration', note || '')
    if (r.error) return say(r.error, TONE.danger)
    say(`Candidature : ${stageLabel(stage)}`)
    refresh()
  }

  const a = open ? appById(open) : null
  const tiles = [
    { k: 'Candidatures', v: s.total, i: 'Inbox', c: accent },
    { k: 'À traiter', v: s.nouvelle + s.pieces + s.examen, i: 'Clock', c: TONE.warn },
    { k: 'Acceptées', v: s.accepte, i: 'Check', c: TONE.ok },
    { k: 'Liste d’attente', v: s.attente, i: 'Hourglass', c: TONE.warn },
    { k: 'Inscrits', v: s.inscrit, i: 'UserCheck', c: TONE.ok },
  ]
  const FILTERS = [['actives', 'En cours'], ['toutes', 'Toutes'], ['attente', stageLabel('attente')], ['inscrit', stageLabel('inscrit')], ['refuse', stageLabel('refuse')]]

  return (
    <Screen title="Inscriptions" sub="De la candidature en ligne à l’élève inscrit : sans jamais ressaisir.">
      {flash && (
        <View style={{ backgroundColor: flash.color + '1A', borderRadius: 12, padding: 10, marginBottom: 12 }}>
          <Text style={{ color: flash.color, fontWeight: '700', fontSize: 13 }}>{flash.text}</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        {tiles.map(x => <Tile key={x.k} icon={x.i} label={x.k} value={x.v} color={x.c} />)}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ paddingRight: 8 }}>
        {FILTERS.map(([f, label]) => (
          <Chip key={f} label={label} color={accent} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon="Inbox" title="Aucune candidature ici."
            sub="Les candidatures déposées en ligne par les parents apparaissent dans cette liste." />
        </Card>
      ) : (
        <Card style={{ paddingVertical: 4 }}>
          {rows.map(x => {
            const st = STAGES[x.stage]
            const ready = docsComplete(x)
            return (
              <Row key={x.id}
                avatar={<Avatar name={x.childName} color={toneOf(x.stage)} size={40} />}
                title={x.childName}
                sub={`${labelOf(x.level)} · ${x.parentName} · ${dmy(x.createdAt)}`}
                right={
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge label={st?.label || x.stage} color={toneOf(x.stage)} />
                    {!st?.terminal && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ic n="Paperclip" size={11} color={ready ? TONE.ok : TONE.warn} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: ready ? TONE.ok : TONE.warn }}>{ready ? 'complètes' : 'incomplètes'}</Text>
                      </View>
                    )}
                  </View>
                }
                onPress={() => setOpen(x.id)}
              />
            )
          })}
        </Card>
      )}

      {/* Le dossier COMPLET : identité, contact, pièces, inscription, décision, historique. */}
      {a && (
        <Sheet title={`Dossier · ${a.childName}`} onClose={() => setOpen(null)}
          footer={!STAGES[a.stage]?.terminal && (
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              {STAGES[a.stage].next.filter(n => n !== 'inscrit').map(n => (
                <Btn key={n} small label={stageLabel(n)} color={n === 'refuse' ? TONE.danger : accent}
                  kind={n === 'refuse' ? 'ghost' : 'solid'} onPress={() => go(a.id, n)} />
              ))}
            </View>
          )}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge label={STAGES[a.stage]?.label || a.stage} color={toneOf(a.stage)} />
            <Text style={{ fontSize: 12, color: C.muted }}>déposée le {dmy(a.createdAt)}</Text>
            <Text style={{ marginLeft: 'auto', fontSize: 11, fontWeight: '800', color: C.ink, borderWidth: 1, borderColor: C.line, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
              Réf. {String(a.id).toUpperCase()}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 }}>
            <Info label="Enfant" value={a.childName} />
            <Info label="Naissance" value={a.dob ? `${a.dob}${ageOf(a.dob) != null ? ` · ${ageOf(a.dob)} ans` : ''}` : '·'} />
            <Info label="Niveau demandé" value={labelOf(a.level)} />
            <Info label="Parent / tuteur" value={a.parentName} />
            <Info label="Téléphone" value={a.parentPhone} onPress={a.parentPhone ? () => Linking.openURL(`tel:${a.parentPhone}`) : null} />
            <Info label="E-mail" value={a.parentEmail} onPress={a.parentEmail ? () => Linking.openURL(`mailto:${a.parentEmail}`) : null} />
          </View>
          {!!a.note && (
            <View style={{ borderWidth: 1, borderColor: C.line, backgroundColor: C.canvas, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>Mot du parent</Text>
              <Text style={{ fontSize: 14, color: C.ink }}>{a.note}</Text>
            </View>
          )}

          <Lbl>Pièces</Lbl>
          <Text style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
            Ce que le parent a joint. Les pièces s’ajoutent depuis le web — ici on vérifie, on ne coche pas une case sans fichier.
          </Text>
          {docsFor(a.level).map(d => {
            const ok = hasDoc(a, d.key)
            return (
              <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <Ic n={ok ? 'CheckCircle2' : d.required ? 'AlertCircle' : 'Circle'} size={16} color={ok ? TONE.ok : d.required ? TONE.warn : C.muted} />
                <Text style={{ flex: 1, fontSize: 13, color: C.ink, fontWeight: ok ? '600' : '400' }}>{d.label}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: ok ? TONE.ok : d.required ? TONE.warn : C.muted }}>
                  {ok ? 'reçue' : d.required ? 'manque' : 'facultative'}
                </Text>
              </View>
            )
          })}

          {/* Inscrire : la capacité décide. Une classe pleine bascule en attente. */}
          {['accepte', 'attente'].includes(a.stage) && (
            <>
              <Lbl>Inscrire dans une classe</Lbl>
              <Text style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                La place est vérifiée au moment de l’inscription. Si la classe est pleine, la candidature passe en liste d’attente : nous ne promettons pas une place qui n’existe pas.
              </Text>
              {openClasses(a.level).map(c => (
                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6 }}>
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: C.ink }}>{c.name}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: c.free ? TONE.ok : TONE.danger }}>{c.taken}/{c.capacity}</Text>
                  <Btn small label={c.free ? 'Inscrire' : 'Pleine'} color={accent} disabled={!c.free}
                    onPress={() => {
                      const r = enrol(a.id, c.id, user?.name || 'Administration')
                      if (r.error) { say(r.error, TONE.danger); refresh(); return }
                      say(`${a.childName} est inscrit en ${c.name}.`)
                      setOpen(null); refresh()
                    }} />
                </View>
              ))}
              {!openClasses(a.level).length && <Text style={{ fontSize: 13, color: C.muted }}>Aucune classe pour ce niveau.</Text>}
            </>
          )}

          <Lbl>Historique</Lbl>
          {(a.history || []).map((h, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
              <Ic n="Dot" size={14} color={C.muted} />
              <Text style={{ fontSize: 12, color: C.muted, flex: 1 }}>
                <Text style={{ fontWeight: '800', color: C.ink }}>{stageLabel(h.stage)}</Text> {dmy(h.at)} · {h.by}{h.note ? ` · ${h.note}` : ''}
              </Text>
            </View>
          ))}

          {/* Emails au candidat : un prospect sans compte n'est joignable QUE par email. */}
          <Lbl>Emails au candidat</Lbl>
          {!a.parentEmail ? (
            <Text style={{ fontSize: 12, color: C.muted }}>Ce candidat n’a pas laissé d’email : suivi par téléphone.</Text>
          ) : !(a.emails || []).length ? (
            <Text style={{ fontSize: 12, color: C.muted }}>Aucun email pour l’instant.</Text>
          ) : (
            <>
              {a.emails.map(e => (
                <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
                  <Ic n={e.status === 'envoyé' ? 'MailCheck' : e.status === 'échec' ? 'MailX' : 'MailPlus'} size={14} color={C.muted} />
                  <Text style={{ fontSize: 12, color: C.muted, flex: 1 }} numberOfLines={1}>
                    <Text style={{ fontWeight: '800', color: C.ink }}>{stageLabel(e.stage)}</Text> {dmy(e.at)} · {e.subject}
                  </Text>
                  <Badge label={e.status} color={e.status === 'envoyé' ? TONE.ok : e.status === 'échec' ? TONE.danger : TONE.info} />
                </View>
              ))}
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                Envoyés à <Text style={{ fontWeight: '800' }}>{a.parentEmail}</Text>
                {a.emails.some(e => e.status === 'préparé') ? ' · « préparé » = prêt à partir dès qu’un serveur mail est branché.' : ''}
              </Text>
            </>
          )}
          <View style={{ height: 8 }} />
        </Sheet>
      )}

      {/* QA : un refus se confirme ET se motive — c'est ce qu'on répondra à la famille. */}
      {refusing && (
        <Sheet title="Refuser cette candidature ?" onClose={() => setRefusing(null)}
          footer={
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Btn small label="Annuler" kind="ghost" color={C.muted} onPress={() => setRefusing(null)} />
              <Btn small label="Refuser" color={TONE.danger} disabled={!refuseNote.trim()}
                onPress={() => { const id = refusing; const n = refuseNote.trim(); setRefusing(null); go(id, 'refuse', n) }} />
            </View>
          }>
          <Text style={{ fontSize: 14, color: C.muted, marginBottom: 10 }}>La famille sera informée. Un refus se motive : c’est ce qu’on lui répondra.</Text>
          <Lbl>Motif (obligatoire)</Lbl>
          <Input value={refuseNote} onChangeText={setRefuseNote} multiline numberOfLines={3}
            placeholder="Ex. : niveau complet pour cette année, dossier hors secteur…" style={{ minHeight: 84, textAlignVertical: 'top' }} />
          <View style={{ height: 8 }} />
        </Sheet>
      )}
    </Screen>
  )
}
