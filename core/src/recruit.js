// ════════════════════════════════════════════════════════════════════════════
// LE RECRUTEMENT — le pipeline d'embauche d'une petite école.
//
// Un poste ouvert, des candidatures, et un parcours SANS SAUT — la même
// discipline que les admissions : reçue → entretien → offre → embauchée
// (ou refusée, à toute étape, motivée). Personne ne passe à « offre » sans
// entretien : on n'embauche pas un CV, on embauche une personne qu'on a vue —
// dans une école, celle-ci passera ses journées avec des enfants.
// ════════════════════════════════════════════════════════════════════════════
import { db, mutate } from './db.js'

export const POST_TYPES = ['Éducatrice / Éducateur', 'Enseignant(e)', 'Assistant(e) maternelle', 'Surveillant(e)', 'Cuisine', 'Entretien', 'Administration', 'Autre']

export const R_STAGES = {
  recue: { key: 'recue', label: 'Reçue', tone: 'info', next: ['entretien', 'refusee'] },
  entretien: { key: 'entretien', label: 'Entretien', tone: 'warn', next: ['offre', 'refusee'] },
  offre: { key: 'offre', label: 'Offre faite', tone: 'info', next: ['embauchee', 'refusee'] },
  embauchee: { key: 'embauchee', label: 'Embauchée', tone: 'ok', terminal: true, next: [] },
  refusee: { key: 'refusee', label: 'Refusée', tone: 'danger', terminal: true, next: [] },
}

export const posts = () => db().recruitPosts || []
export const candidates = () => db().recruitCandidates || []
export const candidatesOf = postId => candidates().filter(c => c.postId === postId)

export function openPost({ title, type = 'Autre', by }) {
  if (!String(title || '').trim()) return { error: 'Nommez le poste.' }
  const rec = { id: 'po' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title: String(title).trim(), type, status: 'ouvert', at: Date.now(), by }
  mutate(d => { d.recruitPosts = [rec, ...(d.recruitPosts || [])] })
  return { post: rec }
}

export function closePost(id, by) {
  const p = posts().find(x => x.id === id)
  if (!p) return { error: 'Poste introuvable.' }
  mutate(d => { d.recruitPosts = d.recruitPosts.map(x => x.id !== id ? x : { ...x, status: x.status === 'ouvert' ? 'ferme' : 'ouvert', closedBy: by }) })
  return { ok: true }
}

export function addCandidate({ postId, name, phone = '', email = '', note = '' }) {
  const p = posts().find(x => x.id === postId)
  if (!p) return { error: 'Poste introuvable.' }
  if (p.status !== 'ouvert') return { error: 'Ce poste est fermé — rouvrez-le pour recevoir des candidatures.' }
  if (!String(name || '').trim()) return { error: 'Le nom est requis.' }
  const rec = {
    id: 'ca' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    postId, name: String(name).trim(), phone, email, note: String(note || '').trim(),
    stage: 'recue', at: Date.now(),
    history: [{ at: Date.now(), stage: 'recue', by: 'Guichet' }],
  }
  mutate(d => { d.recruitCandidates = [rec, ...(d.recruitCandidates || [])] })
  return { candidate: rec }
}

/** Avancer une candidature — les sauts d'étape sont refusés, le refus est motivé. */
export function advanceCandidate(id, stage, by, note = '') {
  const c = candidates().find(x => x.id === id)
  if (!c) return { error: 'Candidature introuvable.' }
  if (!R_STAGES[c.stage]?.next.includes(stage)) {
    return { error: `Passage impossible : ${R_STAGES[c.stage].label} → ${R_STAGES[stage]?.label || stage}. On n'embauche pas un CV sans entretien.` }
  }
  if (stage === 'refusee' && !String(note || '').trim()) {
    return { error: 'Un refus se motive — c\'est ce qu\'on répondra à la personne.' }
  }
  mutate(d => {
    d.recruitCandidates = d.recruitCandidates.map(x => x.id !== id ? x
      : { ...x, stage, history: [...x.history, { at: Date.now(), stage, by, note: String(note || '').trim() }] })
  })
  return { candidate: candidates().find(x => x.id === id) }
}
