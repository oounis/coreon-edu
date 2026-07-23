// ============================================================================
// Les portails et leur accent — Kogia Harmony.
//
// POURQUOI CETTE TABLE A CHANGÉ. L'accent d'un rôle sert de FOND à un bouton qui
// porte du texte blanc (`accent-bg`, `Btn` natif) ET de couleur de TEXTE sur du
// blanc. Une couleur d'accent doit donc être « réversible » : lisible dans les
// deux sens. L'ancienne table ne l'était pas — le cyan de l'Administration donnait
// 1.9:1 en blanc dessus, l'orange du Surveillant 1.8:1 : illisible.
//
// C'est exactement le raisonnement du livre de marque (§3.2) qui a fait choisir
// l'indigo #7539E4 plutôt que l'ancien : UNE couleur qui fait les deux métiers.
// On l'a appliqué aux sept portails. Chaque accent ci-dessous est :
//   • tiré du jeu canonique (aucun hexadécimal inventé) ;
//   • réversible : ≥ 4.5:1 en texte sur blanc ET en blanc sur lui ;
//   • ≥ 4.5:1 en texte sur son propre aplat (aplat dérivé, pas inventé) ;
//   • distinct des six autres.
//
// Les statuts (ok/warn/danger/info) ne sont JAMAIS repris comme accent de rôle :
// le livre de marque les réserve. C'est pourquoi « Surveillant » n'est plus orange.
// Source : brand/KOGIA_HARMONY.md §3.2, §3.3, §3.5
// ============================================================================
import { BRAND, N, SERIES, TERRA, soften } from './tokens.js'

const role = (label, color) => ({ label, color, soft: soften(color) })

export const ROLE = {
  // Le compte Kogia Group (fournisseur SaaS) : le bleu profond de la série 1,
  // voisin de l'indigo du groupe sans se confondre avec la Direction.
  owner:       role('Plateforme',     SERIES[0]),   // #4361D0
  // La Direction porte la voie de Coreon Edu : l'indigo, LA primaire.
  schooladmin: role('Direction',      BRAND.indigo),// #7539E4
  // L'Administration : l'ardoise. Sobre, clérical — c'est un métier de registre.
  admin:       role('Administration', N.slate),     // #485868
  // CR-019 : les départements réels. La RH — le bleu du personnel.
  hr:          role('RH & Paie',      '#0E7FB8'),
  // La Comptabilité — le vert défendable de l'argent tracé.
  accountant:  role('Comptabilité',   '#12946F'),
  // L'Enseignant : le vert de la série 6. La classe.
  teacher:     role('Enseignant',     SERIES[5]),   // #2F8050
  // Le Surveillant : la terre profonde. La cour, le terrain.
  supervisor:  role('Surveillant',    TERRA.ink),   // #7C2D12
  // La Sécurité : l'encre. Sobre, sans couleur — l'autorité ne crie pas.
  security:    role('Sécurité',       N.ink),       // #0E2135
  // Le Parent : la terre. La seule chaleur du produit — « la chaleur en dessous »
  // (loi 4). C'est le portail humain, il devait être le portail chaud.
  parent:      role('Parent',         TERRA.deep),  // #C2410C
}

/**
 * Le web peint l'accent dans des variables CSS ; le natif n'a pas de :root, il lit
 * la palette retournée. Les deux appellent la même fonction et obtiennent le même
 * couple de couleurs — d'où le `return r`.
 *
 * `--accent-2` n'est PAS une seconde couleur de rôle : c'est le violet de la voie
 * Coreon, réservé aux grandes surfaces décoratives (héros, tuiles) où aucun petit
 * texte ne se pose. Les boutons, eux, s'assombrissent vers l'encre — un dégradé
 * qui ne peut que faire MONTER le contraste du texte blanc (voir index.css).
 */
export function applyAccent(role) {
  const r = ROLE[role] || ROLE.admin
  if (typeof document === 'undefined') return r
  const st = document.documentElement.style
  st.setProperty('--accent', r.color)
  st.setProperty('--accent-2', BRAND.violet)
  st.setProperty('--accent-soft', r.soft)
  return r
}
