// La devise de l'école. `money()` est appelé partout en rendu (une page de
// comptabilité formate des centaines de montants) : il ne doit JAMAIS relire la
// base pour connaître la devise. On la garde en mémoire, posée au démarrage et à
// chaque enregistrement des paramètres (setCurrency). Défaut : le dinar tunisien.
//
// ⚠️ AUDIT 2026-07-25 (B-1) : le dinar bahreïni compte en MILLIÈMES (fils) —
// « 12,5 » sans ses trois décimales se lit comme douze mille cinq cents. Chaque
// devise porte donc son nombre de décimales, montrées dès qu'il y a une fraction.
let CUR = 'DT'

// Décimales par devise : les dinars du Golfe et du Maghreb comptent en millièmes.
const DECIMALS = { BHD: 3, KWD: 3, OMR: 3, TND: 3, DT: 3, LYD: 3, IQD: 3, JOD: 3 }
export const decimalsOf = c => DECIMALS[String(c || CUR).toUpperCase()] ?? 2

export const setCurrency = c => { CUR = (String(c || '').trim() || 'DT') }
export const currency = () => CUR
export const money = n => {
  const d = decimalsOf(CUR)
  const v = Number(n || 0)
  // Montant entier « rond » : affichage court (350 DT, pas 350,000 DT) ; dès
  // qu'il y a une fraction, TOUTES les décimales de la devise apparaissent.
  const digits = Number.isInteger(v) ? 0 : d
  return `${v.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: d })} ${CUR}`
}
