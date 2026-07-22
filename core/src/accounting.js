// ════════════════════════════════════════════════════════════════════════════
// COMPTABILITÉ — barème, remises, bourses, factures, reçus, budget.
//
// Ce qui existait s'appelait « Finances » mais n'était qu'une GRILLE de pastilles
// payé/impayé : aucun montant, aucune facture, aucun reçu. Une école ne peut pas
// tenir sa comptabilité avec ça, et un commissaire aux comptes encore moins.
//
// LES RÈGLES QUI RENDENT UNE COMPTABILITÉ DÉFENDABLE :
//
//  1. UNE FACTURE ÉMISE NE SE MODIFIE PLUS. On l'ANNULE par un avoir, daté et
//     motivé. Réécrire une facture, c'est réécrire l'histoire — c'est exactement
//     ce qu'un audit cherche, et ce qui coûte sa licence à une école.
//
//  2. LE MONTANT SE CALCULE, il ne se saisit pas : barème du niveau − remises −
//     bourse. Une remise est une DÉCISION tracée (qui, quand, pourquoi), pas un
//     chiffre tapé dans une case.
//
//  3. UN REÇU SUIT CHAQUE ENCAISSEMENT. Pas d'encaissement sans reçu numéroté :
//     c'est la seule preuve qu'a la famille, et la seule que l'école pourra
//     produire.
//
//  4. LE PARENT NE SE DÉCLARE JAMAIS PAYÉ. Il SIGNALE un versement ;
//     l'administration CONFIRME après encaissement. (Règle déjà tenue par le
//     produit — on ne la casse pas ici.)
// ════════════════════════════════════════════════════════════════════════════
import { db, save } from './db.js'
import { currency } from './currency.js'
import { now, todayIso } from './clock.js'
import { labelOf } from './levels.js'

// ── Le barème : ce que coûte une année, par niveau ──────────────────────────
export const FEE_KINDS = {
  inscription: { key: 'inscription', label: 'Frais d’inscription', once: true },
  scolarite:   { key: 'scolarite',   label: 'Scolarité',           once: false },
  cantine:     { key: 'cantine',     label: 'Cantine',             once: false, optional: true },
  transport:   { key: 'transport',   label: 'Transport',           once: false, optional: true },
}

export const feeSchedule = (d = db()) => d.feeSchedule || {}

/** Le barème d'un niveau. Sans barème, on ne facture pas — et on le dit.
 *  `d` optionnel : passer un instantané déjà chargé évite de re-parser le blob
 *  (une page qui calcule le dû de 120 élèves ne doit pas rappeler db() par ligne). */
export const feesOf = (level, d = db()) => feeSchedule(d)[level] || null

export function setFees(level, fees) {
  const d = db()
  d.feeSchedule = { ...(d.feeSchedule || {}), [level]: fees }
  save(d)
}

// ── Remises & bourses : des DÉCISIONS, pas des chiffres tapés ───────────────
export const DISCOUNT_KINDS = {
  fratrie:  { key: 'fratrie',  label: 'Fratrie',            pct: 10 },
  personnel:{ key: 'personnel',label: 'Enfant du personnel', pct: 50 },
  anticipe: { key: 'anticipe', label: 'Paiement anticipé',  pct: 5 },
  bourse:   { key: 'bourse',   label: 'Bourse',             pct: null }, // montant libre, décidé
}

export const discounts = (d = db()) => d.discounts || []
export const discountsOf = (studentId, d = db()) => discounts(d).filter(x => x.studentId === studentId)

/** Accorder une remise. Qui, quand, pourquoi — sinon ce n'est pas une remise, c'est un trou. */
export function grantDiscount({ studentId, kind, pct, amount = 0, reason, by }) {
  const d = db()
  const g = {
    id: 'dc' + Date.now().toString(36),
    studentId, kind,
    pct: pct ?? DISCOUNT_KINDS[kind]?.pct ?? null,
    amount: Number(amount) || 0,          // bourse : un montant, pas un pourcentage
    reason: reason || '', by, at: now(),
  }
  d.discounts = [g, ...(d.discounts || [])]
  save(d)
  return g
}

export function revokeDiscount(id) {
  const d = db()
  d.discounts = (d.discounts || []).filter(x => x.id !== id)
  save(d)
}

// ── Le calcul. Il se CALCULE ; il ne se saisit pas. ─────────────────────────
/**
 * Ce qu'un élève doit pour l'année : barème du niveau − remises (%) − bourse (montant).
 * Retourne le détail, pas juste un total : une famille a le droit de comprendre.
 */
export function dueFor(studentId, d = db()) {
  const st = (d.students || []).find(s => s.id === studentId)
  if (!st) return null
  const cls = (d.classes || []).find(c => c.id === st.classId)
  const fees = feesOf(cls?.level, d)
  if (!fees) return { error: `Aucun barème pour le niveau « ${labelOf(cls?.level)} ».`, lines: [], total: 0 }

  const lines = Object.entries(fees)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ kind: k, label: FEE_KINDS[k]?.label || k, amount: v }))
  const gross = lines.reduce((s, l) => s + l.amount, 0)

  const gs = discountsOf(studentId, d)
  const pctTotal = gs.filter(g => g.pct).reduce((s, g) => s + g.pct, 0)
  const pctCut = Math.round(gross * Math.min(pctTotal, 100) / 100)
  const bourse = gs.filter(g => !g.pct).reduce((s, g) => s + g.amount, 0)

  const net = Math.max(0, gross - pctCut - bourse)
  return { lines, gross, discounts: gs, pctTotal, pctCut, bourse, total: net }
}

