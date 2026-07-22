// « Mon pointage » — portage natif de app/src/pages/Pointage.jsx : la badgeuse
// personnelle du personnel (arrivée / sortie du jour + historique + mon mois).
// Les accès aux données (db.staffClock / staffAttendance / staffLeaves) sont
// copiés du web à l'identique — mêmes clés, mêmes règles (retard après 08:05).
import { useEffect, useReducer, useState } from 'react'
import { View, Text } from 'react-native'
import { db, mutate } from '@core/db.js'
import { now as appNow, isoOf, frDateLabel, rentreeLabel } from '@core/clock.js'
import { schoolPhase } from '@core/livestatus.js'
import { ROLE } from '@core/theme.js'
import { Screen, Card, Section, Tile, Btn, Badge, EmptyState, C } from '../components.js'

const LEAVE_TYPES = { annuel: 'Congé annuel', maladie: 'Maladie', exceptionnel: 'Exceptionnel', permission: 'Permission (heures)' }
const QUOTA = 30, LATE = '08:05'
// Palette de statuts du web (ui.jsx STATUS)
const OK = '#12946F', WARN = '#C97C1E', DANGER = '#DC4B54'
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const pad = n => String(n).padStart(2, '0')
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const toMin = t => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m }
const fmtH = min => `${Math.floor(min / 60)} h ${pad(min % 60)}`
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

