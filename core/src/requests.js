// ════════════════════════════════════════════════════════════════════════════
// L'EXTENSION DES « DEMANDES » — le travail qui suit la signature.
//
// TRANCHÉ PAR LA RECHERCHE (PLAN §2.3, vérifié 3-0) : aucun MIS grand public
// n'embarque de ticketing ; la catégorie séparée (Incident IQ, Brightly) vise
// les districts américains, pas une école. Donc : PAS de produit de tickets.
// On ÉTEND la demande existante en un flux complet :
//
//     demande → catégorie → assigné → échéance → clôture
//
// avec la TRACE de qui a fait quoi — parce que la demande d'origine d'Othman
// était : « évaluer le travail accompli sur le mois ». Le besoin était réel ;
// la forme (un ticketing) ne l'était pas.
//
// LES RÈGLES :
//  1. Seule une demande APPROUVÉE devient un travail. La signature d'abord.
//  2. Chaque geste s'ajoute à la trace, daté et signé. Rien ne s'efface.
//  3. Le retard se CONSTATE à la clôture (échéance dépassée) — il reste écrit.
//  4. La catégorie n'est pas une saisie : c'est le groupe du type de demande
//     (RH, Documents, Logistique, Élève) — déjà déclaré dans tunisia.js.
// ════════════════════════════════════════════════════════════════════════════
import { db, mutate } from './db.js'
import { REQUEST_DEFS } from './tunisia.js'
import { now, todayIso, isoOf } from './clock.js'
import { notify } from './notify.js'

/** La catégorie d'une demande = le groupe de son type. Jamais une saisie libre. */
export const categoryOf = r => REQUEST_DEFS[r.type]?.group || 'Autre'

const reqById = id => db().requests.find(r => r.id === id) || null

/** ASSIGNER un travail : à qui, pour quand. Trace + notification à l'assigné. */
export function assign(id, { assigneeId, assigneeName, deadline = null, byName }) {
  const r = reqById(id)
  if (!r) return { error: 'Demande introuvable.' }
  if (r.status !== 'approved') return { error: 'Seule une demande approuvée peut être assignée.' }
  if (!assigneeId) return { error: 'À qui confier ce travail ?' }
  mutate(d => {
    const x = d.requests.find(q => q.id === id)
    x.assigneeId = assigneeId; x.assigneeName = assigneeName; x.deadline = deadline
    x.trace = x.trace || []
    x.trace.push({ at: now(), by: byName, action: 'assigne', note: `à ${assigneeName}${deadline ? `, échéance ${deadline}` : ''}` })
  })
  notify({ to: assigneeId, kind: 'request', actor: byName, title: 'travail assigné',
    body: `${r.type} : demandé par ${r.byName}${deadline ? ` · pour le ${deadline}` : ''}`, link: '/app/requests' })
  return { ok: true }
}

/**
 * CLÔTURER : l'assigné ou la direction ferme, avec un mot. Le retard est
 * constaté ici — l'échéance dépassée reste écrite, elle ne se retouche pas.
 */
export function close(id, { byId, byName, note = '' }) {
  const r = reqById(id)
  if (!r) return { error: 'Demande introuvable.' }
  if (r.status !== 'approved') return { error: 'Seule une demande approuvée se clôture.' }
  const late = !!(r.deadline && todayIso() > r.deadline)
  mutate(d => {
    const x = d.requests.find(q => q.id === id)
    x.status = 'closed'; x.closedAt = now(); x.closedBy = byName; x.closedById = byId
    x.closeNote = note; x.closedLate = late
    x.trace = x.trace || []
    x.trace.push({ at: now(), by: byName, action: 'cloture', note: note || (late ? 'clôturée · en retard sur l’échéance' : 'clôturée') })
  })
  if (r.by !== byId) notify({ to: r.by, kind: 'request', actor: byName, title: 'demande clôturée',
    body: `${r.type}${note ? ` · ${note}` : ''}`, link: '/app/requests' })
  return { ok: true, late }
}

/**
 * LE BILAN DU MOIS — la raison d'être de toute l'extension : « évaluer le
 * travail accompli sur le mois ». Compté depuis les faits tracés, rien d'autre.
 */
export function monthReport(month /* 'YYYY-MM' */) {
  const all = db().requests || []
  const inMonth = ts => !!ts && isoOf(new Date(ts)).startsWith(month)
  const submitted = all.filter(r => inMonth(r.at))
  const closed = all.filter(r => r.status === 'closed' && inMonth(r.closedAt))
  const open = all.filter(r => r.status === 'approved')                 // le travail encore dû, aujourd'hui
  const overdue = open.filter(r => r.deadline && todayIso() > r.deadline)

  const byCategory = {}
  for (const r of closed) {
    const c = categoryOf(r)
    byCategory[c] = byCategory[c] || { closed: 0, late: 0 }
    byCategory[c].closed++; if (r.closedLate) byCategory[c].late++
  }
  const byAssignee = {}
  for (const r of closed) {
    const n = r.closedBy || r.assigneeName || '·'
    byAssignee[n] = byAssignee[n] || { closed: 0, late: 0 }
    byAssignee[n].closed++; if (r.closedLate) byAssignee[n].late++
  }
  return {
    month,
    submitted: submitted.length,
    closed: closed.length,
    closedLate: closed.filter(r => r.closedLate).length,
    open: open.length,
    overdue: overdue.length,
    byCategory, byAssignee,
  }
}
