// ════════════════════════════════════════════════════════════════════════════
// LES COMPTES — l'annuaire de l'école, tenu par la Direction.
//
// Le modèle commercial est simple : la plateforme (Kogia) livre UNE école avec
// UN compte Direction. Ensuite, la Direction est l'« Active Directory » de son
// établissement : elle crée, modifie, désactive et rattache tous les comptes —
// enseignants, surveillants, sécurité, parents. Kogia ne touche plus à rien.
//
// LES RÈGLES (celles qui évitent les catastrophes) :
//  1. Un e-mail = un compte. Deux comptes sur le même e-mail rendraient la
//     connexion ambiguë — refusé à la création ET à la modification.
//  2. LE DERNIER COMPTE DIRECTION ACTIF EST INTOUCHABLE : ni désactivé, ni
//     rétrogradé. Une école qui se verrouille dehors n'a plus d'école.
//  3. On ne SUPPRIME jamais un compte : on le désactive. La trace reste —
//     même principe que le dossier scolaire (règle n°5).
//  4. Le compte plateforme (owner) ne se gère pas depuis l'école.
// ════════════════════════════════════════════════════════════════════════════
import { db, mutate, uid, setParentChildren } from './db.js'

export const MANAGEABLE_ROLES = ['schooladmin', 'admin', 'teacher', 'supervisor', 'security', 'parent']

const emailTaken = (d, email, exceptId = null) =>
  (d.users || []).some(u => u.id !== exceptId && String(u.email || '').toLowerCase() === String(email || '').trim().toLowerCase())

const activeDirections = d => (d.users || []).filter(u => u.role === 'schooladmin' && !u.disabled)
const isLastDirection = (d, id) => {
  const dirs = activeDirections(d)
  return dirs.length === 1 && dirs[0].id === id
}

/** Créer un compte. Retourne { user } ou { error } — jamais un demi-compte. */
export function createAccount(f) {
  const d = db()
  if (!String(f.name || '').trim() || !String(f.email || '').trim()) return { error: 'Nom et e-mail requis.' }
  if (!MANAGEABLE_ROLES.includes(f.role)) return { error: 'Rôle inconnu.' }
  if (emailTaken(d, f.email)) return { error: 'Cet e-mail a déjà un compte — un e-mail, un compte.' }
  const id = uid('u')
  mutate(db => {
    const user = {
      id, role: f.role, name: f.name.trim(), email: f.email.trim(), pw: f.pw || '1234',
      cin: f.cin || '', gender: f.gender || 'Homme', governorate: f.governorate || '',
      phone: f.phone || '', address: f.address || '', attachments: f.attachments || [],
    }
    if (f.role === 'parent') { user.occupation = f.occupation || ''; user.childIds = [] }
    else user.position = f.position || ''
    if (f.role === 'teacher') {
      const tid = uid('t')
      db.teachers.push({ id: tid, name: user.name, subject: f.subject || '—', designation: f.position || '', classes: [], experience: 0, phone: f.phone || '', email: user.email, cin: f.cin || '', governorate: f.governorate || '', position: f.position || '', attachments: f.attachments || [] })
      user.teacherId = tid
    }
    db.users.push(user)
    if (f.role === 'parent') setParentChildren(db, id, f.childIds || [])
  })
  return { user: db().users.find(u => u.id === id) }
}

/** Modifier un compte : identité, contact, RÔLE, enfants — sous les règles. */
export function updateAccount(id, patch) {
  const d = db()
  const u = (d.users || []).find(x => x.id === id)
  if (!u) return { error: 'Compte introuvable.' }
  if (u.role === 'owner') return { error: 'Le compte plateforme ne se gère pas depuis l\'école.' }
  if (patch.email !== undefined && emailTaken(d, patch.email, id)) return { error: 'Cet e-mail a déjà un compte.' }
  if (patch.role && !MANAGEABLE_ROLES.includes(patch.role)) return { error: 'Rôle inconnu.' }
  if (patch.role && patch.role !== 'schooladmin' && isLastDirection(d, id))
    return { error: 'Impossible : c\'est le dernier compte Direction actif. Nommez d\'abord une autre Direction.' }
  mutate(db => {
    const x = db.users.find(y => y.id === id)
    for (const k of ['name', 'email', 'role', 'phone', 'address', 'position', 'occupation', 'cin', 'governorate', 'gender'])
      if (patch[k] !== undefined) x[k] = typeof patch[k] === 'string' ? patch[k].trim() : patch[k]
    if (patch.subject !== undefined && x.teacherId) { const t = db.teachers.find(y => y.id === x.teacherId); if (t) t.subject = patch.subject }
    if (patch.childIds !== undefined && x.role === 'parent') setParentChildren(db, id, patch.childIds)
  })
  return { user: db().users.find(x => x.id === id) }
}

/** Activer / désactiver — jamais le dernier compte Direction, jamais l'owner. */
export function setDisabled(id, disabled) {
  const d = db()
  const u = (d.users || []).find(x => x.id === id)
  if (!u) return { error: 'Compte introuvable.' }
  if (u.role === 'owner') return { error: 'Le compte plateforme ne se gère pas depuis l\'école.' }
  if (disabled && isLastDirection(d, id))
    return { error: 'Impossible : c\'est le dernier compte Direction actif — l\'école se verrouillerait dehors.' }
  mutate(db => { const x = db.users.find(y => y.id === id); if (x) x.disabled = !!disabled })
  return { ok: true }
}

/** Nouveau mot de passe temporaire. (En mode serveur, il part haché — jamais en clair.) */
export function resetPassword(id) {
  const d = db()
  const u = (d.users || []).find(x => x.id === id)
  if (!u) return { error: 'Compte introuvable.' }
  if (u.role === 'owner') return { error: 'Le compte plateforme ne se gère pas depuis l\'école.' }
  const tmp = Math.random().toString(36).slice(2, 8)
  mutate(db => { const x = db.users.find(y => y.id === id); if (x) x.pw = tmp })
  return { pw: tmp }
}

/** Le tableau de l'annuaire : combien de comptes, par rôle, actifs/désactivés. */
export function directory() {
  const d = db()
  const rows = MANAGEABLE_ROLES.map(role => {
    const us = (d.users || []).filter(u => u.role === role)
    return { role, total: us.length, active: us.filter(u => !u.disabled).length, disabled: us.filter(u => u.disabled).length }
  }).filter(r => r.total)
  return { rows, total: rows.reduce((s, r) => s + r.total, 0), disabled: rows.reduce((s, r) => s + r.disabled, 0) }
}
