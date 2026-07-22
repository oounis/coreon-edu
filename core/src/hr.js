// ════════════════════════════════════════════════════════════════════════════
// RESSOURCES HUMAINES & PAIE.
//
// Pourquoi ce module existe, et pourquoi maintenant : aucune école n'achète un
// ERP sans RH et sans paie. Ce sont des modules ENNUYEUX — et c'est exactement
// pour ça qu'ils doivent être COMPLETS et sans surprise. On ne gagne pas un
// client avec la paie ; on le PERD sans elle.
//
// (Charte produit : « les modules de base doivent être complets et ennuyeux ;
// nos idées doivent être exceptionnelles. » L'effort suit cette coupure.)
//
// LES TROIS RÈGLES QUI COMPTENT :
//  1. PERSONNE NE VALIDE SA PROPRE DEMANDE. Un directeur qui s'auto-approuve ses
//     congés, c'est le premier reproche d'un auditeur — et le premier trou de
//     confiance dans une école.
//  2. UN BULLETIN VALIDÉ NE BOUGE PLUS. On corrige par un ajustement daté, jamais
//     en réécrivant l'histoire. C'est ce qui rend la paie défendable.
//  3. LA PAIE SE CALCULE À PARTIR DES FAITS (absences non justifiées), pas d'une
//     saisie libre. Sinon ce n'est pas de la paie, c'est un tableur.
// ════════════════════════════════════════════════════════════════════════════
import { db, save } from './db.js'
import { now, todayIso } from './clock.js'

// ── Contrats ────────────────────────────────────────────────────────────────
export const CONTRACTS = {
  cdi:     { key: 'cdi',     label: 'CDI' },
  cdd:     { key: 'cdd',     label: 'CDD' },
  vacation:{ key: 'vacation',label: 'Vacataire' },
  stage:   { key: 'stage',   label: 'Stage' },
}

// ── Congés ──────────────────────────────────────────────────────────────────
export const LEAVE_KINDS = {
  annuel:   { key: 'annuel',   label: 'Congé annuel',     paid: true,  quota: 30 },
  maladie:  { key: 'maladie',  label: 'Maladie',          paid: true,  quota: 15, needsDoc: true },
  maternite:{ key: 'maternite',label: 'Maternité',        paid: true,  quota: 60 },
  sansSolde:{ key: 'sansSolde',label: 'Sans solde',       paid: false, quota: null },
  exception:{ key: 'exception',label: 'Exceptionnel',     paid: true,  quota: 5 },
}
export const LEAVE_STAGES = {
  demande: { key: 'demande', label: 'En attente', tone: 'warn' },
  accorde: { key: 'accorde', label: 'Accordé',    tone: 'ok' },
  refuse:  { key: 'refuse',  label: 'Refusé',     tone: 'danger' },
}

const daysBetween = (a, b) =>
  Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000) + 1)

export const leaves = () => db().hrLeaves || []
export const contracts = () => db().hrContracts || []

/** Le contrat d'un employé. Sans contrat, pas de paie — et c'est volontaire. */
export const contractOf = staffId => contracts().find(c => c.staffId === staffId) || null

export function setContract({ staffId, kind = 'cdi', salary = 0, start = todayIso(), end = null }) {
  const d = db()
  d.hrContracts = [...(d.hrContracts || []).filter(c => c.staffId !== staffId),
    { staffId, kind, salary: Number(salary) || 0, start, end }]
  save(d)
}

/** Une demande de congé. C'est l'employé qui la dépose. */
export function requestLeave({ staffId, kind, from, to, reason = '' }) {
  const d = db()
  const l = {
    id: 'l' + Date.now().toString(36),
    staffId, kind, from, to, reason,
    days: daysBetween(from, to),
    stage: 'demande',
    at: now(), decidedBy: null, decidedAt: null,
  }
  d.hrLeaves = [l, ...(d.hrLeaves || [])]
  save(d)
  return l
}

/**
 * Décider d'un congé.
 * RÈGLE 1 — personne ne valide sa propre demande. Le contrôle est ici, dans le
 * cœur, et pas seulement dans l'écran : une règle qui ne vit que dans l'interface
 * n'est pas une règle.
 */
export function decideLeave(id, stage, byId, byName) {
  const l = leaves().find(x => x.id === id)
  if (!l) return { error: 'Demande introuvable.' }
  if (l.staffId === byId) return { error: 'Vous ne pouvez pas décider de votre propre demande.' }
  if (l.stage !== 'demande') return { error: 'Cette demande a déjà été traitée.' }
  const d = db()
  d.hrLeaves = d.hrLeaves.map(x => x.id !== id ? x
    : { ...x, stage, decidedBy: byName, decidedById: byId, decidedAt: now() })
  save(d)
  return { ok: true }
}

