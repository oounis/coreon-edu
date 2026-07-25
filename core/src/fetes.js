// ════════════════════════════════════════════════════════════════════════════
// LES FÊTES — ce que le coin du haut raconte à la place d'une simple horloge.
//
// L'esprit « doodle » de Google, version école et HORS LIGNE : pas d'API, un
// calendrier tenu dans le cœur. Trois niveaux, du plus fort au plus doux :
//  1. Un JOUR FÉRIÉ aujourd'hui → on le dit (l'école est fermée).
//  2. Une JOURNÉE MONDIALE qui parle aux enfants et à l'école → on la célèbre.
//  3. Rien aujourd'hui → on annonce le PROCHAIN congé et dans combien de jours,
//     car c'est la question que parents et personnel se posent vraiment.
//
// CR-032 : le calendrier suit le PAYS de l'école (couche locales.js) — quatre
// tables, une par marché de lancement : BH · QA · TN · LY. Les fêtes
// religieuses dépendent de l'observation de la lune : leurs dates sont tenues
// PAR ANNÉE (pas de calcul hégirien approximatif) et portées `lune: true` —
// l'écran dit honnêtement « selon la lune ».
// Règle de charte : jamais d'émoji drapeau.
// ⚠️ Les QUATRE tables s'arrêtent à 2027 : ajouter 2028 avant janvier 2028.
// ════════════════════════════════════════════════════════════════════════════

import { localePackKey } from './locales.js'

