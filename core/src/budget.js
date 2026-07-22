// ════════════════════════════════════════════════════════════════════════════
// BUDGET & RAPPORTS FINANCIERS — la direction en trente secondes par mois.
//
// Trois sources RÉELLES, jamais un chiffre inventé (règle n°7) :
//   entrées  = les reçus de scolarité (accounting) + les locations payées
//              (facilities) — de l'argent effectivement ENCAISSÉ, pas facturé ;
//   sorties  = la paie VERSÉE (hr) + le carnet de dépenses ci-dessous.
//
// Le CARNET DE DÉPENSES couvre ce que le produit ne mesure pas encore :
// fournitures, maintenance, alimentation, loyer… Une dépense ne s'efface pas :
// elle s'ANNULE, motivée — la même discipline que la facture (règle n°4).
// ════════════════════════════════════════════════════════════════════════════
import { db, mutate } from './db.js'
import { isoOf, todayIso } from './clock.js'

export const EXPENSE_CATS = {
  fournitures: { key: 'fournitures', label: 'Fournitures' },
  maintenance: { key: 'maintenance', label: 'Maintenance & réparations' },
  alimentation: { key: 'alimentation', label: 'Cantine & alimentation' },
  loyer: { key: 'loyer', label: 'Loyer & charges' },
  transport: { key: 'transport', label: 'Transport' },
  autre: { key: 'autre', label: 'Autre' },
}
export const expenseCatOf = k => EXPENSE_CATS[k] || EXPENSE_CATS.autre

export const expenses = () => db().expenses || []

export function addExpense({ date = todayIso(), category = 'autre', label, amount, by }) {
  const a = Number(amount) || 0
  if (!String(label || '').trim()) return { error: 'Dites ce qui a été payé : une dépense sans libellé ne se défend pas.' }
  if (a <= 0) return { error: 'Le montant doit être positif.' }
  const rec = {
    id: 'ex' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    date, category, label: String(label).trim(), amount: a,
    at: Date.now(), by, cancelled: false, cancelReason: null,
  }
  mutate(d => { d.expenses = [rec, ...(d.expenses || [])] })
  return { expense: rec }
}

/** On n'efface pas une dépense : on l'annule, motivée. La trace reste. */
export function voidExpense(id, reason, by) {
  if (!String(reason || '').trim()) return { error: 'Un motif est obligatoire.' }
  const e = expenses().find(x => x.id === id)
  if (!e) return { error: 'Dépense introuvable.' }
  if (e.cancelled) return { error: 'Déjà annulée.' }
  mutate(d => {
    d.expenses = d.expenses.map(x => x.id !== id ? x
      : { ...x, cancelled: true, cancelReason: String(reason).trim(), cancelledBy: by, cancelledAt: Date.now() })
  })
  return { ok: true }
}

const monthOf = x => { const d = new Date(x); return isNaN(d) ? '' : isoOf(d).slice(0, 7) }

/** Le rapport d'UN mois : chaque total est accompagné de ses lignes. */
export function monthlyReport(month) {
  const d = db()
  const receipts = (d.receipts || []).filter(r => monthOf(r.at) === month)
  const rentals = (d.bookings || []).filter(b => b.stage === 'payee' && monthOf(b.paidAt || b.date) === month)
  const payrolls = (d.hrPayrolls || []).filter(p => p.stage === 'paye' && p.month === month)
  const exp = expenses().filter(e => !e.cancelled && (e.date || '').slice(0, 7) === month)

  const scolarite = receipts.reduce((s, r) => s + r.amount, 0)
  const locations = rentals.reduce((s, b) => s + (b.price || 0), 0)
  const wages = payrolls.reduce((s, p) => s + (p.total || 0), 0)
  const spent = exp.reduce((s, e) => s + e.amount, 0)

  return {
    month, receipts, rentals, payrolls, expenses: exp,
    scolarite, locations, income: scolarite + locations,
    wages, spent, out: wages + spent,
    balance: scolarite + locations - wages - spent,
  }
}

/** L'année en série mensuelle — pour la courbe. */
export function yearSeries(year) {
  return Array.from({ length: 12 }, (_, i) => {
    const m = `${year}-${String(i + 1).padStart(2, '0')}`
    const r = monthlyReport(m)
    return { month: m, income: r.income, out: r.out, balance: r.balance }
  })
}