export default function Pointage({ user, params, nav }) {
  const d = db()
  const id = user.teacherId || user.id
  const accent = (ROLE[user.role] || ROLE.admin).color
  const [, force] = useReducer(x => x + 1, 0)
  const [nowD, setNow] = useState(() => appNow())
  // rafraîchit aussi l'horloge (même correction que le web) : sans cela le
  // compteur restait figé jusqu'à 30 s après le pointage.
  const refresh = () => { setNow(appNow()); force() }
  useEffect(() => { const t = setInterval(() => setNow(appNow()), 30000); return () => clearInterval(t) }, [])

  const today = isoOf(nowD)
  const clock = (d.staffClock || {})[today]?.[id] || null
  const working = clock && clock.in && !clock.out
  const elapsed = working ? Math.max(0, toMin(hm(nowD)) - toMin(clock.in))
    : (clock && clock.out ? Math.max(0, toMin(clock.out) - toMin(clock.in)) : 0)
  const summer = schoolPhase() === 'vacances'

  const checkIn = () => {
    const t = hm(appNow())
    mutate(db => {
      db.staffClock = db.staffClock || {}; db.staffClock[today] = db.staffClock[today] || {}
      db.staffClock[today][id] = { in: t, out: null }
      db.staffAttendance = db.staffAttendance || {}; db.staffAttendance[today] = db.staffAttendance[today] || {}
      db.staffAttendance[today][id] = t > LATE ? 'late' : 'present'
    })
    refresh()
  }
  const checkOut = () => {
    const t = hm(appNow())
    mutate(db => { const c = db.staffClock?.[today]?.[id]; if (c) c.out = t })
    refresh()
  }

  // mon mois : jours, heures, retards — même parcours que le web
  const month = today.slice(0, 7); let days = 0, minutes = 0, lates = 0
  const history = []
  Object.keys(d.staffClock || {}).sort().reverse().forEach(iso => {
    const c = d.staffClock[iso]?.[id]; if (!c) return
    const mins = c.out ? toMin(c.out) - toMin(c.in) : null
    if (iso.startsWith(month)) { days++; if (mins) minutes += mins; if (c.in > LATE) lates++ }
    if (history.length < 10) history.push({ iso, ...c, mins })
  })
  const myLeaves = (d.staffLeaves || []).filter(l => l.staffId === id).sort((a, b) => b.at - a.at)
  const year = nowD.getFullYear()
  const used = myLeaves.filter(l => l.status === 'approved' && l.type === 'annuel' && new Date(l.from).getFullYear() === year)
    .reduce((n, l) => n + l.days, 0)
  const stLv = { approved: ['Approuvé', OK], pending: ['En attente', WARN], rejected: ['Refusé', DANGER] }

  return (
    <Screen title="Mon pointage" sub="Votre badgeuse : arrivées, sorties et heures.">
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        {summer ? (
          <>
            <Badge label="VACANCES D'ÉTÉ" color="#92400E" />
            <Text style={{ fontWeight: '800', color: C.ink, fontSize: 18, marginTop: 10 }}>Badgeuse en pause</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
              Le pointage reprend le <Text style={{ fontWeight: '800' }}>{rentreeLabel()}</Text>. Vos heures et votre historique restent consultables ci-dessous : bel été !
            </Text>
          </>
        ) : !clock ? (
          <>
            <Text style={{ fontWeight: '800', color: C.ink, fontSize: 18 }}>Prêt pour la journée ?</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{cap(frDateLabel(nowD))} · {hm(nowD)}</Text>
            <View style={{ alignSelf: 'stretch', marginTop: 16 }}>
              <Btn label="Pointer l'arrivée" icon="LogIn" color={accent} onPress={checkIn} />
            </View>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>Après {LATE}, l'arrivée est comptée en retard.</Text>
          </>
        ) : working ? (
          <>
            <Text style={{ fontWeight: '800', color: C.ink, fontSize: 18 }}>Dans l'école depuis {clock.in}</Text>
            <Text style={{ fontWeight: '800', color: accent, fontSize: 32, marginTop: 4 }}>{fmtH(elapsed)}</Text>
            <Text style={{ color: C.muted, fontSize: 12 }}>temps de travail aujourd'hui</Text>
            <View style={{ alignSelf: 'stretch', marginTop: 16 }}>
              <Btn label="Pointer la sortie" icon="LogOut" color={accent} kind="outline" onPress={checkOut} />
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontWeight: '800', color: C.ink, fontSize: 18 }}>Journée terminée</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{clock.in} → {clock.out} · {fmtH(elapsed)}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>Merci pour aujourd'hui · à demain !</Text>
          </>
        )}
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
        <Tile icon="CalendarCheck" color="#2BD9A8" label="Jours pointés" sub={MOIS[nowD.getMonth()]} value={String(days)} />
        <Tile icon="Timer" color="#22D3EE" label="Heures travaillées" value={fmtH(minutes)} />
        <Tile icon="Clock" color="#FFA62B" label="Retards" value={String(lates)} />
        <Tile icon="Plane" color="#8B5CF6" label="Congé annuel restant" value={`${Math.max(0, QUOTA - used)} j`} />
      </View>

      <Section title="Mes derniers pointages">
        <Card style={{ paddingVertical: 6 }}>
          {history.length === 0 ? (
            <EmptyState icon="Hourglass" title="Aucun pointage" sub="Votre historique apparaîtra ici dès votre première arrivée." />
          ) : history.map((h, idx) => (
            <View key={h.iso} style={{
              flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
              borderBottomWidth: idx < history.length - 1 ? 1 : 0, borderBottomColor: C.line,
            }}>
              <Text style={{ flex: 1, color: C.muted, fontSize: 13 }}>{cap(frDateLabel(new Date(h.iso)))}</Text>
              <Text style={{ fontWeight: '700', color: C.ink, fontSize: 13 }}>{h.in} → {h.out || '·'}</Text>
              <Text style={{ fontWeight: '800', fontSize: 13, color: h.in > LATE ? WARN : OK, minWidth: 62, textAlign: 'right' }}>
                {h.mins ? fmtH(h.mins) : 'en cours'}
              </Text>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Mes demandes de congé & permissions">
        <Card style={{ paddingVertical: 6 }}>
          {myLeaves.length === 0 ? (
            <EmptyState icon="Plane" title="Aucune demande" sub="Vos demandes de congé et permissions apparaîtront ici." />
          ) : myLeaves.map((lv, idx) => {
            const [lbl, col] = stLv[lv.status] || ['·', C.muted]
            return (
              <View key={lv.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
                borderBottomWidth: idx < myLeaves.length - 1 ? 1 : 0, borderBottomColor: C.line,
              }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontWeight: '700', color: C.ink, fontSize: 14 }}>
                    {LEAVE_TYPES[lv.type] || lv.type}{lv.type === 'permission' && lv.hours ? ` · ${lv.hours} h` : ''}
                  </Text>
                  <Text numberOfLines={2} style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>
                    {lv.from === lv.to ? lv.from : `${lv.from} → ${lv.to}`}{lv.reason ? ` · « ${lv.reason} »` : ''}
                  </Text>
                </View>
                <Badge label={lbl} color={col} />
              </View>
            )
          })}
        </Card>
      </Section>
    </Screen>
  )
}
