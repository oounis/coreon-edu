// Demandes & validations — portage natif de app/src/pages/Requests.jsx.
// La règle cardinale du web est conservée à l'identique : NUL NE VALIDE SA
// PROPRE DEMANDE. Le rôle du demandeur est retiré de la chaîne à la création,
// et canDecide exige r.by !== u.id à la décision. Mutations et notifications
// copiées du web ; seule la saisie devient « à puces » (types, options, dates).
import { useReducer, useState } from 'react'
import { View, Text, Pressable, ScrollView, Modal } from 'react-native'
import { db, mutate, uid, userById, studentById } from '@core/db.js'
import { notify } from '@core/notify.js'
import { ROLE } from '@core/theme.js'
import { REQUEST_DEFS, typesForRole } from '@core/tunisia.js'
import { now as appNow, isoOf } from '@core/clock.js'
import { Ic } from '../icons.js'
import { Screen, Card, Section, Chip, Badge, Btn, Input, EmptyState, C } from '../components.js'

// Mêmes teintes que STATUS côté web (ui.jsx).
const OK = '#12946F', WARN = '#C97C1E', DANGER = '#DC4B54', NEUTRAL = '#94A3B8'
const ST_FR = { pending: ['En attente', WARN], approved: ['Approuvé', OK], rejected: ['Rejeté', DANGER] }
const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '16:00', '17:00']

const defaults = type => { const o = {}; (REQUEST_DEFS[type]?.fields || []).forEach(f => { o[f.k] = f.t === 'checkbox' ? false : (f.def || '') }); return o }
const fieldVal = (r, f) => {
  const v = r.fields?.[f.k]
  if (v === '' || v == null || v === false) return null
  if (f.t === 'checkbox') return 'Oui'
  if (f.t === 'child') return studentById(v)?.name || v
  return String(v)
}

