// ════════════════════════════════════════════════════════════════════════════
// L'ARABE N'EST PAS UNE TRADUCTION — C'EST UNE DIRECTION.
//
// Pourquoi ce module existe (PLAN, carnet v2, chantier n°1) : l'absence d'arabe
// bloque TOUT le Golfe — le marché où vit Othman, et la Vague 2 annoncée
// publiquement sur kogiagroup.com. Un ERP à 60 % en arabe vaut mieux qu'un ERP
// à 90 % qu'aucune école de Manama ne peut lire.
//
// LA MÉTHODE (façon gettext) : le FRANÇAIS EST LA CLÉ. `t('Tableau de bord')`
// rend « لوحة المتابعة » en arabe, et le texte lui-même partout ailleurs.
// Aucune clé à inventer, aucun fichier de clés à synchroniser : si une
// traduction manque, l'écran retombe sur le français — jamais sur un trou.
// Et un test d'exécution garantit que la NAVIGATION, les NIVEAUX et les RÔLES
// sont couverts à 100 % : la dégradation gracieuse n'a pas le droit de grandir
// en silence.
//
// LES RÈGLES :
//  1. La langue est un choix d'APPAREIL (clé de stockage dédiée), pas une
//     donnée d'école : dans une même école du Golfe, la maîtresse française
//     lit en français et le parent en arabe.
//  2. `dir()` accompagne toujours la langue : l'arabe se lit de droite à
//     gauche, l'interface aussi — pas seulement les mots.
//  3. On n'ajoute une langue qu'avec son test de couverture.
// ════════════════════════════════════════════════════════════════════════════
import { getItem, setItem } from './storage.js'
import { countryCode } from './locales.js'

export const LOCALES = {
  fr: { key: 'fr', label: 'Français', dir: 'ltr' },
  ar: { key: 'ar', label: 'العربية',  dir: 'rtl' },
  // L'ANGLAIS (2026-07-26) : Bahreïn déclare ar + en ; les écoles privées du
  // Golfe travaillent largement en anglais. ÉTAT MESURÉ AU 2026-08-11 :
  // 1 981 chaînes `t()` en usage, **100 % traduites** en anglais comme en arabe
  // depuis le 2026-08-11 (91 ajoutées côté anglais ce jour-là).
  // La couverture n'est plus « l'écorce » : les données de référence (fêtes,
  // mois du barème, fonctions du personnel) ont rejoint le dictionnaire.
  // Ce qui manque retombe sur le français — jamais sur un vide.
  //
  // ⚠️ Un commentaire précédent annonçait « 100 % » : c'était faux, mesuré à
  // 96 %. Une couverture s'annonce mesurée, pas espérée — sinon on cesse de
  // combler l'écart en croyant l'avoir fermé.
  en: { key: 'en', label: 'English',  dir: 'ltr' },
}

const KEY = 'coreon_locale'
let cur = null

export function locale() {
  if (cur) return cur
  const s = getItem(KEY)
  cur = LOCALES[s] ? s : 'fr'
  return cur
}
export function setLocale(l) {
  if (!LOCALES[l]) return
  cur = l
  setItem(KEY, l)
  loadDict(l)              // l'app recharge la page, mais ne parions pas dessus
}
export const dir = () => LOCALES[locale()].dir
/** Le repère de dates suit la langue — ar-TN garde les chiffres latins, lisibles des deux publics. */
// QA FAT 2026-07-26 : « جويلية/جوان » est l'arabe TUNISIEN — Bahreïn dit
// « يوليو/يونيو ». Le repère de dates suit langue ET pays.
export const dateLocale = () => (locale() === 'ar' ? 'ar-' + countryCode() : locale() === 'en' ? 'en-GB' : 'fr-FR')
export const isRTL = () => dir() === 'rtl'

// ── Les dictionnaires sont des MORCEAUX À PART (2026-07-28) ─────────────────
// Ce module est importé par presque tout le produit (c'est `t()`), donc il
// voyage dans le premier morceau téléchargé. Y loger les dictionnaires faisait
// payer l'arabe ET l'anglais à une visiteuse française — et a fini par bloquer
// une livraison sur la barrière de poids (452 KB gzip pour 450 de budget).
// Désormais : `i18n.ar.js` / `i18n.en.js` sont chargés DYNAMIQUEMENT, et
// seulement pour la langue que l'appareil lit vraiment. Traduire davantage ne
// coûte plus rien aux autres langues — ce qui compte, la norme d'acceptation
// visant 95 % de couverture.
const DICTS = {}                                    // langue → dictionnaire chargé

/** Poser un dictionnaire déjà en main (tests, plateformes sans import()). */
export function registerDict(l, dict) { if (l && dict) DICTS[l] = dict }

/** Le dictionnaire de la langue est-il en mémoire ? */
export const dictReady = (l = locale()) => l === 'fr' || !!DICTS[l]

/**
 * Charger le dictionnaire d'une langue — À APPELER AVANT LE PREMIER RENDU.
 * Le français n'en a pas (il EST la clé). Un chargement qui échoue n'est pas
 * une panne : `t()` retombe sur le français, comme pour une clé manquante.
 */
export async function loadDict(l = locale()) {
  if (l === 'fr' || DICTS[l]) return DICTS[l] || null
  try {
    const m = l === 'ar' ? await import('./i18n.ar.js')
            : l === 'en' ? await import('./i18n.en.js')
            : null
    if (m) DICTS[l] = m.default
  } catch { /* hors-ligne ou morceau absent : on reste en français, jamais un trou */ }
  return DICTS[l] || null
}

/** Traduire. Le français est la clé ; s'il manque une entrée, il reste le texte. */
export function t(text) {
  if (!text || locale() === 'fr') return text
  const d = DICTS[locale()]
  return (d && d[text]) || text
}