/** Le solde de congés : le quota moins ce qui est ACCORDÉ (pas ce qui est demandé). */
export function leaveBalance(staffId, kind = 'annuel') {
  const k = LEAVE_KINDS[kind]
  if (!k?.quota) return null
  const used = leaves()
    .filter(l => l.staffId === staffId && l.kind === kind && l.stage === 'accorde')
    .reduce((s, l) => s + l.days, 0)
  return { quota: k.quota, used, left: Math.max(0, k.quota - used) }
}

// ── PAIE ────────────────────────────────────────────────────────────────────
export const PAYROLL_STAGES = {
  brouillon: { key: 'brouillon', label: 'Brouillon', tone: 'warn' },
  valide:    { key: 'valide',    label: 'Validé',    tone: 'info' },
  paye:      { key: 'paye',      label: 'Payé',      tone: 'ok' },
}

export const payrolls = () => db().hrPayrolls || []
export const payrollOf = month => payrolls().find(p => p.month === month) || null

/** Les jours d'absence NON justifiés du mois : c'est ce qui pèse sur la paie. */
export function unpaidDays(staffId, month) {
  return leaves().filter(l =>
    l.staffId === staffId &&
    l.stage === 'accorde' &&
    !LEAVE_KINDS[l.kind]?.paid &&
    String(l.from).startsWith(month)
  ).reduce((s, l) => s + l.days, 0)
}

/**
 * Préparer la paie d'un mois (`YYYY-MM`).
 * Elle se CALCULE à partir des faits — salaire du contrat, jours sans solde —
 * et non d'une saisie libre. Un bulletin est une conséquence, pas une opinion.
 */
export function preparePayroll(month, staff) {
  const existing = payrollOf(month)
  if (existing && existing.stage !== 'brouillon') {
    return { error: `La paie de ${month} est déjà ${PAYROLL_STAGES[existing.stage].label.toLowerCase()}.` }
  }
  const lines = staff.map(s => {
    const c = contractOf(s.id)
    const base = c?.salary || 0
    const off = unpaidDays(s.id, month)
    const daily = base / 30
    const deduction = Math.round(daily * off)
    return {
      staffId: s.id, name: s.name, role: s.role || s.designation || '·',
      contract: c?.kind || null,
      base, unpaidDays: off, deduction, bonus: 0,
      net: Math.max(0, base - deduction),
    }
  })
  const d = db()
  const p = {
    month, stage: 'brouillon', lines,
    total: lines.reduce((s, l) => s + l.net, 0),
    createdAt: now(), validatedBy: null, paidAt: null,
  }
  d.hrPayrolls = [...(d.hrPayrolls || []).filter(x => x.month !== month), p]
  save(d)
  return { payroll: p }
}

/** Une prime, tant que le bulletin est un BROUILLON. Après, plus rien ne bouge. */
export function setBonus(month, staffId, bonus) {
  const p = payrollOf(month)
  if (!p) return { error: 'Aucune paie pour ce mois.' }
  if (p.stage !== 'brouillon') return { error: 'La paie est verrouillée : elle a été validée.' }
  const d = db()
  d.hrPayrolls = d.hrPayrolls.map(x => x.month !== month ? x : {
    ...x,
    lines: x.lines.map(l => l.staffId !== staffId ? l
      : { ...l, bonus: Number(bonus) || 0, net: Math.max(0, l.base - l.deduction + (Number(bonus) || 0)) }),
  })
  const np = payrollOf(month)
  d.hrPayrolls = d.hrPayrolls.map(x => x.month !== month ? x
    : { ...x, total: np.lines.reduce((s, l) => s + l.net, 0) })
  save(d)
  return { ok: true }
}

/** RÈGLE 2 — valider verrouille. On ne réécrit pas l'histoire de la paie. */
export function validatePayroll(month, byName) {
  const p = payrollOf(month)
  if (!p) return { error: 'Aucune paie pour ce mois.' }
  if (p.stage !== 'brouillon') return { error: 'Déjà validée.' }
  const d = db()
  d.hrPayrolls = d.hrPayrolls.map(x => x.month !== month ? x
    : { ...x, stage: 'valide', validatedBy: byName, validatedAt: now() })
  save(d)
  return { ok: true }
}

export function markPaid(month) {
  const p = payrollOf(month)
  if (!p) return { error: 'Aucune paie pour ce mois.' }
  if (p.stage !== 'valide') return { error: 'Validez la paie avant de la marquer payée.' }
  const d = db()
  d.hrPayrolls = d.hrPayrolls.map(x => x.month !== month ? x : { ...x, stage: 'paye', paidAt: now() })
  save(d)
  return { ok: true }
}

export const monthLabel = m => {
  const [y, mo] = String(m).split('-')
  return new Date(+y, +mo - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
export const thisMonth = () => todayIso().slice(0, 7)