// Dates en français sans date-fns (interdit côté natif — cf. core/clock.js).
const J3 = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const M3 = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const fmtShort = iso => { const d = new Date(iso + 'T00:00:00'); return `${J3[d.getDay()]} ${d.getDate()} ${M3[d.getMonth()]}` }
const p2 = n => String(n).padStart(2, '0')
const dmy = at => { const d = new Date(at); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}` }
const dmyhm = at => { const d = new Date(at); return `${dmy(at)} ${p2(d.getHours())}:${p2(d.getMinutes())}` }
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
const Err = ({ msg }) => msg ? <Text style={{ color: DANGER, fontWeight: '700', fontSize: 12, marginBottom: 8 }}>{msg}</Text> : null

// Le circuit de validation, coloré comme le web : fait / rejeté / en cours / à venir.
function ChainRow({ r }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 6, marginTop: 8 }}>
      {r.chain.map((role, i) => {
        const ap = r.approvals[i]; const done = ap?.decision === 'approved', rej = ap?.decision === 'rejected'
        const c = rej ? DANGER : done ? OK : (i === r.currentLevel && r.status === 'pending') ? WARN : NEUTRAL
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginRight: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c + '22', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 }}>
              {done && <Ic n="Check" size={11} color={c} />}
              {rej && <Ic n="X" size={11} color={c} />}
              <Text style={{ color: c, fontWeight: '800', fontSize: 11 }}>{ROLE[role]?.label}</Text>
            </View>
            {i < r.chain.length - 1 && <Ic n="ChevronRight" size={12} color={C.muted} />}
          </View>
        )
      })}
    </View>
  )
}

// Saisie d'un champ de REQUEST_DEFS : chips partout où c'est possible.
function FieldInput({ f, vals, setVals, accent }) {
  const v = vals[f.k]
  const set = x => setVals({ ...vals, [f.k]: x })
  const dates = [...Array(10)].map((_, i) => isoOf(new Date(appNow().getTime() + i * 86400000)))
  if (f.t === 'attach') return (
    <Text style={{ fontSize: 12, color: C.muted, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 11 }}>
      Pièce jointe : à déposer depuis l'application web.
    </Text>
  )
  if (f.t === 'checkbox') return (
    <Pressable onPress={() => set(!v)} style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-start', backgroundColor: v ? accent + '12' : '#fff', borderWidth: 1, borderColor: v ? accent : C.line, borderRadius: 12, padding: 11 }}>
      <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: v ? accent : C.line, backgroundColor: v ? accent : '#fff', alignItems: 'center', justifyContent: 'center' }}>
        {!!v && <Ic n="Check" size={13} color="#fff" />}
      </View>
      <Text style={{ flex: 1, fontSize: 13, color: C.ink }}>{f.l}</Text>
    </Pressable>
  )
  if (f.t === 'select') return <Wrap>{f.o.map(o => <Chip key={o} label={o} color={accent} active={v === o} onPress={() => set(o)} />)}</Wrap>
  if (f.t === 'child') {
    return <Wrap>{(f.opts || []).map(c => <Chip key={c.id} label={c.name} color={accent} active={v === c.id} onPress={() => set(c.id)} />)}</Wrap>
  }
  if (f.t === 'date') return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {dates.map(iso => <Chip key={iso} label={fmtShort(iso)} color={accent} active={v === iso} onPress={() => set(iso)} />)}
    </ScrollView>
  )
  if (f.t === 'time') return <Wrap>{TIMES.map(t => <Chip key={t} label={t} color={accent} active={v === t} onPress={() => set(t)} />)}</Wrap>
  if (f.t === 'number') return <Input value={String(v || '')} onChangeText={set} keyboardType="numeric" placeholder="0" />
  if (f.t === 'textarea') return <Input value={v || ''} onChangeText={set} multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top' }} />
  return <Input value={v || ''} onChangeText={set} />
}

export default function Requests({ user, params, nav }) {
  const u = user
  const [, force] = useReducer(x => x + 1, 0)
  const accent = (ROLE[u.role] || ROLE.admin).color
  const myTypes = typesForRole(u.role); const canRaise = myTypes.length > 0

  const [open, setOpen] = useState(false)
  const [view, setView] = useState(null)          // id de la demande examinée
  const [type, setType] = useState(myTypes[0] || '')
  const [vals, setVals] = useState(() => defaults(myTypes[0]))
  const [comment, setComment] = useState('')
  const [err, setErr] = useState('')

  const d = db()
  const mine = d.requests.filter(r => r.by === u.id)
  // Nul ne valide sa propre demande : même filtre que le web (r.by !== u.id).
  const toDecide = d.requests.filter(r => r.status === 'pending' && r.chain[r.currentLevel] === u.role && r.by !== u.id)
  const def = REQUEST_DEFS[type] || { fields: [] }
  const setType2 = t => { setType(t); setVals(defaults(t)); setErr('') }
  const childOptions = (u.childIds || []).map(id => studentById(id)).filter(Boolean)
  const canDecideR = r => r && r.status === 'pending' && r.chain[r.currentLevel] === u.role && r.by !== u.id

  const submit = () => {
    for (const f of def.fields) { if (f.req && !vals[f.k]) return setErr(`Champ requis : ${f.l}`) }
    const id = uid('req')
    // On retire de la chaîne le niveau correspondant au rôle du demandeur : il ne
    // peut pas être son propre approbateur. S'il ne reste personne, la demande
    // remonte à la direction. (Copié du web à l'identique.)
    const chain = def.chain.filter(role => role !== u.role)
    const finalChain = chain.length ? chain : ['schooladmin']
    mutate(db => { db.requests.unshift({ id, at: Date.now(), by: u.id, byName: u.name, type, fields: vals, chain: finalChain, currentLevel: 0, approvals: [], status: 'pending' }) })
    notify({ role: finalChain[0], kind: 'request', actor: u.name, title: `nouvelle demande : ${type}`, body: def.fields[0] ? `${def.fields[0].l}: ${vals[def.fields[0].k]}` : '', link: '/app/requests' })
    setOpen(false); setType2(myTypes[0]); force()
  }

  const act = (r, decision) => {
    const fresh = db().requests.find(x => x.id === r.id)
    if (!canDecideR(fresh)) { setView(null); setComment(''); return }
    mutate(db => {
      const req = db.requests.find(x => x.id === r.id)
      req.approvals.push({ role: u.role, by: u.name, decision, comment: comment.trim(), at: Date.now() })
      if (decision === 'rejected') req.status = 'rejected'
      else { req.currentLevel++; if (req.currentLevel >= req.chain.length) req.status = 'approved' }
    })
    const req = db().requests.find(x => x.id === r.id)
    if (decision === 'rejected') notify({ to: r.by, kind: 'request', actor: u.name, title: 'demande rejetée', body: `${r.type} · ${comment || 'sans motif'}`, link: '/app/requests' })
    else if (req.status === 'approved') notify({ to: r.by, kind: 'request', actor: 'Administration', title: 'demande approuvée', body: `${r.type} · validée${REQUEST_DEFS[r.type]?.doc ? ', document disponible' : ''}.`, link: '/app/requests' })
    else {
      notify({ role: req.chain[req.currentLevel], kind: 'request', actor: u.name, title: `validation requise : ${r.type}`, body: `De ${r.byName}`, link: '/app/requests' })
      notify({ to: r.by, kind: 'request', actor: u.name, title: 'demande validée (étape)', body: `${r.type} · en cours`, link: '/app/requests' })
    }
    setView(null); setComment(''); force()
  }

  const RequestCard = ({ r, decidable }) => {
    const [label, color] = ST_FR[r.status] || [r.status, NEUTRAL]
    return (
      <Card style={{ marginBottom: 12 }} onPress={() => { setComment(''); setView(r.id) }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: accent + '15' }}>
            <Ic n="FileText" size={17} color={accent} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontWeight: '800', color: C.ink, fontSize: 14 }}>{r.type}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>par {r.byName} · {ago(r.at)}</Text>
          </View>
          <Badge label={decidable ? 'À examiner' : label} color={decidable ? WARN : color} />
        </View>
        <ChainRow r={r} />
      </Card>
    )
  }

  const viewR = view && d.requests.find(x => x.id === view)
  const vDef = viewR ? (REQUEST_DEFS[viewR.type] || { fields: [] }) : null
  const vUser = viewR ? userById(viewR.by) : null

  return (
    <Screen title="Demandes & validations"
      sub={canRaise ? 'Déposez une demande et suivez son circuit.' : 'Examinez puis validez les demandes.'}
      right={canRaise ? <Btn small icon="Plus" label="Nouvelle" color={accent} onPress={() => { setType2(myTypes[0]); setOpen(true) }} /> : null}>

      {toDecide.length > 0 && (
        <Section title={`À valider (${toDecide.length})`} style={{ marginTop: 0 }}>
          {toDecide.map(r => <RequestCard key={r.id} r={r} decidable />)}
        </Section>
      )}

      <Section title={canRaise ? 'Mes demandes' : 'Toutes les demandes'} style={toDecide.length ? undefined : { marginTop: 0 }}>
        {(canRaise ? mine : d.requests).length === 0
          ? <Card><EmptyState icon="FileText" title="Aucune demande"
              sub={canRaise ? 'Déposez votre première demande pour la suivre ici.' : 'Les demandes à examiner apparaîtront ici.'} /></Card>
          : (canRaise ? mine : d.requests).map(r => <RequestCard key={r.id} r={r} />)}
      </Section>

      {/* ---------- Détail : examiner puis décider ---------- */}
      {viewR && (
        <Sheet title="Détail de la demande" onClose={() => { setView(null); setComment('') }}
          footer={canDecideR(viewR)
            ? <>
                <Btn icon="Check" label="Approuver" color={OK} onPress={() => act(viewR, 'approved')} />
                <View style={{ height: 9 }} />
                <Btn kind="ghost" icon="X" label="Rejeter" color={DANGER} onPress={() => act(viewR, 'rejected')} />
              </>
            : <Btn kind="ghost" label="Fermer" color={C.muted} onPress={() => setView(null)} />}>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontWeight: '800', fontSize: 16, color: C.ink }}>{viewR.type}</Text>
            <Badge label={(ST_FR[viewR.status] || [viewR.status])[0]} color={(ST_FR[viewR.status] || [, NEUTRAL])[1]} />
          </View>

          <View style={{ backgroundColor: '#F6F7FB', borderRadius: 12, padding: 12, marginTop: 10 }}>
            <Text style={{ fontSize: 12, color: C.ink }}><Text style={{ color: C.muted }}>Demandeur : </Text><Text style={{ fontWeight: '800' }}>{viewR.byName}</Text> ({ROLE[vUser?.role]?.label || '·'})</Text>
            <Text style={{ fontSize: 12, color: C.ink, marginTop: 3 }}><Text style={{ color: C.muted }}>CIN : </Text>{vUser?.cin || '·'}</Text>
            <Text style={{ fontSize: 12, color: C.ink, marginTop: 3 }}><Text style={{ color: C.muted }}>Date : </Text>{dmyhm(viewR.at)}</Text>
            <Text style={{ fontSize: 12, color: C.ink, marginTop: 3 }}><Text style={{ color: C.muted }}>Circuit : </Text>{viewR.chain.map(r => ROLE[r]?.label).join(' → ')}</Text>
          </View>

          <Lbl>Détails saisis</Lbl>
          {vDef.fields.map(f => {
            const v = fieldVal(viewR, f)
            return (
              <View key={f.k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 7 }}>
                <Text style={{ fontSize: 12, color: C.muted, flex: 1 }}>{f.l}</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: C.ink, flex: 1, textAlign: 'right' }}>{v || '·'}</Text>
              </View>
            )
          })}

          <Lbl>Circuit de validation</Lbl>
          <ChainRow r={viewR} />

          {viewR.approvals.length > 0 && (
            <View style={{ marginTop: 10 }}>
              {viewR.approvals.map((a, i) => (
                <Text key={i} style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                  <Text style={{ fontWeight: '800', color: a.decision === 'approved' ? OK : DANGER }}>{a.decision === 'approved' ? 'Approuvé' : 'Rejeté'}</Text>
                  {' '}par {a.by} ({ROLE[a.role]?.label}) · {dmy(a.at)}{a.comment ? `${a.comment}` : ''}
                </Text>
              ))}
            </View>
          )}

          {viewR.status === 'approved' && REQUEST_DEFS[viewR.type]?.doc && (
            <View style={{ flexDirection: 'row', gap: 8, backgroundColor: OK + '14', borderRadius: 12, padding: 10, marginTop: 12 }}>
              <Ic n="Printer" size={15} color={OK} />
              <Text style={{ flex: 1, fontSize: 12, color: C.ink }}>Document officiel prêt : l'aperçu et le PDF se téléchargent depuis l'application web.</Text>
            </View>
          )}

          {canDecideR(viewR) && <>
            <Lbl>Votre commentaire (optionnel)</Lbl>
            <Input value={comment} onChangeText={setComment} multiline numberOfLines={2}
              style={{ minHeight: 60, textAlignVertical: 'top' }} placeholder="Motif d'approbation ou de rejet…" />
          </>}
        </Sheet>
      )}

      {/* ---------- Nouvelle demande ---------- */}
      {open && (
        <Sheet title="Nouvelle demande" onClose={() => { setOpen(false); setErr('') }}
          footer={<>
            <Err msg={err} />
            <Btn icon="Send" label="Envoyer" color={accent} onPress={submit} />
          </>}>

          <Lbl>Type de demande</Lbl>
          <Wrap>{myTypes.map(t => <Chip key={t} label={t} color={accent} active={type === t} onPress={() => setType2(t)} />)}</Wrap>

          <Text style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>Circuit : {def.chain?.map(r => ROLE[r]?.label).join(' → ')}</Text>
          {!!def.note && (
            <View style={{ flexDirection: 'row', gap: 7, backgroundColor: '#F6F7FB', borderRadius: 12, padding: 10, marginTop: 8 }}>
              <Ic n="Info" size={13} color={C.muted} />
              <Text style={{ flex: 1, fontSize: 12, color: C.muted }}>{def.note}</Text>
            </View>
          )}

          {def.fields.map(f => (
            <View key={f.k}>
              {f.t !== 'checkbox' && <Lbl>{f.l}{f.req ? ' *' : ''}</Lbl>}
              {f.t === 'checkbox' && <View style={{ height: 14 }} />}
              <FieldInput f={f.t === 'child' ? { ...f, opts: childOptions } : f} vals={vals} setVals={setVals} accent={accent} />
            </View>
          ))}
        </Sheet>
      )}
    </Screen>
  )
}
