// ════════════════════════════════════════════════════════════════════════════
// BULLETINS & PASSAGE DE CLASSE.
//
// Recherche (kogia-research, vérifié 3-0) : le passage d'année est un processus
// ADMINISTRATIF DISCRET, NON TRIVIAL et SOUVENT IRRÉVERSIBLE (« End-of-Year
// Process » chez PowerSchool) — et chez Classter il est COUPLÉ AU MODULE DE
// FACTURATION : le système doit savoir si un passage compte comme une
// RÉINSCRIPTION, parce que ça décide de ce que la famille paiera.
//
// Donc ce n'est PAS « grade = grade + 1 ».
//
// CE QUE ÇA IMPOSE, ET QUE NOUS TENONS ICI :
//  1. UN APERÇU AVANT D'AGIR. On voit qui passe, qui redouble, qui sort diplômé,
//     et où il n'y a PAS DE PLACE — avant de toucher quoi que ce soit.
//  2. LA CAPACITÉ DÉCIDE. Une classe pleine n'accueille pas un élève de plus,
//     même au passage. Le produit ne ment jamais sur une place.
//  3. C'EST DATÉ, SIGNÉ, ET ARCHIVÉ. Un passage laisse une trace ; on ne le
//     découvre pas six mois plus tard dans un tableur.
//  4. LA CONSÉQUENCE FINANCIÈRE EST DITE. Le niveau change → le barème change →
//     la facture de l'an prochain change. On le montre AVANT, pas après.
//
// L'ÉVALUATION EN PETITE ENFANCE N'EST PAS UNE NOTE. Un enfant de trois ans n'a
// pas une moyenne sur 20 — il a des acquis observés. Deux barèmes, un seul module.
// ════════════════════════════════════════════════════════════════════════════
import { db, save } from './db.js'
import { now, todayIso } from './clock.js'
import { LEVELS, levelOf, labelOf, nextLevel, isEarly } from './levels.js'
import { feesOf } from './accounting.js'

// ── Deux barèmes, parce que deux réalités ───────────────────────────────────
/** Primaire : une note sur 20 (usage tunisien). */
export const MARK_MAX = 20
export const PASS_MARK = 10

/** Petite enfance : des ACQUIS observés. Jamais une note. */
export const ACQUIS = [
  { key: 'acquis',   label: 'Acquis',          tone: 'ok' },
  { key: 'encours',  label: 'En cours',        tone: 'info' },
  { key: 'debut',    label: 'À découvrir',     tone: 'warn' },
]

/** Les domaines de la petite enfance (socle inspiré des programmes maternelle). */
export const DOMAINS = [
  { key: 'langage',   label: 'Langage & communication' },
  { key: 'motricite', label: 'Motricité' },
  { key: 'social',    label: 'Vivre ensemble' },
  { key: 'autonomie', label: 'Autonomie' },
  { key: 'creation',  label: 'Explorer & créer' },
]

/** Primaire : les matières notées. Elles vivaient dans l'écran ; elles vivent
 *  ici pour que la saisie par classe, le mobile et les tests parlent de la
 *  MÊME liste. */
export const SUBJECTS = ['Mathématiques', 'Français', 'Arabe', 'Éveil scientifique', 'Anglais']

/** Ce qu'on remplit pour un niveau donné : des matières, ou des domaines.
 *  Rend toujours [{key,label}] — l'écran n'a pas à savoir lequel des deux. */
export function columnsFor(level) {
  return isEarly(level)
    ? DOMAINS.map(d => ({ ...d, kind: 'acquis' }))
    : SUBJECTS.map(s => ({ key: s, label: s, kind: 'note' }))
}

// ── Trimestres ──────────────────────────────────────────────────────────────
export const TERMS = [
  { key: 't1', label: '1er trimestre' },
  { key: 't2', label: '2ème trimestre' },
  { key: 't3', label: '3ème trimestre' },
]

export const reports = () => db().reports || []
export const reportOf = (studentId, term) =>
  reports().find(r => r.studentId === studentId && r.term === term) || null

/**
 * Enregistrer un bulletin. Le contenu dépend du CYCLE, pas d'un réglage :
 *  · primaire       → { [matière]: note }
 *  · petite enfance → { [domaine]: 'acquis' | 'encours' | 'debut' }
 */
export function saveReport({ studentId, term, marks, comment, by }) {
  const d = db()
  const st = (d.students || []).find(s => s.id === studentId)
  const cls = (d.classes || []).find(c => c.id === st?.classId)
  const r = {
    id: 'rp' + Date.now().toString(36),
    studentId, term, level: cls?.level,
    early: isEarly(cls?.level),
    marks: marks || {},
    comment: comment || '',
    by, at: now(),
  }
  d.reports = [...(d.reports || []).filter(x => !(x.studentId === studentId && x.term === term)), r]
  save(d)
  return r
}

