// ════════════════════════════════════════════════════════════════════════════
// LE DOSSIER DE L'ENFANT — santé, personnes autorisées, jalons.
//
// Trois choses qu'un ERP scolaire n'a jamais, et qu'une crèche ne peut pas ouvrir
// sans (recherche kogia-research, vérifié 3-0 : vaccins, autorisations de départ,
// jalons de développement font partie de la surface fonctionnelle standard chez
// Famly et Procare — et sont ABSENTS des ERP scolaires généralistes).
//
// LA PLUS IMPORTANTE DES TROIS : LES PERSONNES AUTORISÉES.
//
// Un enfant ne part JAMAIS avec quelqu'un qui n'est pas sur la liste. C'est la
// règle la plus grave du métier : dans une séparation conflictuelle, la liste des
// personnes autorisées est ce qui sépare une école d'un enlèvement parental.
// Le produit doit rendre l'erreur IMPOSSIBLE, pas seulement improbable — donc le
// refus vit dans le cœur, et le départ se JOURNALISE : qui est venu, à quelle
// heure, qui a remis l'enfant.
// ════════════════════════════════════════════════════════════════════════════
import { db, save } from './db.js'
import { now, todayIso } from './clock.js'

// ── SANTÉ : vaccins ─────────────────────────────────────────────────────────
/** Le calendrier vaccinal tunisien (obligatoires). `months` = âge d'administration. */
export const VACCINES = [
  { key: 'bcg',     label: 'BCG',                     months: 0 },
  { key: 'hepb0',   label: 'Hépatite B (naissance)',  months: 0 },
  { key: 'penta1',  label: 'Pentavalent 1',           months: 2 },
  { key: 'penta2',  label: 'Pentavalent 2',           months: 3 },
  { key: 'penta3',  label: 'Pentavalent 3',           months: 6 },
  { key: 'ror1',    label: 'ROR 1',                   months: 12 },
  { key: 'ror2',    label: 'ROR 2',                   months: 18 },
  { key: 'dtp',     label: 'Rappel DTP',              months: 60 },
]

export const health = () => db().health || {}
export const healthOf = childId => health()[childId] || { vaccines: {}, allergies: [], meds: [], doctor: '', notes: '' }

export function saveHealth(childId, patch) {
  const d = db()
  d.health = { ...(d.health || {}), [childId]: { ...healthOf(childId), ...patch } }
  save(d)
}

const monthsOld = dob => {
  if (!dob) return null
  const b = new Date(dob), n = new Date()
  return (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth())
}

/**
 * Les vaccins DUS et non faits, pour l'âge de l'enfant.
 * Une crèche a l'obligation légale de le savoir — et de le dire aux parents.
 */
export function vaccineStatus(child) {
  const h = healthOf(child.id)
  const age = monthsOld(child.dob)
  if (age == null) return { due: [], done: [], upcoming: [], unknown: true }
  const done = [], due = [], upcoming = []
  for (const v of VACCINES) {
    if (h.vaccines?.[v.key]) done.push(v)
    else if (age >= v.months) due.push(v)     // en retard
    else upcoming.push(v)
  }
  return { done, due, upcoming, ageMonths: age }
}

// ── PERSONNES AUTORISÉES — la règle la plus grave du métier ─────────────────
export const RELATIONS = ['Père', 'Mère', 'Grand-parent', 'Oncle / Tante', 'Frère / Sœur', 'Nounou', 'Autre']

export const pickups = () => db().pickups || {}
export const pickupsOf = childId => pickups()[childId] || []

export function addPickup(childId, { name, relation, phone, cin, addedBy }) {
  if (!name?.trim()) return { error: 'Le nom est requis.' }
  if (!cin?.trim()) return { error: 'La pièce d’identité est obligatoire : c’est ce qu’on vérifiera au portail.' }
  const d = db()
  const list = pickupsOf(childId)
  d.pickups = {
    ...(d.pickups || {}),
    [childId]: [...list, {
      id: 'pk' + Date.now().toString(36),
      name: name.trim(), relation, phone: phone || '', cin: cin.trim(),
      addedBy, addedAt: now(), active: true,
    }],
  }
  save(d)
  return { ok: true }
}

/** Retirer une autorisation. On DÉSACTIVE, on ne supprime pas : la trace reste. */
export function revokePickup(childId, id, by, reason) {
  const d = db()
  d.pickups = {
    ...(d.pickups || {}),
    [childId]: pickupsOf(childId).map(p => p.id !== id ? p
      : { ...p, active: false, revokedBy: by, revokedAt: now(), revokeReason: reason || '' }),
  }
  save(d)
  return { ok: true }
}