export const FERIES_PAR_PAYS = {
  // ── Tunisie (le référentiel d'origine, intact) ────────────────────────────
  TN: {
    2026: [
      { d: '2026-01-01', label: "Jour de l'an", e: '🎉' },
      { d: '2026-03-20', label: "Fête de l'Indépendance", e: '🕊️' },
      { d: '2026-03-20', label: 'Aïd el-Fitr', e: '🌙', lune: true },
      { d: '2026-03-21', label: 'Aïd el-Fitr (2e jour)', e: '🌙', lune: true },
      { d: '2026-04-09', label: 'Journée des Martyrs', e: '🕯️' },
      { d: '2026-05-01', label: 'Fête du Travail', e: '🛠️' },
      { d: '2026-05-27', label: 'Aïd el-Idha', e: '🐑', lune: true },
      { d: '2026-05-28', label: 'Aïd el-Idha (2e jour)', e: '🐑', lune: true },
      { d: '2026-06-16', label: 'Ras el Am el Hijri', e: '🌙', lune: true },
      { d: '2026-07-25', label: 'Fête de la République', e: '🏛️' },
      { d: '2026-08-13', label: 'Fête de la Femme', e: '🌸' },
      { d: '2026-08-25', label: 'Mouled', e: '✨', lune: true },
      { d: '2026-10-15', label: "Fête de l'Évacuation", e: '⚓' },
      { d: '2026-12-17', label: 'Fête de la Révolution', e: '✊' },
    ],
    2027: [
      { d: '2027-01-01', label: "Jour de l'an", e: '🎉' },
      { d: '2027-03-10', label: 'Aïd el-Fitr', e: '🌙', lune: true },
      { d: '2027-03-11', label: 'Aïd el-Fitr (2e jour)', e: '🌙', lune: true },
      { d: '2027-03-20', label: "Fête de l'Indépendance", e: '🕊️' },
      { d: '2027-04-09', label: 'Journée des Martyrs', e: '🕯️' },
      { d: '2027-05-01', label: 'Fête du Travail', e: '🛠️' },
      { d: '2027-05-17', label: 'Aïd el-Idha', e: '🐑', lune: true },
      { d: '2027-05-18', label: 'Aïd el-Idha (2e jour)', e: '🐑', lune: true },
      { d: '2027-06-06', label: 'Ras el Am el Hijri', e: '🌙', lune: true },
      { d: '2027-07-25', label: 'Fête de la République', e: '🏛️' },
      { d: '2027-08-13', label: 'Fête de la Femme', e: '🌸' },
      { d: '2027-08-15', label: 'Mouled', e: '✨', lune: true },
      { d: '2027-10-15', label: "Fête de l'Évacuation", e: '⚓' },
      { d: '2027-12-17', label: 'Fête de la Révolution', e: '✊' },
    ],
  },

  // ── Bahreïn — Aïd el-Idha sur 3 jours, Achoura (9–10 mouharram), Fête
  //    nationale 16–17 décembre ─────────────────────────────────────────────
  BH: {
    2026: [
      { d: '2026-01-01', label: "Jour de l'an", e: '🎉' },
      { d: '2026-03-20', label: 'Aïd el-Fitr', e: '🌙', lune: true },
      { d: '2026-03-21', label: 'Aïd el-Fitr (2e jour)', e: '🌙', lune: true },
      { d: '2026-03-22', label: 'Aïd el-Fitr (3e jour)', e: '🌙', lune: true },
      { d: '2026-05-01', label: 'Fête du Travail', e: '🛠️' },
      { d: '2026-05-27', label: 'Aïd el-Idha', e: '🐑', lune: true },
      { d: '2026-05-28', label: 'Aïd el-Idha (2e jour)', e: '🐑', lune: true },
      { d: '2026-05-29', label: 'Aïd el-Idha (3e jour)', e: '🐑', lune: true },
      { d: '2026-06-16', label: 'Ras el Am el Hijri', e: '🌙', lune: true },
      { d: '2026-06-24', label: 'Achoura', e: '🕯️', lune: true },
      { d: '2026-06-25', label: 'Achoura (2e jour)', e: '🕯️', lune: true },
      { d: '2026-08-25', label: 'Mouled', e: '✨', lune: true },
      { d: '2026-12-16', label: 'Fête nationale', e: '🏛️' },
      { d: '2026-12-17', label: 'Fête nationale (2e jour)', e: '🏛️' },
    ],
    2027: [
      { d: '2027-01-01', label: "Jour de l'an", e: '🎉' },
      { d: '2027-03-10', label: 'Aïd el-Fitr', e: '🌙', lune: true },
      { d: '2027-03-11', label: 'Aïd el-Fitr (2e jour)', e: '🌙', lune: true },
      { d: '2027-03-12', label: 'Aïd el-Fitr (3e jour)', e: '🌙', lune: true },
      { d: '2027-05-01', label: 'Fête du Travail', e: '🛠️' },
      { d: '2027-05-17', label: 'Aïd el-Idha', e: '🐑', lune: true },
      { d: '2027-05-18', label: 'Aïd el-Idha (2e jour)', e: '🐑', lune: true },
      { d: '2027-05-19', label: 'Aïd el-Idha (3e jour)', e: '🐑', lune: true },
      { d: '2027-06-06', label: 'Ras el Am el Hijri', e: '🌙', lune: true },
      { d: '2027-06-14', label: 'Achoura', e: '🕯️', lune: true },
      { d: '2027-06-15', label: 'Achoura (2e jour)', e: '🕯️', lune: true },
      { d: '2027-08-15', label: 'Mouled', e: '✨', lune: true },
      { d: '2027-12-16', label: 'Fête nationale', e: '🏛️' },
      { d: '2027-12-17', label: 'Fête nationale (2e jour)', e: '🏛️' },
    ],
  },

  // ── Qatar — liste officielle courte : Journée du sport (2e mardi de
  //    février), deux Aïds sur 3 jours, Fête nationale 18 décembre ──────────
  QA: {
    2026: [
      { d: '2026-02-10', label: 'Journée nationale du sport', e: '🏅' },
      { d: '2026-03-20', label: 'Aïd el-Fitr', e: '🌙', lune: true },
      { d: '2026-03-21', label: 'Aïd el-Fitr (2e jour)', e: '🌙', lune: true },
      { d: '2026-03-22', label: 'Aïd el-Fitr (3e jour)', e: '🌙', lune: true },
      { d: '2026-05-27', label: 'Aïd el-Idha', e: '🐑', lune: true },
      { d: '2026-05-28', label: 'Aïd el-Idha (2e jour)', e: '🐑', lune: true },
      { d: '2026-05-29', label: 'Aïd el-Idha (3e jour)', e: '🐑', lune: true },
      { d: '2026-12-18', label: 'Fête nationale', e: '🏛️' },
    ],
    2027: [
      { d: '2027-02-09', label: 'Journée nationale du sport', e: '🏅' },
      { d: '2027-03-10', label: 'Aïd el-Fitr', e: '🌙', lune: true },
      { d: '2027-03-11', label: 'Aïd el-Fitr (2e jour)', e: '🌙', lune: true },
      { d: '2027-03-12', label: 'Aïd el-Fitr (3e jour)', e: '🌙', lune: true },
      { d: '2027-05-17', label: 'Aïd el-Idha', e: '🐑', lune: true },
      { d: '2027-05-18', label: 'Aïd el-Idha (2e jour)', e: '🐑', lune: true },
      { d: '2027-05-19', label: 'Aïd el-Idha (3e jour)', e: '🐑', lune: true },
      { d: '2027-12-18', label: 'Fête nationale', e: '🏛️' },
    ],
  },

  // ── Libye — Jour d'Arafat férié (veille de l'Aïd), Martyrs 16 septembre,
  //    Libération 23 octobre, Indépendance 24 décembre ──────────────────────
  LY: {
    2026: [
      { d: '2026-02-17', label: 'Fête de la Révolution', e: '✊' },
      { d: '2026-03-20', label: 'Aïd el-Fitr', e: '🌙', lune: true },
      { d: '2026-03-21', label: 'Aïd el-Fitr (2e jour)', e: '🌙', lune: true },
      { d: '2026-05-01', label: 'Fête du Travail', e: '🛠️' },
      { d: '2026-05-26', label: "Jour d'Arafat", e: '🌙', lune: true },
      { d: '2026-05-27', label: 'Aïd el-Idha', e: '🐑', lune: true },
      { d: '2026-05-28', label: 'Aïd el-Idha (2e jour)', e: '🐑', lune: true },
      { d: '2026-06-16', label: 'Ras el Am el Hijri', e: '🌙', lune: true },
      { d: '2026-08-25', label: 'Mouled', e: '✨', lune: true },
      { d: '2026-09-16', label: 'Journée des Martyrs', e: '🕯️' },
      { d: '2026-10-23', label: 'Fête de la Libération', e: '🕊️' },
      { d: '2026-12-24', label: "Fête de l'Indépendance", e: '🏛️' },
    ],
    2027: [
      { d: '2027-02-17', label: 'Fête de la Révolution', e: '✊' },
      { d: '2027-03-10', label: 'Aïd el-Fitr', e: '🌙', lune: true },
      { d: '2027-03-11', label: 'Aïd el-Fitr (2e jour)', e: '🌙', lune: true },
      { d: '2027-05-01', label: 'Fête du Travail', e: '🛠️' },
      { d: '2027-05-16', label: "Jour d'Arafat", e: '🌙', lune: true },
      { d: '2027-05-17', label: 'Aïd el-Idha', e: '🐑', lune: true },
      { d: '2027-05-18', label: 'Aïd el-Idha (2e jour)', e: '🐑', lune: true },
      { d: '2027-06-06', label: 'Ras el Am el Hijri', e: '🌙', lune: true },
      { d: '2027-08-15', label: 'Mouled', e: '✨', lune: true },
      { d: '2027-09-16', label: 'Journée des Martyrs', e: '🕯️' },
      { d: '2027-10-23', label: 'Fête de la Libération', e: '🕊️' },
      { d: '2027-12-24', label: "Fête de l'Indépendance", e: '🏛️' },
    ],
  },
}

