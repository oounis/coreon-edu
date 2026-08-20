// ════════════════════════════════════════════════════════════════════════════
// LES MOMENTS — le partage photo/vidéo de la journée de l'enfant.
//
// C'est l'attente n°1 d'une crèche (Famly en a fait sa signature) : le soir, le
// parent voit une photo de sa journée — la peinture, la sieste, le premier pas.
// Pour des enfants de 0 à 6 ans qui n'ont pas de portail, C'EST le lien.
//
// LA RÈGLE LA PLUS GRAVE ICI — LA VIE PRIVÉE DES ENFANTS :
//  Un parent ne voit QUE :
//    ① les moments où SON enfant est identifié, ET
//    ② les moments « de classe » (sans enfant identifié) de la classe de SON enfant.
//  Jamais la photo d'un enfant d'une autre famille sans lien. C'est tenu dans le
//  CŒUR (visibleToParent), pas dans l'écran — une règle qui ne vit que dans
//  l'interface n'est pas une règle.
//
//  LE CONSENTEMENT : un moment porte `consentOnly` — s'il est vrai, il ne part
//  qu'aux familles ayant autorisé la diffusion de photos (dossier de l'enfant).
//  On ne diffuse jamais l'image d'un enfant « par défaut ».
// ════════════════════════════════════════════════════════════════════════════
import { db, mutate, uid, studentById } from './db.js'
import { nowMs, ms } from './clock.js'
import { notify } from './notify.js'

export const moments = () => db().moments || []
export const momentById = id => moments().find(m => m.id === id) || null

/** Les classes des enfants d'un parent — pour décider ce qu'il a le droit de voir. */
function parentClassIds(user) {
  return (user?.childIds || []).map(id => studentById(id)?.classId).filter(Boolean)
}

/**
 * PARTAGER un moment. `media` = [{ type:'image'|'video', data, thumb?, name? }],
 * déjà compressé côté client. `childIds` identifie les enfants présents (peut
 * être vide = un moment « de toute la classe »).
 */
export function share({ classId, childIds = [], caption = '', media = [], byId, byName, consentOnly = false }) {
  if (!classId) return { error: 'À quelle classe appartient ce moment ?' }
  if (!media.length && !caption.trim()) return { error: 'Ajoutez une photo ou un mot.' }
  const m = {
    id: uid('mo'), classId, childIds: [...childIds], caption: caption.trim(),
    media, consentOnly, by: byId, byName, at: nowMs(),
    likes: [],           // les « cœurs » des parents — un retour simple, sans commentaire public
  }
  mutate(d => { d.moments = [m, ...(d.moments || [])] })
  // Prévenir les parents concernés — restreint à la classe (notify.js filtre déjà
  // par classId pour le rôle parent).
  notify({
    role: 'parent', classId, kind: 'success', actor: byName,
    title: '📸 Un nouveau moment partagé',
    body: caption.trim() || 'Une photo de la journée vous attend.',
    link: '/app/gallery',
  })
  return { moment: m }
}

/** Supprimer un moment — un parent peut demander le retrait d'une photo de son enfant. */
export function removeMoment(id) {
  mutate(d => { d.moments = (d.moments || []).filter(m => m.id !== id) })
  return { ok: true }
}

/** Un « cœur » du parent — bascule. Aucun commentaire public, juste un merci. */
export function toggleLike(id, userId) {
  mutate(d => {
    const m = (d.moments || []).find(x => x.id === id)
    if (!m) return
    m.likes = m.likes || []
    m.likes = m.likes.includes(userId) ? m.likes.filter(u => u !== userId) : [...m.likes, userId]
  })
  return momentById(id)
}

/**
 * LA RÈGLE DE VIE PRIVÉE, dans le cœur. Un moment est-il visible pour CE parent ?
 *   - son enfant est identifié dessus, OU
 *   - c'est un moment de classe (aucun enfant identifié) de la classe de son enfant.
 */
export function visibleToParent(moment, user) {
  const kids = user?.childIds || []
  if (moment.childIds.some(id => kids.includes(id))) return true
  // ⚠️ AUDIT 2026-07-25 : `consentOnly` était enregistré puis IGNORÉ — un moment
  // restreint atteignait toute la classe. Restreint = uniquement les parents des
  // enfants identifiés ; jamais par la règle « toute la classe ».
  if (moment.consentOnly) return false
  if (moment.childIds.length === 0 && parentClassIds(user).includes(moment.classId)) return true
  return false
}

/** Le fil d'un parent : uniquement ce qu'il a le droit de voir, du plus récent. */
export function feedForParent(user) {
  return moments().filter(m => visibleToParent(m, user)).sort((a, b) => ms(b.at) - ms(a.at))
}

/** Le fil d'une classe (enseignant/direction) : tout ce qui a été partagé pour elle. */
export function feedForClass(classId) {
  return moments().filter(m => m.classId === classId).sort((a, b) => ms(b.at) - ms(a.at))
}