/**
 * SAISIE PAR CLASSE (CR-022) — noter toute la classe d'un coup.
 *
 * Saisir élève par élève est la tâche la plus répétitive du métier : c'est là
 * que le produit fait gagner du temps ou en fait perdre. On enregistre donc un
 * lot, et on l'enregistre comme la saisie unitaire : même fonction, mêmes
 * règles, aucun chemin parallèle qui pourrait diverger.
 *
 * PARTIEL AUTORISÉ : un enseignant interrompu enregistre ce qu'il a saisi et
 * reprend plus tard. Une case vide n'écrase donc jamais une note déjà là ;
 * un bulletin sans AUCUNE note n'est pas créé (on ne fabrique pas des
 * bulletins vides pour des élèves qu'on n'a pas encore notés).
 *
 * Rend { saved, skipped, invalid } — l'appelant peut le dire à l'écran.
 */
export function saveClassReports({ classId, term, rows, comments = {}, by }) {
  const d = db()
  const students = (d.students || []).filter(s => s.classId === classId && !s.archived)
  const cls = (d.classes || []).find(c => c.id === classId)
  const early = isEarly(cls?.level)
  const cols = columnsFor(cls?.level)
  const valid = new Set(cols.map(c => c.key))
  const acquis = new Set(ACQUIS.map(a => a.key))

  let saved = 0, skipped = 0, invalid = 0
  for (const s of students) {
    const incoming = rows[s.id] || {}
    const prev = reportOf(s.id, term)
    const marks = { ...(prev?.marks || {}) }
    let touched = false
    for (const [k, v] of Object.entries(incoming)) {
      if (!valid.has(k)) { invalid++; continue }
      if (v === '' || v === undefined || v === null) continue      // vide ≠ effacer
      if (early) {
        if (!acquis.has(v)) { invalid++; continue }
      } else {
        const n = Number(v)
        if (!Number.isFinite(n) || n < 0 || n > MARK_MAX) { invalid++; continue }
        marks[k] = n; touched = true; continue
      }
      marks[k] = v; touched = true
    }
    const comment = comments[s.id] !== undefined ? comments[s.id] : (prev?.comment || '')
    if (!touched && comment === (prev?.comment || '')) { skipped++; continue }
    if (!Object.keys(marks).length) { skipped++; continue }        // pas de bulletin vide
    saveReport({ studentId: s.id, term, marks, comment, by })
    saved++
  }
  return { saved, skipped, invalid }
}

/** Ce qui est déjà saisi pour une classe : de quoi reprendre où l'on s'est arrêté. */
export function classGrid(classId, term) {
  const d = db()
  const cls = (d.classes || []).find(c => c.id === classId)
  const students = (d.students || []).filter(s => s.classId === classId && !s.archived)
  const rows = {}, comments = {}
  for (const s of students) {
    const r = reportOf(s.id, term)
    rows[s.id] = { ...(r?.marks || {}) }
    comments[s.id] = r?.comment || ''
  }
  return { level: cls?.level, early: isEarly(cls?.level), columns: columnsFor(cls?.level), students, rows, comments }
}

/** La moyenne d'une COLONNE : la classe a-t-elle décroché sur cette matière ? */
export function columnAverage(rows, key) {
  const v = Object.values(rows).map(r => Number(r?.[key])).filter(n => Number.isFinite(n))
  if (!v.length) return null
  return Math.round(v.reduce((s, n) => s + n, 0) / v.length * 100) / 100
}

/** La moyenne d'une LIGNE, calculée en direct pendant la saisie. */
export function rowAverage(row) {
  const v = Object.values(row || {}).map(Number).filter(n => Number.isFinite(n))
  if (!v.length) return null
  return Math.round(v.reduce((s, n) => s + n, 0) / v.length * 100) / 100
}

/** La moyenne — primaire uniquement. En petite enfance, elle n'a AUCUN sens. */
export function average(report) {
  if (!report || report.early) return null
  const v = Object.values(report.marks || {}).filter(n => typeof n === 'number')
  if (!v.length) return null
  return Math.round(v.reduce((s, n) => s + n, 0) / v.length * 100) / 100
}

/** La moyenne annuelle : les trois trimestres. C'est elle qui décide du passage. */
export function yearAverage(studentId) {
  const rs = TERMS.map(t => reportOf(studentId, t.key)).filter(Boolean)
  if (!rs.length || rs[0].early) return null
  const avgs = rs.map(average).filter(n => n != null)
  if (!avgs.length) return null
  return Math.round(avgs.reduce((s, n) => s + n, 0) / avgs.length * 100) / 100
}

// ── LE PASSAGE DE CLASSE ────────────────────────────────────────────────────
export const DECISIONS = {
  passe:    { key: 'passe',    label: 'Passe',        tone: 'ok' },
  redouble: { key: 'redouble', label: 'Redouble',     tone: 'warn' },
  diplome:  { key: 'diplome',  label: 'Fin de cycle', tone: 'info' },
  bloque:   { key: 'bloque',   label: 'Pas de place', tone: 'danger' },
}

export const CAPACITY = 24
const seatsIn = (classId, students) => students.filter(s => s.classId === classId).length

