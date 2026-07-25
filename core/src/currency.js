// La devise de l'école. `money()` est appelé partout en rendu (une page de
// comptabilité formate des centaines de montants) : il ne doit JAMAIS relire la
// base pour connaître la devise. On la garde en mémoire, posée au démarrage et à
// chaque enregistrement des paramètres (setCurrency). Défaut : le dinar tunisien.
//
// ⚠️ AUDIT 2026-07-25 (B-1) : le dinar bahreïni compte en MILLIÈMES (fils) —
// « 12,5 » sans ses trois décimales se lit comme douze mille cinq cents. Chaque
// devise porte donc son nombre de décimales, montrées dès qu'il y a une fraction.
import { dateLocale } from './i18n.js'
let CUR = 'DT'

// Décimales par devise : les dinars du Golfe et du Maghreb comptent en millièmes.
const DECIMALS = { BHD: 3, KWD: 3, OMR: 3, TND: 3, DT: 3, LYD: 3, IQD: 3, JOD: 3 }
export const decimalsOf = c => DECIMALS[String(c || CUR).toUpperCase()] ?? 2

export const setCurrency = c => { CUR = (String(c || '').trim() || 'DT') }
export const currency = () => CUR

/** Arrondi MONÉTAIRE : au fils près (3 décimales BHD), jamais au dinar entier.
    QA FAT 2026-07-26 : Math.round() sur les remises volait 234 fils par remise. */
export const roundMoney = (n, c = CUR) => {
  const f = 10 ** decimalsOf(c)
  return Math.round((Number(n) || 0) * f) / f
}

// QA FAT 2026-07-26 : « 12,345 BHD » se lit DOUZE MILLE pour un anglophone —
// le format suit la LANGUE (fr-FR/en-GB/ar-…) ; et les décimales sont
// CONSTANTES dans une colonne (3 500,000 à côté de 2 981,345, jamais 0 vs 3).
export const money = n => {
  const d = decimalsOf(CUR)
  const v = roundMoney(n)
  let loc = 'fr-FR'
  try { loc = dateLocale() } catch { /* cœur seul, avant i18n */ }
  return `${v.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d })} ${CUR}`
}
