// ════════════════════════════════════════════════════════════════════════════
// LES EMAILS DU CANDIDAT — le seul canal qui touche un prospect sans compte.
//
// Une pré-inscription est déposée par un VISITEUR (pas encore parent, pas de
// compte). Les notifications in-app ne l'atteignent donc jamais : son unique
// lien avec l'école, c'est son email. On lui écrit à la SOUMISSION, puis à
// CHAQUE changement d'étape — accepté, refusé, pièces à fournir, liste
// d'attente, inscrit. S'il est accepté et inscrit, il deviendra parent ensuite.
//
// Ces fonctions sont PURES : elles construisent le contenu, sans rien envoyer
// ni stocker. Donc testables (`node --test`) et réutilisables telles quelles
// côté serveur le jour du backend.
// ════════════════════════════════════════════════════════════════════════════
import { labelOf } from './levels.js'

// Nom d'école affiché dans la signature — surchargé via `extra.school`.
export const SCHOOL_NAME = 'Votre établissement'

// Les étapes qui MÉRITENT un email au candidat (toutes celles qui le concernent).
export const APPLICANT_STAGES = ['nouvelle', 'pieces', 'examen', 'accepte', 'attente', 'inscrit', 'refuse']
export const emailsApplicant = stage => APPLICANT_STAGES.includes(stage)

/**
 * Construit l'email destiné au candidat pour une étape donnée.
 * Retourne { to, subject, text, stage } — ou `null` si l'étape n'écrit pas au
 * candidat. `to` peut être null (le candidat n'a pas laissé d'email) : c'est à
 * l'appelant de décider quoi en faire, la fonction ne ment pas.
 */
export function applicantEmail(app, stage, extra = {}) {
  if (!app || !emailsApplicant(stage)) return null
  const school = extra.school || SCHOOL_NAME
  const child = app.childName || 'votre enfant'
  const level = labelOf(app.level)
  const ref = app.id
  const hi = `Bonjour ${app.parentName || ''}`.trim() + ','

  const M = {
    nouvelle: {
      subject: `Pré-inscription bien reçue · ${child}`,
      body: `Nous confirmons la réception de votre demande de pré-inscription pour ${child} (${level}). `
        + `Votre dossier est enregistré et sera examiné par notre équipe. `
        + `Vous serez informé(e) par email à chaque étape.`,
    },
    pieces: {
      subject: `Pièces à fournir : pré-inscription de ${child}`,
      body: `Pour poursuivre l'examen du dossier de ${child}, merci de nous fournir les pièces justificatives`
        + (extra.missing && extra.missing.length ? ` suivantes : ${extra.missing.join(', ')}.` : ' demandées.')
        + ` Dès leur réception, le dossier passera à l'étude.`,
    },
    examen: {
      subject: `Votre dossier est à l'étude · ${child}`,
      body: `Le dossier de ${child} est complet et se trouve désormais à l'étude par notre commission d'admission. `
        + `Nous reviendrons vers vous dès qu'une décision sera prise.`,
    },
    accepte: {
      subject: `Félicitations · ${child} est accepté(e)`,
      body: `Nous avons le plaisir de vous informer que la candidature de ${child} (${level}) a été ACCEPTÉE. `
        + `Nous vous contacterons pour finaliser l'inscription et l'attribution d'une classe.`,
    },
    attente: {
      subject: `Liste d'attente · ${child}`,
      body: `La candidature de ${child} a été acceptée, mais les places sont pour l'instant complètes. `
        + `${child} est placé(e) sur LISTE D'ATTENTE : dès qu'une place se libère, nous vous contacterons en priorité.`,
    },
    inscrit: {
      subject: `${child} est inscrit(e) · bienvenue !`,
      body: `C'est officiel : ${child} est désormais INSCRIT(E)`
        + (extra.className ? ` en classe ${extra.className}` : '')
        + `. Un compte parent vous sera ouvert pour suivre la scolarité (notes, présences, paiements). Bienvenue à ${school} !`,
    },
    refuse: {
      subject: `Suite de votre demande · ${child}`,
      body: `Après examen attentif du dossier de ${child}, nous ne sommes malheureusement pas en mesure de donner `
        + `une suite favorable à votre demande pour cette période. Nous vous remercions de votre confiance.`,
    },
  }
  const m = M[stage]
  const text = `${hi}\n\n${m.body}\n\nRéférence de votre dossier : ${ref}\n\nCordialement,\n${school}`
  return { to: app.parentEmail || null, subject: m.subject, text, stage }
}
