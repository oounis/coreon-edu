// ════════════════════════════════════════════════════════════════════════════
// LES DOCUMENTS OFFICIELS — délivrés AU GUICHET, numérotés, journalisés.
//
// Un parent se présente au comptoir : « il me faut un certificat de scolarité
// pour la CNSS ». L'administration le délivre en une minute — sans circuit de
// validation (le guichet, c'est l'administration elle-même) mais JAMAIS sans
// trace : chaque document porte un NUMÉRO DE SÉRIE par type et par année, et
// s'inscrit au REGISTRE. Une série qui saute est une remarque d'audit ; un
// document sans trace n'existe pas.
//
// (Le parent peut aussi DEMANDER un document à distance : c'est le circuit des
//  Demandes (tunisia.js). Ici, c'est le guichet — les deux mènent au registre.)
//
// LES RÈGLES :
//  1. Le registre est APPEND-ONLY : rien ne s'y modifie, rien ne s'y efface.
//  2. Un certificat de scolarité/présence n'existe que pour un élève ACTIF.
//  3. Un certificat de radiation n'existe que pour un dossier ARCHIVÉ —
//     et un dossier archivé reste là pour toujours (règle n°5).
// ════════════════════════════════════════════════════════════════════════════
import { db, mutate, studentById } from './db.js'
import { todayIso } from './clock.js'

export const DOC_TYPES = {
  scolarite: {
    key: 'scolarite', label: 'Certificat de scolarité', prefix: 'CS', needs: 'active',
    hint: 'Le plus demandé au guichet : CNSS, banque, employeur.',
  },
  inscription: {
    key: 'inscription', label: "Attestation d'inscription", prefix: 'AI', needs: 'active',
    hint: "L'élève est inscrit pour l'année en cours, même avant la rentrée.",
  },
  presence: {
    key: 'presence', label: 'Attestation de présence', prefix: 'AP', needs: 'active',
    hint: "L'élève fréquente l'établissement · souvent exigée par l'employeur d'un parent.",
  },
  radiation: {
    key: 'radiation', label: 'Certificat de radiation', prefix: 'CR', needs: 'archived',
    hint: "L'élève a quitté l'établissement · la nouvelle école l'exige. Dossier archivé seulement.",
  },
}
export const DOC_LIST = Object.values(DOC_TYPES)
export const docTypeOf = k => DOC_TYPES[k] || null

export const registry = () => db().documents || []

// CS-2026-0001, CS-2026-0002… — une série PAR TYPE et PAR ANNÉE, sans trou.
function nextNumber(prefix) {
  const year = todayIso().slice(0, 4)
  const n = registry().filter(x => String(x.number || '').startsWith(`${prefix}-${year}-`)).length + 1
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`
}

/** Délivrer un document : contrôles d'état, numéro de série, registre. */
export function issueDocument({ type, studentId, addressedTo = '', by }) {
  const t = DOC_TYPES[type]
  if (!t) return { error: 'Type de document inconnu.' }
  const s = studentById(studentId)
  if (!s) return { error: 'Élève introuvable.' }
  if (t.needs === 'active' && s.archived)
    return { error: 'Ce document ne se délivre que pour un élève actif. Pour un départ : certificat de radiation.' }
  if (t.needs === 'archived' && !s.archived)
    return { error: "La radiation ne se délivre que pour un dossier archivé : cet élève est encore inscrit." }

  const rec = {
    id: 'doc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    number: nextNumber(t.prefix),
    type, studentId, studentName: s.name, classId: s.classId,
    addressedTo: String(addressedTo || '').trim(),
    at: Date.now(), date: todayIso(), by,
  }
  mutate(d => { d.documents = [rec, ...(d.documents || [])] })
  return { doc: rec }
}

/** Le registre du mois — ce que la direction veut voir d'un coup d'œil. */
export function docSummary() {
  const month = todayIso().slice(0, 7)
  return { total: registry().length, thisMonth: registry().filter(x => (x.date || '').startsWith(month)).length }
}