// ── Factures ────────────────────────────────────────────────────────────────
export const INVOICE_STAGES = {
  emise:   { key: 'emise',   label: 'Émise',    tone: 'warn' },
  partiel: { key: 'partiel', label: 'Partielle', tone: 'info' },
  payee:   { key: 'payee',   label: 'Payée',    tone: 'ok' },
  annulee: { key: 'annulee', label: 'Annulée',  tone: 'danger' },
}

export const invoices = () => db().invoices || []
export const invoicesOf = studentId => invoices().filter(i => i.studentId === studentId)
export const receipts = () => db().receipts || []

/**
 * Le numéro suivant, DANS SA PROPRE SÉRIE.
 * Bug corrigé : on comptait toutes les factures pour numéroter un AVOIR — le
 * premier avoir sortait en AV-2026-0002. Une série qui saute est une remarque
 * d'audit : chaque série (FA, AV, RE) se compte SEULE, et sans trou.
 */
const nextNumber = (prefix, list) => {
  const y = todayIso().slice(0, 4)
  const n = list.filter(x => String(x.number || '').startsWith(`${prefix}-${y}-`)).length + 1
  return `${prefix}-${y}-${String(n).padStart(4, '0')}`
}

/** Émettre une facture. Le montant vient de dueFor() — jamais d'une saisie. */
export function issueInvoice(studentId, by) {
  const due = dueFor(studentId)
  if (!due || due.error) return { error: due?.error || 'Élève introuvable.' }
  if (due.total <= 0) return { error: 'Rien à facturer : la bourse couvre la totalité.' }

  const d = db()
  const inv = {
    id: 'in' + Date.now().toString(36),
    number: nextNumber('FA', invoices()),
    studentId,
    lines: due.lines,
    gross: due.gross, pctCut: due.pctCut, bourse: due.bourse,
    total: due.total, paid: 0,
    stage: 'emise',
    issuedAt: now(), issuedBy: by,
    cancelledAt: null, cancelReason: null, creditNote: null,
  }
  d.invoices = [inv, ...(d.invoices || [])]
  save(d)
  return { invoice: inv }
}

/**
 * RÈGLE 1 — on n'ÉDITE pas une facture émise. On l'annule par un AVOIR, daté et
 * motivé. C'est la différence entre une comptabilité et un tableur.
 */
export function cancelInvoice(id, reason, by) {
  const inv = invoices().find(i => i.id === id)
  if (!inv) return { error: 'Facture introuvable.' }
  if (inv.stage === 'annulee') return { error: 'Déjà annulée.' }
  if (!reason?.trim()) return { error: 'Un motif est obligatoire : une annulation sans motif n’est pas défendable.' }
  const d = db()
  d.invoices = d.invoices.map(i => i.id !== id ? i : {
    ...i, stage: 'annulee', cancelledAt: now(), cancelReason: reason, cancelledBy: by,
    creditNote: nextNumber('AV', invoices().map(x => ({ number: x.creditNote })).filter(x => x.number)),
  })
  save(d)
  return { ok: true }
}

/**
 * RÈGLE 3 — encaisser produit un REÇU NUMÉROTÉ. Pas d'encaissement sans reçu.
 * C'est la seule preuve de la famille, et la seule que l'école pourra produire.
 */
export const METHODS = { especes: 'Espèces', virement: 'Virement', cheque: 'Chèque', carte: 'Carte' }

export function collect(invoiceId, amount, method, by) {
  const inv = invoices().find(i => i.id === invoiceId)
  if (!inv) return { error: 'Facture introuvable.' }
  if (inv.stage === 'annulee') return { error: 'Cette facture est annulée.' }
  const a = Number(amount) || 0
  if (a <= 0) return { error: 'Le montant doit être positif.' }
  const rest = inv.total - inv.paid
  if (a > rest) return { error: `Le reste dû n’est que de ${rest} ${currency()}.` }

  const d = db()
  const r = {
    id: 're' + Date.now().toString(36),
    number: nextNumber('RE', receipts()),
    invoiceId, studentId: inv.studentId,
    amount: a, method, at: now(), by,
  }
  d.receipts = [r, ...(d.receipts || [])]
  const paid = inv.paid + a
  d.invoices = d.invoices.map(i => i.id !== invoiceId ? i
    : { ...i, paid, stage: paid >= i.total ? 'payee' : 'partiel' })
  save(d)
  return { receipt: r }
}

// ── L'état financier — ce que la direction doit pouvoir dire en trente secondes ──
export function financials() {
  const inv = invoices().filter(i => i.stage !== 'annulee')
  const invoiced = inv.reduce((s, i) => s + i.total, 0)
  const collected = inv.reduce((s, i) => s + i.paid, 0)
  const outstanding = invoiced - collected
  const cancelled = invoices().filter(i => i.stage === 'annulee').length

  // Ce que l'école DEVRAIT facturer si tous les élèves l'étaient : le manque à gagner
  // n'est pas un détail, c'est souvent la première fuite d'une école.
  const d = db()
  const expected = (d.students || []).reduce((s, st) => {
    const due = dueFor(st.id)
    return s + (due && !due.error ? due.total : 0)
  }, 0)
  const notInvoiced = Math.max(0, expected - invoiced)

  const payrollCost = (db().hrPayrolls || [])
    .filter(p => p.stage === 'paye')
    .reduce((s, p) => s + p.total, 0)

  return {
    expected, invoiced, collected, outstanding, notInvoiced, cancelled,
    payrollCost, balance: collected - payrollCost,
    rate: invoiced ? Math.round(collected / invoiced * 100) : 0,
  }
}

export { money, setCurrency, currency } from './currency.js'
