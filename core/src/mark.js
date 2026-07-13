// ════════════════════════════════════════════════════════════════════════════
// LA MARQUE KOGIA — le cachalot. C'est LE logo, choisi par Othman.
// Un seul symbole pour tout l'écosystème ; seule la couleur du produit change.
//
// L'œil est un TROU (fill-rule evenodd) et non un point blanc : la marque tient
// donc sur n'importe quel fond — tuile de couleur, sombre, clair — sans pastille
// parasite. C'est ce qui permet de la décliner en ocean / violet / terre cuite.
//
// Source : brand/KOGIA_HARMONY.md §4
// ════════════════════════════════════════════════════════════════════════════
export const MARK_VIEWBOX = '0 0 132 96'
export const MARK_RATIO = 96 / 132

/** Le corps + l'œil, en UN tracé (evenodd → l'œil est percé). */
export const MARK_BODY = 'M12 54 C12 34 28 22 52 22 C74 22 88 32 91 46 C94 38 99 30 107 25 C105 32 104 38 105 43 C110 41 117 41 124 44 C117 48 111 50 106 50 C102 62 92 70 76 73 C58 76 34 74 22 68 C14 64 12 60 12 54 Z M38.4 45 a4.4 4.4 0 1 1 -8.8 0 a4.4 4.4 0 1 1 8.8 0 Z'
/** Le jet — deux traits au-dessus de la tête. */
export const MARK_SPOUT = 'M42 12 q-1 -7 5 -9 M50 12 q4 -6 11 -6'
export const MARK_SPOUT_WIDTH = 4
