// ════════════════════════════════════════════════════════════════════════════
// LE SUIVI DU COMPORTEMENT — encourager d'abord, jamais classer.
//
// C'est le cœur de l'idée d'Othman : suivre l'élève au quotidien. Tous les ERP
// de la liste ont un « behavior management » (points positifs/négatifs,
// récompenses) — le nôtre le fait, mais à NOTRE façon, sous la règle n°9 :
//
//   « On OBSERVE un enfant, on ne le note pas — et on ne le compare à personne. »
//
// Conséquences directes, écrites dans le code :
//  1. L'ENCOURAGEMENT PASSE EN PREMIER. Les catégories positives sont la raison
//     d'être ; les « à améliorer » existent mais ne dominent pas l'écran.
//  2. AUCUN CLASSEMENT PUBLIC. Il n'y a pas de « top 5 » ni de « dernier de la
//     classe ». Un enfant voit SON parcours, pas celui des autres. La direction
//     voit des TENDANCES (l'ambiance d'une classe), pas un palmarès d'élèves.
//  3. LE PARENT EST PRÉVENU — surtout du positif. Un « a aidé un camarade
//     aujourd'hui » qui arrive le soir vaut plus que dix bulletins.
//  4. RIEN NE S'EFFACE. On peut retirer une observation saisie par erreur (avec
//     trace), mais l'historique d'un enfant ne se réécrit pas en silence.
// ════════════════════════════════════════════════════════════════════════════
import { db, mutate, uid, studentById } from './db.js'
import { now } from './clock.js'
import { notify } from './notify.js'

// Les catégories. `points` est indicatif (un repère de valorisation), PAS une
// note : on ne fait pas la moyenne, on ne compare pas. Les positives d'abord.
export const TRAITS = {
  // ── Encouragements ────────────────────────────────────────────────────────
  entraide:     { key:'entraide',     label:'A aidé un camarade',      positive:true,  points:2, icon:'HeartHandshake', tone:'ok' },
  participation:{ key:'participation', label:'Belle participation',     positive:true,  points:1, icon:'Hand',          tone:'ok' },
  effort:       { key:'effort',       label:'Gros effort',             positive:true,  points:2, icon:'TrendingUp',     tone:'ok' },
  progres:      { key:'progres',      label:'Progrès remarquable',     positive:true,  points:2, icon:'Sparkles',      tone:'ok' },
  respect:      { key:'respect',      label:'Respect & politesse',     positive:true,  points:1, icon:'Smile',         tone:'ok' },
  creativite:   { key:'creativite',   label:'Idée créative',           positive:true,  points:1, icon:'Lightbulb',     tone:'ok' },
  autonomie:    { key:'autonomie',    label:'Autonome & responsable',  positive:true,  points:1, icon:'Star',          tone:'ok' },
  // ── À améliorer (jamais une punition : un repère pour aider) ───────────────
  bavardage:    { key:'bavardage',    label:'Bavardage en classe',     positive:false, points:-1, icon:'MessageCircle', tone:'warn' },
  oubli:        { key:'oubli',        label:'Matériel oublié',         positive:false, points:-1, icon:'PackageX',      tone:'warn' },
  agitation:    { key:'agitation',    label:'Agité, a du mal à se poser', positive:false, points:-1, icon:'Wind',       tone:'warn' },
  retard_travail:{ key:'retard_travail', label:'Travail non rendu',    positive:false, points:-1, icon:'Clock',         tone:'warn' },
}

export const TRAIT_LIST = Object.values(TRAITS)
export const positiveTraits = () => TRAIT_LIST.filter(t => t.positive)
export const toImproveTraits = () => TRAIT_LIST.filter(t => !t.positive)
export const traitOf = k => TRAITS[k] || null

export const entries = () => db().behavior || []
export const entriesFor = studentId => entries().filter(e => e.studentId === studentId).sort((a,b)=>b.at-a.at)

/**
 * OBSERVER — l'enseignant note un comportement. Le parent est prévenu.
 * On n'invente pas de « points de sanction » : `points` est un repère de
 * valorisation, pas une monnaie.
 */
export function observe({ studentId, trait, note = '', byId, byName }) {
  const s = studentById(studentId)
  if (!s) return { error: 'Élève introuvable.' }
  const t = TRAITS[trait]
  if (!t) return { error: 'Quel comportement observez-vous ?' }
  const entry = {
    id: uid('bh'), studentId, classId: s.classId,
    trait, positive: t.positive, points: t.points,
    note: note.trim(), byId, byName, at: now(), removed: null,
  }
  mutate(d => { d.behavior = [entry, ...(d.behavior || [])] })
  // Le parent est prévenu — le positif est une bonne nouvelle, pas un dossier.
  if (s.parentId) {
    notify({
      to: s.parentId, kind: t.positive ? 'success' : 'info', actor: byName,
      title: t.positive ? `👏 ${s.name.split(' ')[0]} — ${t.label}` : `${s.name.split(' ')[0]} — à la maison ?`,
      body: note.trim() || t.label,
      link: '/app/behavior',
    })
  }
  return { entry }
}

/** Retirer une observation saisie par erreur — tracé, jamais effacé en silence. */
export function removeEntry(id, byName) {
  mutate(d => {
    const e = (d.behavior || []).find(x => x.id === id)
    if (e && !e.removed) e.removed = { by: byName, at: now() }
  })
  return { ok: true }
}

/** Le bilan d'un enfant : positifs, à améliorer, et son solde d'encouragement. */
export function studentSummary(studentId) {
  const all = entriesFor(studentId).filter(e => !e.removed)
  const positives = all.filter(e => e.positive)
  const toImprove = all.filter(e => !e.positive)
  // Le solde ne se COMPARE pas : c'est une jauge de son propre encouragement.
  const score = all.reduce((s, e) => s + e.points, 0)
  // le trait le plus fréquent — « ce pour quoi on le félicite le plus »
  const counts = {}
  positives.forEach(e => { counts[e.trait] = (counts[e.trait] || 0) + 1 })
  const topTrait = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || null
  return { total: all.length, positives: positives.length, toImprove: toImprove.length, score, topTrait, recent: all.slice(0, 8) }
}

/**
 * L'AMBIANCE d'une classe pour la direction — des TENDANCES, pas un palmarès.
 * On rend la répartition par trait et le rapport encouragements/rappels, jamais
 * un classement d'élèves. (Règle n°9.)
 */
export function classClimate(classId, days = 30) {
  const since = now() - days * 86400000
  const recent = entries().filter(e => e.classId === classId && !e.removed && e.at >= since)
  const positives = recent.filter(e => e.positive).length
  const toImprove = recent.length - positives
  const byTrait = {}
  recent.forEach(e => { byTrait[e.trait] = (byTrait[e.trait] || 0) + 1 })
  return {
    total: recent.length, positives, toImprove,
    positiveRate: recent.length ? Math.round(positives / recent.length * 100) : null,
    byTrait,
  }
}