/** Cette personne peut-elle emmener cet enfant ? La question la plus importante du produit. */
export function mayCollect(childId, personId) {
  const p = pickupsOf(childId).find(x => x.id === personId)
  if (!p) return { allowed: false, reason: 'Cette personne n’est pas sur la liste de l’enfant.' }
  if (!p.active) return { allowed: false, reason: `Autorisation retirée le ${new Date(p.revokedAt).toLocaleDateString('fr-FR')}.` }
  return { allowed: true, person: p }
}

export const departures = () => db().departures || []

/**
 * REMETTRE L'ENFANT. Le refus vit ICI — pas dans l'écran.
 * Et le départ se journalise : qui est venu, à quelle heure, qui a remis.
 */
export function handOver(childId, personId, byName) {
  const check = mayCollect(childId, personId)
  if (!check.allowed) return { error: check.reason }
  const d = db()
  const rec = {
    id: 'dp' + Date.now().toString(36),
    childId, personId,
    personName: check.person.name,
    relation: check.person.relation,
    cin: check.person.cin,
    at: now(), date: todayIso(), by: byName,
  }
  d.departures = [rec, ...(d.departures || [])]
  save(d)
  return { departure: rec }
}

export const departuresToday = (childId) =>
  departures().filter(x => x.date === todayIso() && (!childId || x.childId === childId))

// ── JALONS DE DÉVELOPPEMENT ─────────────────────────────────────────────────
/** Ce qu'on observe, par tranche d'âge. On observe — on ne NOTE pas un enfant. */
export const MILESTONES = [
  { key: 'marche',    label: 'Marche seul',                    months: 15, domain: 'motricite' },
  { key: 'court',     label: 'Court sans tomber',              months: 24, domain: 'motricite' },
  { key: 'escalier',  label: 'Monte un escalier',              months: 30, domain: 'motricite' },
  { key: 'mots',      label: 'Dit ses premiers mots',          months: 12, domain: 'langage' },
  { key: 'phrases',   label: 'Fait des phrases de 2-3 mots',   months: 24, domain: 'langage' },
  { key: 'prenom',    label: 'Dit son prénom',                 months: 30, domain: 'langage' },
  { key: 'proprete',  label: 'Propre le jour',                 months: 30, domain: 'autonomie' },
  { key: 'mange',     label: 'Mange seul à la cuillère',       months: 24, domain: 'autonomie' },
  { key: 'habille',   label: 'S’habille avec aide',            months: 36, domain: 'autonomie' },
  { key: 'partage',   label: 'Partage un jouet',               months: 36, domain: 'social' },
  { key: 'joue',      label: 'Joue avec d’autres enfants',     months: 30, domain: 'social' },
  { key: 'dessine',   label: 'Tient un crayon, gribouille',    months: 24, domain: 'creation' },
]

export const milestones = () => db().milestones || {}
export const milestonesOf = childId => milestones()[childId] || {}

/** Observer un jalon. C'est une OBSERVATION datée, signée — pas une note. */
export function observe(childId, key, by) {
  const d = db()
  const m = milestonesOf(childId)
  d.milestones = {
    ...(d.milestones || {}),
    [childId]: { ...m, [key]: { at: now(), by } },
  }
  save(d)
}

export function unobserve(childId, key) {
  const d = db()
  const m = { ...milestonesOf(childId) }
  delete m[key]
  d.milestones = { ...(d.milestones || {}), [childId]: m }
  save(d)
}

/**
 * Où en est l'enfant, pour SON âge.
 * On ne compare JAMAIS un enfant à un autre. On regarde s'il y a quelque chose
 * qu'on devrait avoir vu à cet âge et qu'on ne voit pas — et alors on en PARLE
 * aux parents. Ce n'est pas un diagnostic ; c'est une conversation à avoir.
 */
export function milestoneStatus(child) {
  const age = monthsOld(child.dob)
  const seen = milestonesOf(child.id)
  if (age == null) return { observed: [], expected: [], watch: [] }
  const observed = MILESTONES.filter(m => seen[m.key])
  const expected = MILESTONES.filter(m => age >= m.months)
  const watch = expected.filter(m => !seen[m.key])   // à surveiller, jamais « en retard »
  return { observed, expected, watch, ageMonths: age }
}
