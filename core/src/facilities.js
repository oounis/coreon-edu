// ════════════════════════════════════════════════════════════════════════════
// LOCATION DES INSTALLATIONS — piscine, terrain, gymnase, salles.
//
// Idée d'Othman, et c'est une vraie idée : une école possède une piscine, un
// terrain, un gymnase, un auditorium. Ces murs sont VIDES le soir, le week-end,
// pendant les vacances. Les louer, c'est une SECONDE LIGNE DE REVENUS pour
// l'école — et un argument de vente qu'aucun ERP scolaire ne propose.
//
// DEUX PUBLICS, ET C'EST TOUT LE SUJET :
//   · INTERNE  — élèves, enseignants, personnel. Tarif réduit ou gratuit.
//   · EXTERNE  — clubs, entreprises, particuliers. Plein tarif. C'est eux qui
//                paient les murs.
//
// LA RÈGLE QUI TIENT TOUT LE MODULE :
//   ON NE RÉSERVE JAMAIS DEUX FOIS LE MÊME CRÉNEAU.
// Une double réservation de piscine, c'est deux groupes d'enfants au bord de
// l'eau, un samedi matin, et la réputation de l'école. Le conflit est refusé dans
// le CŒUR — pas dans l'écran.
//
// ET : LA PÉDAGOGIE PASSE AVANT L'ARGENT. Un cours d'EPS ne se fait pas déloger
// par un club qui paie. Les créneaux scolaires sont bloqués d'office.
// ════════════════════════════════════════════════════════════════════════════
import { db, save } from './db.js'
import { now, todayIso } from './clock.js'

export const FACILITY_KINDS = {
  piscine:     { key: 'piscine',     label: 'Piscine',       icon: 'Waves' },
  terrain:     { key: 'terrain',     label: 'Terrain',       icon: 'Goal' },
  basket:      { key: 'basket',      label: 'Basket',        icon: 'Dribbble' },
  gymnase:     { key: 'gymnase',     label: 'Gymnase',       icon: 'Dumbbell' },
  auditorium:  { key: 'auditorium',  label: 'Auditorium',    icon: 'Presentation' },
  salle:       { key: 'salle',       label: 'Salle',         icon: 'DoorOpen' },
}

/** Interne / externe : deux tarifs, deux publics, une seule installation. */
export const AUDIENCE = {
  interne: { key: 'interne', label: 'Interne', hint: 'Élèves, enseignants, personnel' },
  externe: { key: 'externe', label: 'Externe', hint: 'Clubs, entreprises, particuliers' },
}

export const BOOKING_STAGES = {
  demande:  { key: 'demande',  label: 'Demandée', tone: 'warn' },
  confirmee:{ key: 'confirmee',label: 'Confirmée', tone: 'info' },
  payee:    { key: 'payee',    label: 'Payée',    tone: 'ok' },
  annulee:  { key: 'annulee',  label: 'Annulée',  tone: 'danger' },
}

export const facilities = () => db().facilities || []
export const facilityOf = id => facilities().find(f => f.id === id) || null
export const bookings = () => db().bookings || []
export const memberships = () => db().memberships || []

export function saveFacility(f) {
  const d = db()
  const id = f.id || 'fc' + Date.now().toString(36)
  d.facilities = [...(d.facilities || []).filter(x => x.id !== id), { ...f, id }]
  save(d)
  return id
}

// ── LE CŒUR : le conflit de créneau ─────────────────────────────────────────
const overlap = (aFrom, aTo, bFrom, bTo) => aFrom < bTo && bFrom < aTo

/**
 * Ce créneau est-il libre ?
 * On regarde les réservations VIVANTES (une annulée libère la place) ET les
 * créneaux scolaires bloqués — la pédagogie passe avant l'argent.
 */
export function conflictFor(facilityId, date, from, to, ignoreId = null) {
  const f = facilityOf(facilityId)
  if (!f) return { error: 'Installation introuvable.' }

  // 1. Les créneaux réservés à l'école (cours d'EPS, natation…) : intouchables.
  const day = new Date(date).getDay()            // 0 dimanche … 6 samedi
  const blocked = (f.schoolSlots || []).find(s =>
    s.day === day && overlap(from, to, s.from, s.to))
  if (blocked) {
    return { blocked: true, reason: `Créneau scolaire réservé (${blocked.label || 'cours'}) de ${blocked.from} à ${blocked.to}.` }
  }

  // 2. Une autre réservation vivante sur le même créneau.
  const clash = bookings().find(b =>
    b.id !== ignoreId &&
    b.facilityId === facilityId &&
    b.date === date &&
    b.stage !== 'annulee' &&
    overlap(from, to, b.from, b.to))
  if (clash) {
    return { conflict: true, with: clash, reason: `Déjà réservé de ${clash.from} à ${clash.to} par ${clash.who}.` }
  }
  return { free: true }
}

/** Les créneaux libres d'un jour, par pas d'une heure. Ce qu'un client veut voir. */
export function availability(facilityId, date, open = '08:00', close = '22:00') {
  const slots = []
  const h = t => +t.slice(0, 2)
  for (let x = h(open); x < h(close); x++) {
    const from = `${String(x).padStart(2, '0')}:00`
    const to = `${String(x + 1).padStart(2, '0')}:00`
    const c = conflictFor(facilityId, date, from, to)
    slots.push({ from, to, free: !!c.free, reason: c.reason || null })
  }
  return slots
}