// Compat : `FERIES` reste la table tunisienne (le défaut historique).
export const FERIES = FERIES_PAR_PAYS.TN

// Journées mondiales choisies pour une école (0–12 ans) : l'enfant, le livre,
// l'eau, la gentillesse… — pas la liste exhaustive de l'ONU. Communes aux 4 pays.
export const JOURNEES = [
  { d: '01-24', label: "Journée internationale de l'éducation", e: '🎓' },
  { d: '02-21', label: 'Journée de la langue maternelle', e: '🗣️' },
  { d: '03-08', label: 'Journée internationale des femmes', e: '🌸' },
  { d: '03-20', label: 'Journée internationale du bonheur', e: '😊' },
  { d: '03-21', label: 'Journée mondiale de la poésie', e: '📜' },
  { d: '03-22', label: "Journée mondiale de l'eau", e: '💧' },
  { d: '04-02', label: 'Journée du livre pour enfants', e: '📖' },
  { d: '04-07', label: 'Journée mondiale de la santé', e: '🩺' },
  { d: '04-22', label: 'Jour de la Terre', e: '🌍' },
  { d: '04-23', label: 'Journée mondiale du livre', e: '📚' },
  { d: '05-15', label: 'Journée internationale des familles', e: '🏡' },
  { d: '06-05', label: "Journée mondiale de l'environnement", e: '🌱' },
  { d: '06-21', label: 'Fête de la musique', e: '🎵' },
  { d: '07-15', label: 'Journée des compétences des jeunes', e: '💡' },
  { d: '07-30', label: "Journée internationale de l'amitié", e: '🤝' },
  { d: '08-12', label: 'Journée internationale de la jeunesse', e: '🚀' },
  { d: '09-08', label: "Journée de l'alphabétisation", e: '✏️' },
  { d: '09-21', label: 'Journée internationale de la paix', e: '🕊️' },
  { d: '10-05', label: 'Journée mondiale des enseignants', e: '🍎' },
  { d: '10-16', label: "Journée mondiale de l'alimentation", e: '🍽️' },
  { d: '11-13', label: 'Journée mondiale de la gentillesse', e: '💛' },
  { d: '11-20', label: "Journée des droits de l'enfant", e: '🧒' },
  { d: '12-03', label: 'Journée des personnes handicapées', e: '♿' },
  { d: '12-10', label: "Journée des droits de l'homme", e: '⚖️' },
  { d: '12-18', label: 'Journée mondiale de la langue arabe', e: '✒️' },
]

