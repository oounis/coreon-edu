// ════════════════════════════════════════════════════════════════════════════
// LA CANTINE — le menu de la semaine, et SURTOUT : qui ne peut pas le manger.
//
// Toutes les cantines d'ERP affichent un menu. La nôtre fait ce qu'aucune ne
// fait : elle CROISE le menu du jour avec les allergies des enfants inscrits et
// prévient AVANT le service. Le cauchemar d'une crèche, c'est de donner un plat
// aux arachides à un enfant allergique. Ici, l'école le voit venir.
//
// C'est la même pensée que la chaîne d'accident et les personnes autorisées :
// LA SÉCURITÉ DE L'ENFANT PASSE AVANT TOUT. Un menu qui ne connaît pas les
// allergies n'est qu'un tableau ; celui-ci protège.
//
// LES RÈGLES :
//  1. L'ALERTE ALLERGIE est calculée, jamais saisie : elle vient du dossier de
//     l'enfant (`allergies`), donc elle ne peut pas être « oubliée ».
//  2. On croise sur le fond ET la forme : « arachide » attrape « arachides »,
//     « fruits à coque » attrape « noix ». Dans le doute, on ALERTE — un faux
//     positif fait vérifier ; un faux négatif envoie un enfant à l'hôpital.
//  3. Le parent voit le menu de la semaine et, en clair, si un jour concerne
//     son enfant.
// ════════════════════════════════════════════════════════════════════════════
import { db, mutate, studentById } from './db.js'

// Les jours servis (école : lun→ven).
export const DAYS = [
  { key: 'lun', label: 'Lundi' }, { key: 'mar', label: 'Mardi' },
  { key: 'mer', label: 'Mercredi' }, { key: 'jeu', label: 'Jeudi' },
  { key: 'ven', label: 'Vendredi' },
]

// Les allergènes majeurs. `match` = les mots qui, dans le texte « allergies »
// d'un enfant, déclenchent l'alerte. On ratisse LARGE : mieux vaut vérifier.
export const ALLERGENS = {
  arachide:     { key: 'arachide',     label: 'Arachides',       match: ['arachide', 'cacahu'] },
  fruits_coque: { key: 'fruits_coque', label: 'Fruits à coque',  match: ['coque', 'noix', 'amande', 'noisette'] },
  lait:         { key: 'lait',         label: 'Lait',            match: ['lait', 'lactose', 'produits laitiers'] },
  gluten:       { key: 'gluten',       label: 'Gluten',          match: ['gluten', 'blé', 'ble'] },
  oeuf:         { key: 'oeuf',         label: 'Œuf',             match: ['oeuf', 'œuf'] },
  poisson:      { key: 'poisson',      label: 'Poisson',         match: ['poisson'] },
  fruits_mer:   { key: 'fruits_mer',   label: 'Fruits de mer',   match: ['crustac', 'fruits de mer', 'crevette'] },
  soja:         { key: 'soja',         label: 'Soja',            match: ['soja'] },
}
export const ALLERGEN_LIST = Object.values(ALLERGENS)
export const allergenOf = k => ALLERGENS[k] || null

// db.canteen = { menu: { lun:[{name,allergens:[]}], ... }, subscribers:[studentId] }
const store = () => db().canteen || { menu: {}, subscribers: [] }
export const weekMenu = () => store().menu || {}
export const dishesOf = day => (store().menu || {})[day] || []
export const subscribers = () => store().subscribers || []
export const isSubscribed = sid => subscribers().includes(sid)

/** Définir les plats d'un jour. Chaque plat porte ses allergènes (déclarés). */
export function setDay(day, dishes) {
  mutate(d => {
    d.canteen = d.canteen || { menu: {}, subscribers: [] }
    d.canteen.menu = { ...(d.canteen.menu || {}), [day]: dishes }
  })
  return { ok: true }
}

/** Inscrire / désinscrire un enfant à la cantine. */
export function toggleSubscriber(sid) {
  mutate(d => {
    d.canteen = d.canteen || { menu: {}, subscribers: [] }
    const set = new Set(d.canteen.subscribers || [])
    set.has(sid) ? set.delete(sid) : set.add(sid)
    d.canteen.subscribers = [...set]
  })
  return isSubscribed(sid)
}

/** Les allergènes présents dans le menu d'un jour (union des plats). */
export function allergensOfDay(day) {
  const set = new Set()
  dishesOf(day).forEach(dish => (dish.allergens || []).forEach(a => set.add(a)))
  return [...set]
}

/** L'allergie d'un enfant croise-t-elle un allergène ? On ratisse large. */
export function studentReactsTo(student, allergenKey) {
  const txt = String(student?.allergies || '').toLowerCase()
  if (!txt || txt === 'aucune') return false
  const a = ALLERGENS[allergenKey]
  return !!a && a.match.some(m => txt.includes(m))
}

/**
 * L'ALERTE DU JOUR : parmi les enfants INSCRITS à la cantine, lesquels réagissent
 * à un plat du menu ? C'est ce que la cuisine doit voir avant de servir.
 * Retourne [{ student, allergens:[{key,label,dish}] }].
 */
export function atRiskForDay(day) {
  const present = allergensOfDay(day)
  if (!present.length) return []
  const out = []
  for (const sid of subscribers()) {
    const s = studentById(sid); if (!s) continue
    const hits = present
      .filter(a => studentReactsTo(s, a))
      .map(a => {
        const dish = dishesOf(day).find(d => (d.allergens || []).includes(a))
        return { key: a, label: allergenOf(a)?.label || a, dish: dish?.name || '' }
      })
    if (hits.length) out.push({ student: s, allergens: hits })
  }
  return out
}

/** Combien de plats/jours renseignés, combien d'inscrits, alertes de la semaine. */
export function summary() {
  const days = DAYS.filter(d => dishesOf(d.key).length).length
  const alerts = DAYS.reduce((n, d) => n + atRiskForDay(d.key).length, 0)
  return { daysPlanned: days, subscribers: subscribers().length, alerts }
}

/** Le menu de la semaine pour UN enfant : chaque jour, un drapeau « attention ». */
export function weekForChild(studentId) {
  const s = studentById(studentId)
  return DAYS.map(day => {
    const dishes = dishesOf(day.key)
    const risks = dishes.flatMap(dish =>
      (dish.allergens || []).filter(a => studentReactsTo(s, a)).map(a => ({ dish: dish.name, label: allergenOf(a)?.label || a })))
    return { ...day, dishes, subscribed: isSubscribed(studentId), risks }
  })
}