/** Le prix : le tarif du public, l'adhérent a sa remise. La règle est visible. */
export function priceFor(facilityId, audience, hours, clientId = null) {
  const f = facilityOf(facilityId)
  if (!f) return 0
  const rate = audience === 'interne' ? (f.rateInternal ?? 0) : (f.rateExternal ?? 0)
  const gross = rate * hours
  const m = memberships().find(x => x.clientId === clientId && x.active)
  const cut = m ? Math.round(gross * (m.pct || 0) / 100) : 0
  return { rate, gross, memberCut: cut, total: Math.max(0, gross - cut), member: m || null }
}

/**
 * RÉSERVER. Le conflit est refusé ICI — pas dans l'écran.
 * Une règle qui ne vit que dans l'interface n'est pas une règle.
 */
export function book({ facilityId, date, from, to, audience, who, phone = '', clientId = null, by }) {
  if (!from || !to || from >= to) return { error: 'Le créneau est incohérent.' }
  const c = conflictFor(facilityId, date, from, to)
  if (c.error) return { error: c.error }
  if (c.blocked || c.conflict) return { error: c.reason }

  const hours = (+to.slice(0, 2) + (+to.slice(3) / 60)) - (+from.slice(0, 2) + (+from.slice(3) / 60))
  const p = priceFor(facilityId, audience, hours, clientId)

  const d = db()
  const b = {
    id: 'bk' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    facilityId, date, from, to, hours,
    audience, who, phone, clientId,
    price: p.total, gross: p.gross, memberCut: p.memberCut,
    stage: audience === 'interne' && p.total === 0 ? 'confirmee' : 'demande',
    paid: 0,
    createdAt: now(), by,
  }
  d.bookings = [b, ...(d.bookings || [])]
  save(d)
  return { booking: b }
}

/**
 * RÉSERVATION RÉCURRENTE — « tous les samedis, 10h-12h, pendant 8 semaines ».
 * C'est le vrai besoin d'un club, et personne ne veut cliquer huit fois.
 *
 * On réserve CE QUI EST LIBRE et on DIT ce qui ne l'est pas. On n'échoue pas en
 * bloc pour une seule semaine occupée : un club préfère 7 samedis sur 8 à zéro.
 */
export function bookRecurring({ facilityId, startDate, from, to, weeks, audience, who, phone, clientId, by }) {
  const made = [], skipped = []
  const d0 = new Date(startDate)
  for (let i = 0; i < weeks; i++) {
    const d = new Date(d0); d.setDate(d0.getDate() + i * 7)
    const date = d.toISOString().slice(0, 10)
    const r = book({ facilityId, date, from, to, audience, who, phone, clientId, by })
    r.error ? skipped.push({ date, reason: r.error }) : made.push(r.booking)
  }
  return { made, skipped }
}

export function confirmBooking(id) {
  const d = db()
  d.bookings = (d.bookings || []).map(b => b.id !== id ? b : { ...b, stage: 'confirmee' })
  save(d); return { ok: true }
}

/** Encaisser une location. L'argent entre dans la même caisse que la scolarité. */
export function payBooking(id, method, by) {
  const b = bookings().find(x => x.id === id)
  if (!b) return { error: 'Réservation introuvable.' }
  if (b.stage === 'annulee') return { error: 'Réservation annulée.' }
  const d = db()
  d.bookings = d.bookings.map(x => x.id !== id ? x
    : { ...x, stage: 'payee', paid: x.price, paidAt: now(), method, paidBy: by })
  save(d)
  return { ok: true }
}

export function cancelBooking(id, reason) {
  if (!reason?.trim()) return { error: 'Un motif est obligatoire.' }
  const d = db()
  d.bookings = (d.bookings || []).map(b => b.id !== id ? b
    : { ...b, stage: 'annulee', cancelReason: reason, cancelledAt: now() })
  save(d)
  return { ok: true }
}

// ── Abonnements ─────────────────────────────────────────────────────────────
export function addMembership({ clientId, name, pct = 15, until }) {
  const d = db()
  d.memberships = [{ id: 'mb' + Date.now().toString(36), clientId, name, pct, until, active: true },
    ...(d.memberships || [])]
  save(d)
}

// ── Ce que la location RAPPORTE ─────────────────────────────────────────────
export function revenue() {
  const bs = bookings().filter(b => b.stage !== 'annulee')
  const billed = bs.reduce((s, b) => s + b.price, 0)
  const collected = bs.reduce((s, b) => s + b.paid, 0)
  const byFacility = {}
  bs.forEach(b => { byFacility[b.facilityId] = (byFacility[b.facilityId] || 0) + b.paid })

  // Le taux d'occupation : la vraie question d'un directeur. Une piscine vide ne
  // coûte pas moins cher qu'une piscine pleine.
  const hoursBooked = bs.reduce((s, b) => s + b.hours, 0)

  return {
    billed, collected, outstanding: billed - collected,
    external: bs.filter(b => b.audience === 'externe').reduce((s, b) => s + b.paid, 0),
    internal: bs.filter(b => b.audience === 'interne').reduce((s, b) => s + b.paid, 0),
    hoursBooked, count: bs.length, byFacility,
  }
}

export const money = n => `${(n || 0).toLocaleString('fr-FR')} DT`
export const todayStr = () => todayIso()