// Le calendrier du pays ACTIF (l'école choisit son pays ; défaut = Tunisie).
const paysFeries = () => FERIES_PAR_PAYS[localePackKey()] || FERIES_PAR_PAYS.TN
const allFeries = () => Object.values(paysFeries()).flat()
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)

export const ferieOf = iso => allFeries().find(f => f.d === iso) || null
export const journeeOf = iso => JOURNEES.find(j => j.d === iso.slice(5)) || null

/** Ce que le jour raconte : férié d'abord (l'école est fermée), journée sinon. */
export function feteOfDay(iso) {
  const f = ferieOf(iso)
  if (f) return { kind: 'ferie', ...f }
  const j = journeeOf(iso)
  if (j) return { kind: 'journee', ...j, d: iso }
  return null
}

/** Le prochain jour férié STRICTEMENT après `iso`, avec le compte à rebours. */
export function nextFerie(iso) {
  const f = allFeries().filter(x => x.d > iso).sort((a, b) => a.d.localeCompare(b.d))[0]
  return f ? { ...f, inDays: daysBetween(iso, f.d) } : null
}

/** L'agenda : les n prochaines fêtes (fériés + journées), aujourd'hui compris. */
export function upcoming(iso, n = 6) {
  const y = Number(iso.slice(0, 4))
  const journees = JOURNEES.flatMap(j => [`${y}-${j.d}`, `${y + 1}-${j.d}`]
    .map(d => ({ kind: 'journee', ...j, d })))
  const feries = allFeries().map(f => ({ kind: 'ferie', ...f }))
  return [...feries, ...journees]
    .filter(x => x.d >= iso)
    .sort((a, b) => a.d.localeCompare(b.d) || (a.kind === 'ferie' ? -1 : 1))
    .slice(0, n)
    .map(x => ({ ...x, inDays: daysBetween(iso, x.d) }))
}

// ── Calendrier hégirien (CR-032 · Tier-1 #4 du Golfe) ────────────────────────
// La date hégirienne AFFICHÉE vient du calendrier civil Umm al-Qura via Intl —
// natif au navigateur et à Node, zéro dépendance. Elle sert à LIRE la date du
// jour ; les fériés religieux restent tenus par année dans les tables ci-dessus
// (l'observation de la lune peut décaler d'un jour — « selon la lune »).

/** La date hégirienne d'un jour ISO, formatée dans la langue demandée
 *  ('fr' → « 11 safar 1448 AH », 'ar-TN' → « 11 صفر 1448 هـ »). */
export function hijriOf(iso, loc = 'fr') {
  try {
    return new Intl.DateTimeFormat(`${loc}-u-ca-islamic-umalqura`,
      { day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(`${iso}T12:00:00`))
  } catch { return null }
}
