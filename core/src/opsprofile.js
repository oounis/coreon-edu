// ════════════════════════════════════════════════════════════════════════════
// FICHE TECHNIQUE D'UNE ÉCOLE (CR-014)
//
// En tant que Kogia Group, on exploite la plateforme pour chaque école. Sans
// une vue technique, diagnostiquer un souci client oblige à ouvrir un terminal.
//
// Othman (2026-07-22) : « prépare ce qu'on a MAINTENANT ». Donc : on montre ce
// qui existe (domaine dérivé de l'e-mail, plan, contact Direction, statut,
// révision et activité pour l'école de démo), et on MARQUE clairement ce qui
// n'est pas encore collecté (IP, ports, hébergeur, région des données) plutôt
// que d'inventer. Une fiche honnête vaut mieux qu'une fiche qui ment.
//
// Ce module ne connaît pas React : il assemble un objet, l'écran l'affiche.
// ════════════════════════════════════════════════════════════════════════════

const TBD = null   // « à collecter » : champ pas encore renseigné, marqué comme tel

/** Le domaine déduit de l'e-mail Direction (ou le domaine explicite s'il existe). */
export function domainOf(school) {
  if (school?.domain) return school.domain
  const at = String(school?.email || '').split('@')[1]
  return at || null
}

/**
 * La fiche technique d'une école, telle qu'on peut la dresser AUJOURD'HUI.
 * `db` est passé en argument pour rester testable sans le singleton.
 * Retourne des sections, chacune avec des lignes { label, value, missing }.
 */
export function techProfile(school, db) {
  const dom = domainOf(school)
  const liveStudents = school?.live ? (db?.students?.length ?? null) : (Number(school?.studentCount) || 0)
  const rev = school?.live ? (Number(db?._rev) || db?.revision || null) : null

  const line = (label, value) => ({ label, value: value ?? TBD, missing: value == null || value === '' })

  return {
    dom,
    identite: [
      line('Nom', school?.name),
      line('Ville', school?.city),
      line('Cliente depuis', school?.since),
      line('Plan', school?.plan ? `${school.plan} · ${school.price ?? '·'} / mois` : null),
      line('Statut', school?.status),
      line('Élèves', liveStudents),
    ],
    contact: [
      line('Direction', school?.director),
      line('E-mail Direction', school?.email),
      line('Domaine', dom),
    ],
    // ── Ce qu'on n'a PAS encore : marqué « à collecter », jamais inventé ──
    infra: [
      line('Sous-domaine dédié', dom ? `${(school?.shortName || school?.name || 'ecole').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}.coreon.app` : null),
      line('Hébergeur', TBD),
      line('Région des données', TBD),
      line('Adresse IP', TBD),
      line('Ports ouverts', TBD),
      line('Fenêtre de sauvegarde', TBD),
    ],
    // ── Diagnostic : ce qu'on peut RÉELLEMENT vérifier aujourd'hui ──
    diagnostic: [
      line('Mode', school?.live ? 'Démonstration (données locales)' : 'Client (serveur dédié · à provisionner)'),
      line('Révision des données', rev),
      line('Joignable', school?.status === 'suspended' ? 'Suspendue' : 'Oui'),
    ],
  }
}

/** Le compte de champs encore à collecter — pour l'afficher franchement en tête. */
export function missingCount(profile) {
  return ['identite', 'contact', 'infra', 'diagnostic']
    .flatMap(k => profile[k] || [])
    .filter(l => l.missing).length
}
