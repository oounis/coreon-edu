// ════════════════════════════════════════════════════════════════════════════
// « QUI A CONSULTÉ CE DOSSIER ? » — le côté LECTURE du journal d'audit.
//
// Les écritures se journalisent dans le cœur (childcare.js, hr.js, accounts.js…),
// là où elles ont lieu. Les LECTURES, non : le cœur ne sait pas qu'un écran a
// été ouvert. C'est l'écran qui doit le dire, et c'est ce crochet qui le dit.
//
// POURQUOI UN CROCHET ET PAS UN APPEL DIRECT : React remonte un composant sans
// que personne n'ait rien reconsulté (mode strict en développement, changement
// d'onglet, re-rendu du parent). Un `record()` posé dans le corps du composant
// écrirait une ligne à chaque rendu et noierait le journal. `useEffect` sur la
// clé du dossier n'écrit qu'au changement de dossier — et `record()` refuse en
// plus deux lectures identiques à moins de deux secondes d'intervalle.
//
// RÈGLE D'EMPLOI : on journalise l'ouverture du DOSSIER SENSIBLE, pas la page.
// Ouvrir la liste des élèves n'est pas un événement ; ouvrir l'onglet « Santé »
// de Yassine en est un. Passer `null` en sujet n'écrit rien : c'est ainsi qu'un
// onglet non sensible reste muet.
// ════════════════════════════════════════════════════════════════════════════
import { useEffect } from 'react'
import { auditRead } from '@core/audit.js'

/**
 * @param {string}  category  une clé de CATEGORIES (audit.js)
 * @param {object?} subject   { id, name, detail } — null/undefined = ne rien écrire
 */
export function useAuditRead(category, subject) {
  const id = subject?.id || ''
  const name = subject?.name || ''
  const detail = subject?.detail || ''
  useEffect(() => {
    if (!id) return
    auditRead(category, { id, name, detail, route: location.hash.replace(/^#/, '') || location.pathname })
  }, [category, id, name, detail])
}
