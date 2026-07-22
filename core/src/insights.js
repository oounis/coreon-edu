// ════════════════════════════════════════════════════════════════════════════
// COREON INTELLIGENCE — ce que vos données DISENT, pas ce qu'elles montrent.
//
// Les ERP de la liste (Focus & co.) vendent une « AI » : des tableaux de bord
// qui AFFICHENT des chiffres. L'idée d'Othman est plus ancienne et plus juste :
// on SUIT l'enfant au quotidien. Ce module lit les FAITS déjà enregistrés — le
// comportement observé, les appels, les frais — et en tire quelques phrases
// utiles pour la semaine.
//
// LES RÈGLES (les mêmes que partout) :
//  1. On ne CLASSE personne (règle n°9). On éclaire des TENDANCES d'école et on
//     signale, avec douceur, l'enfant dont il faut prendre des nouvelles — jamais
//     un palmarès, jamais une note.
//  2. RIEN N'EST INVENTÉ. Si une donnée manque, l'insight ne s'affiche pas
//     plutôt que de mentir. Chaque phrase est calculée d'un fait, et pointe vers
//     l'écran où l'on agit.
//  3. C'est un MIROIR, pas une prophétie : on décrit la semaine écoulée, on ne
//     prédit rien qu'on ne saurait justifier.
// ════════════════════════════════════════════════════════════════════════════
import { db, attParts } from './db.js'
import { traitOf } from './behavior.js'
import { now } from './clock.js'

const DAY = 86400000

/**
 * LE CLIMAT DE COMPORTEMENT de toute l'école sur `days` jours — une tendance,
 * jamais un classement d'élèves. Somme des observations, part d'encouragements,
 * et le trait pour lequel on félicite le plus.
 */
export function behaviorClimate(d = db(), days = 7) {
  const since = now() - days * DAY
  const recent = (d.behavior || []).filter(e => !e.removed && e.at >= since)
  const positives = recent.filter(e => e.positive).length
  const toImprove = recent.length - positives
  const byTrait = {}
  recent.forEach(e => { if (e.positive) byTrait[e.trait] = (byTrait[e.trait] || 0) + 1 })
  const topTrait = Object.entries(byTrait).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  return {
    total: recent.length, positives, toImprove,
    positiveRate: recent.length ? Math.round(positives / recent.length * 100) : null,
    topTrait,
  }
}

/**
 * LE SIGNAL DE PRÉSENCE — le taux d'absence de la fenêtre courante, comparé à la
 * précédente (la tendance), plus la liste des enfants aux absences répétées : un
 * signal de bien-être, pas une sanction.
 */
export function attendanceSignal(d = db(), days = 7) {
  const since = now() - days * DAY
  const prevSince = now() - 2 * days * DAY
  const byIso = {}            // iso → { present, absent, late, at }
  const absByStudent = {}     // studentId → nb d'absences dans la fenêtre courante
  for (const key in (d.attendance || {})) {
    const { iso } = attParts(key)
    const at = new Date(iso).getTime()
    if (Number.isNaN(at)) continue
    const rec = byIso[iso] = byIso[iso] || { present: 0, absent: 0, late: 0, at }
    for (const [sid, v] of Object.entries(d.attendance[key])) {
      if (rec[v] != null) rec[v]++
      if (at >= since && (v === 'absent' || v === 'late')) absByStudent[sid] = (absByStudent[sid] || 0) + 1
    }
  }
  const list = Object.values(byIso)
  const rate = arr => {
    const tot = arr.reduce((s, x) => s + x.present + x.absent + x.late, 0)
    const abs = arr.reduce((s, x) => s + x.absent + x.late, 0)
    return tot ? abs / tot : null
  }
  const current = rate(list.filter(x => x.at >= since))
  const previous = rate(list.filter(x => x.at >= prevSince && x.at < since))
  const watch = Object.entries(absByStudent).filter(([, n]) => n >= 3).map(([sid]) => sid)
  return { current, previous, watch }
}

/** LE SIGNAL FINANCIER — taux de recouvrement et mois en retard, sans détour. */
export function feeSignal(d = db()) {
  const fc = { paid: 0, pending: 0, overdue: 0, due: 0 }
  Object.values(d.payments || {}).forEach(arr =>
    arr.forEach(p => { if (fc[p.status] != null) fc[p.status]++ }))
  const total = fc.paid + fc.pending + fc.overdue + fc.due
  return { rate: total ? Math.round(fc.paid / total * 100) : null, overdue: fc.overdue, paid: fc.paid, total }
}

/**
 * LES INSIGHTS AFFICHABLES — la liste que le tableau de bord montre. Chaque item :
 *   { key, icon, tone, value, label, sub, to }
 * `tone` ∈ ok | info | warn. Un insight sans donnée ne figure PAS dans la liste.
 */
export function schoolInsights(d = db(), { days = 7 } = {}) {
  const out = []

  // ① Le climat — l'idée d'Othman, celle qu'aucun ERP générique ne sait montrer.
  const bc = behaviorClimate(d, days)
  if (bc.total > 0 && bc.positiveRate != null) {
    const tr = bc.topTrait ? traitOf(bc.topTrait) : null
    out.push({
      key: 'climat', icon: 'Sparkles',
      tone: bc.positiveRate >= 70 ? 'ok' : bc.positiveRate >= 45 ? 'info' : 'warn',
      value: `${bc.positiveRate}%`,
      label: 'Climat de classe positif',
      sub: `${bc.positives} encouragement${bc.positives > 1 ? 's' : ''} · ${bc.toImprove} rappel${bc.toImprove > 1 ? 's' : ''} cette semaine${tr ? ` · surtout « ${tr.label} »` : ''}`,
      to: '/app/behavior',
    })
  }

  // ② La présence — la tendance, pas la photo d'un jour.
  const at = attendanceSignal(d, days)
  if (at.current != null) {
    let dir = 'stable', tone = 'info'
    if (at.previous != null) {
      const delta = at.current - at.previous
      if (delta > 0.02) { dir = 'en hausse'; tone = 'warn' }
      else if (delta < -0.02) { dir = 'en baisse'; tone = 'ok' }
    }
    out.push({
      key: 'presence', icon: 'CalendarCheck', tone,
      value: `${Math.round(at.current * 100)}%`,
      label: `Absentéisme ${dir}`,
      sub: `Sur les ${days} derniers jours d'école`,
      to: '/app/attendance',
    })
  }

  // ③ Le bien-être avant tout : prendre des nouvelles des enfants souvent absents.
  if (at.watch.length) {
    out.push({
      key: 'assiduite', icon: 'Stethoscope', tone: 'warn',
      value: String(at.watch.length),
      label: `Enfant${at.watch.length > 1 ? 's' : ''} à surveiller`,
      sub: 'Absences répétées cette semaine : prendre des nouvelles',
      to: '/app/attendance',
    })
  }

  // ④ L'argent, en dernier — mais jamais oublié.
  const fs = feeSignal(d)
  if (fs.rate != null) {
    out.push({
      key: 'recouvrement', icon: 'Wallet',
      tone: fs.overdue > 0 ? 'warn' : 'ok',
      value: `${fs.rate}%`,
      label: 'Recouvrement des frais',
      sub: fs.overdue > 0 ? `${fs.overdue} mois en retard à relancer` : 'Tous les mois dus sont réglés',
      to: '/app/finance',
    })
  }

  return out
}
