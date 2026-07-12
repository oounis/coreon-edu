// ============================================================================
// La marque Kogia — UN SEUL dessin, partagé par le web et le mobile.
//
// Avant : le web dessinait une baleine (sourire + nageoire), le mobile en
// dessinait une autre (sans), et l'œil avait QUATRE couleurs différentes selon
// l'écran. Ici il n'y a plus qu'un tracé et qu'un œil.
//
// Le livre de marque (KOGIA_HARMONY.md §4) sépare deux usages :
//   • LA MARQUE  (corps + œil + croissant) — logos, favicon, tuile d'app.
//   • LA MASCOTTE (+ sourire + nageoire + jet) — états vides, héros, succès.
// Les deux plateformes construisent leur SVG à partir de ces constantes, donc
// elles ne peuvent plus diverger.
//
// Référence : KogiaGroup/brand/kogia-mark.svg et kogia-mascot.svg
// ============================================================================
import { N, BRAND } from './tokens.js'

export const VIEWBOX = '0 0 132 96'
export const RATIO = 96 / 132

/** Le corps. */
export const BODY = 'M12 54 C12 34 28 22 52 22 C74 22 88 32 91 46 C94 38 99 30 107 25 C105 32 104 38 105 43 C110 41 117 41 124 44 C117 48 111 50 106 50 C102 62 92 70 76 73 C58 76 34 74 22 68 C14 64 12 60 12 54 Z'

/** L'œil. Encre — jamais du noir, et jamais une cinquième couleur inventée. */
export const EYE = { cx: 34, cy: 45, r: 4.2, fill: N.ink }

/**
 * LE CROISSANT DE KOGIA — la « fausse branchie ».
 * Notre unique signature géométrique. Il se porte derrière l'œil, exactement
 * comme l'animal le porte. Même tracé, même graisse, même angle, partout.
 */
export const CRESCENT = { d: 'M44 42 q7 9 -1 17', stroke: N.pearl, width: 3.2, opacity: 0.75 }

/**
 * Le sourire — MASCOTTE uniquement.
 * Tracé corrigé : l'ancien (`M22 57 q11 7 26 5`) traversait le croissant. Les deux
 * traits ne doivent jamais se croiser — le sourire s'arrête avant la branchie.
 */
export const SMILE = { d: 'M21 56 q8 6 17 6', stroke: N.surface, width: 3.6, opacity: 0.9 }

/** La nageoire — MASCOTTE uniquement. */
export const FIN = { d: 'M56 62 q6 8 16 8 q-10 4 -20 -2 Z', fill: BRAND.indigo, opacity: 0.5 }

/** Le jet — MASCOTTE uniquement. Cyan : c'est la lumière au-dessus de l'eau. */
export const SPOUT = { d: ['M42 12 q-1 -7 5 -9', 'M50 12 q4 -6 11 -6'], stroke: BRAND.cyan, width: 3.4, opacity: 0.9 }

/** Le dégradé du corps : la voie de Coreon Edu (indigo → violet). */
export const SKIN = { from: BRAND.indigo, to: BRAND.violet }

// ════════════════════════════════════════════════════════════════════════════
// LA MARQUE (le logo) — un K dont le bras est une NAGEOIRE CAUDALE.
//
// L'initiale de l'entreprise ET l'animal, dans une seule forme géométrique.
// Ce n'est pas un dessin de poisson : c'est un symbole de marque.
//
// Pourquoi la baleine n'est plus le logo :
//   • elle mourait à 16 px (œil, sourire, croissant → une bouillie) ;
//   • elle ne survivait pas en une seule couleur (tampon, facture, icône mono) ;
//   • c'était une illustration, pas une identité.
// La baleine reste — comme MASCOTTE (accueil, états vides, réussite). Deux
// systèmes, deux rôles : la marque identifie, la mascotte accueille.
//
// Aplat, jamais de dégradé. Grille 64. Source : brand/KOGIA_HARMONY.md §4
// ════════════════════════════════════════════════════════════════════════════
export const MARK_VIEWBOX = '0 0 64 64'
export const MARK_STEM = { d: 'M17 11 v42', width: 7.5 }
export const MARK_FLUKE = { d: 'M26 32 L48 9 L53 12 Q41 25 36 32 Q41 39 53 52 L48 55 Z' }
