// ════════════════════════════════════════════════════════════════════════════
// L'INVENTAIRE LÉGER — savoir ce que l'école possède, et quand ça va manquer.
//
// Pas un logiciel d'entrepôt : une école de cent enfants veut trois choses —
// la liste, les quantités, et l'ALERTE quand un stock passe sous son seuil
// (les couches en crèche, le papier, les feutres). Chaque mouvement est
// journalisé (qui, quand, combien, pourquoi) : un stock qui bouge sans trace
// finit toujours en dispute.
// ════════════════════════════════════════════════════════════════════════════
import { db, mutate } from './db.js'

export const INV_CATS = {
  pedagogique: { key: 'pedagogique', label: 'Matériel pédagogique' },
  hygiene: { key: 'hygiene', label: 'Hygiène & petite enfance' },
  mobilier: { key: 'mobilier', label: 'Mobilier' },
  cuisine: { key: 'cuisine', label: 'Cuisine & cantine' },
  entretien: { key: 'entretien', label: 'Entretien' },
  technologie: { key: 'technologie', label: 'Technologie' },
  autre: { key: 'autre', label: 'Autre' },
}
export const invCatOf = k => INV_CATS[k] || INV_CATS.autre

export const items = () => db().inventory || []
export const itemById = id => items().find(x => x.id === id) || null

export function addItem({ name, category = 'autre', location = '', qty = 0, minQty = 0, by }) {
  if (!String(name || '').trim()) return { error: 'Nommez l\'article.' }
  const q = Math.max(0, Number(qty) || 0)
  const rec = {
    id: 'iv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    name: String(name).trim(), category, location: String(location || '').trim(),
    qty: q, minQty: Math.max(0, Number(minQty) || 0),
    moves: [{ at: Date.now(), by, delta: q, note: 'Entrée à l\'inventaire' }],
  }
  mutate(d => { d.inventory = [rec, ...(d.inventory || [])] })
  return { item: rec }
}

/** Bouger un stock : jamais sous zéro, toujours journalisé. */
export function adjust(id, delta, by, note = '') {
  const it = itemById(id)
  if (!it) return { error: 'Article introuvable.' }
  const n = Number(delta) || 0
  if (n === 0) return { error: 'Le mouvement est nul.' }
  if (it.qty + n < 0) return { error: `Impossible : il ne reste que ${it.qty} en stock.` }
  mutate(d => {
    d.inventory = d.inventory.map(x => x.id !== id ? x : {
      ...x, qty: x.qty + n,
      moves: [{ at: Date.now(), by, delta: n, note: String(note || '').trim() }, ...(x.moves || [])].slice(0, 30),
    })
  })
  return { qty: it.qty + n }
}

/** Ce qui va manquer — l'alerte que la direction veut voir sans chercher. */
export const lowStock = () => items().filter(x => x.qty <= x.minQty)