/**
 * L'APERÇU — RÈGLE 1. On voit tout AVANT de toucher à quoi que ce soit.
 *
 * Pour chaque élève : sa décision, sa classe d'arrivée, et la CONSÉQUENCE
 * FINANCIÈRE (le barème du niveau suivant). Rien n'est écrit ici.
 */
export function previewPromotion() {
  const d = db()
  const students = d.students || []
  const classes = d.classes || []

  // On simule le remplissage au fur et à mesure : sinon on promettrait la même
  // place à trois élèves.
  const filling = {}
  classes.forEach(c => { filling[c.id] = seatsIn(c.id, students) })

  const rows = students.map(s => {
    const cls = classes.find(c => c.id === s.classId)
    const lvl = cls?.level
    const early = isEarly(lvl)
    const avg = early ? null : yearAverage(s.id)

    // Décision. En primaire : la moyenne annuelle. En petite enfance : on passe —
    // on ne fait pas redoubler un enfant de quatre ans sur des acquis.
    let decision = 'passe'
    if (!early && avg != null && avg < PASS_MARK) decision = 'redouble'

    const nxt = nextLevel(lvl)
    if (decision === 'passe' && !nxt) decision = 'diplome'

    let target = null, targetClass = null
    if (decision === 'passe') {
      target = nxt.key
      // La première classe du niveau visé qui a encore une place.
      const candidate = classes
        .filter(c => c.level === target)
        .find(c => filling[c.id] < CAPACITY)
      if (candidate) { targetClass = candidate; filling[candidate.id]++ }
      else decision = 'bloque'          // RÈGLE 2 : la capacité décide.
    }
    if (decision === 'redouble') { target = lvl; targetClass = cls }

    // RÈGLE 4 : la conséquence financière, dite AVANT.
    const feesNow  = feesOf(lvl)
    const feesNext = target ? feesOf(target) : null
    const sum = f => f ? Object.values(f).reduce((a, b) => a + b, 0) : 0
    const delta = sum(feesNext) - sum(feesNow)

    return {
      student: s, from: lvl, fromClass: cls,
      average: avg, decision,
      to: target, toClass: targetClass,
      feeDelta: target ? delta : 0,
    }
  })

  return {
    rows,
    summary: {
      passe:    rows.filter(r => r.decision === 'passe').length,
      redouble: rows.filter(r => r.decision === 'redouble').length,
      diplome:  rows.filter(r => r.decision === 'diplome').length,
      bloque:   rows.filter(r => r.decision === 'bloque').length,
    },
  }
}

/**
 * EXÉCUTER — RÈGLE 3. Daté, signé, archivé.
 *
 * On refuse d'exécuter s'il reste des élèves BLOQUÉS : le passage ne doit pas
 * « oublier » un enfant en silence. L'école ouvre une classe, ou décide autrement.
 */
export function runPromotion(by, { allowBlocked = false } = {}) {
  const p = previewPromotion()
  if (p.summary.bloque && !allowBlocked) {
    return { error: `${p.summary.bloque} élève(s) n’ont pas de place dans le niveau supérieur. Ouvrez une classe, ou confirmez pour les laisser en attente.` }
  }

  const d = db()
  const year = todayIso().slice(0, 4)
  const moved = []

  d.students = (d.students || []).map(s => {
    const r = p.rows.find(x => x.student.id === s.id)
    if (!r) return s
    if (r.decision === 'passe' && r.toClass) {
      moved.push({ id: s.id, name: s.name, from: r.from, to: r.to, decision: 'passe' })
      return { ...s, classId: r.toClass.id }
    }
    if (r.decision === 'diplome') {
      moved.push({ id: s.id, name: s.name, from: r.from, to: null, decision: 'diplome' })
      // Diplômé : il quitte l'école. On ARCHIVE, on ne supprime pas — un dossier
      // scolaire ne disparaît jamais.
      return { ...s, classId: null, archived: true, archivedAt: now(), archivedReason: 'Fin de cycle' }
    }
    if (r.decision === 'redouble') moved.push({ id: s.id, name: s.name, from: r.from, to: r.from, decision: 'redouble' })
    return s
  })

  d.promotions = [{
    id: 'pr' + Date.now().toString(36),
    year, at: now(), by,
    summary: p.summary,
    moved,
  }, ...(d.promotions || [])]
  save(d)
  return { ok: true, summary: p.summary }
}

export const promotions = () => db().promotions || []

// ── Sortie d'un élève (départ, transfert) ───────────────────────────────────
/** On ARCHIVE. On ne supprime jamais un dossier scolaire. */
export function withdraw(studentId, reason, by) {
  if (!reason?.trim()) return { error: 'Un motif est obligatoire.' }
  const d = db()
  d.students = (d.students || []).map(s => s.id !== studentId ? s
    : { ...s, classId: null, archived: true, archivedAt: now(), archivedReason: reason, archivedBy: by })
  save(d)
  return { ok: true }
}

export const activeStudents = () => (db().students || []).filter(s => !s.archived)
export const archivedStudents = () => (db().students || []).filter(s => s.archived)

export { labelOf, LEVELS, levelOf, isEarly }
