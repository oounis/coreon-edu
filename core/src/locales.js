// ════════════════════════════════════════════════════════════════════════════
// LES PACKS DE PAYS — MARCHÉS DE LANCEMENT (CR-004/005 · CR-023 · CR-024 langue)
//
// Le produit ne suppose plus la Tunisie. Il ne prétend pas non plus couvrir le
// monde entier : les marchés de lancement sont QUATRE, et c'est tout —
//   Bahreïn 🇧🇭 · Qatar 🇶🇦 · Tunisie 🇹🇳 · Libye 🇱🇾   (Othman, 2026-07-23)
//
// Un pack décrit ce qui change d'un pays à l'autre :
//   · iso / currency        — code pays (référence ERP) et devise
//   · languages             — langues, ordre primaire → secondaire (CR-024)
//   · cities                — DONNÉES DE RÉFÉRENCE : on choisit dans la liste,
//                             on ne tape jamais un pays ni une ville (CR-023)
//   · regionLabel           — comment le pays nomme sa maille (Ville, Gouvernorat…)
//   · idLabel/idTypes/validId — la pièce d'identité de la personne (CR-018)
//   · legal                 — le cadre de protection des données du pays
//
// Ajouter un cinquième pays = un objet de plus ici. Aucun autre fichier à toucher :
// c'est la « couche de configuration par pays » — un seul cœur, des configs.
// ════════════════════════════════════════════════════════════════════════════

export const PACKS = {
  // ── Bahreïn ───────────────────────────────────────────────────────────────
  BH: {
    key: 'BH', label: 'Bahreïn', iso: 'BH', currency: 'BHD', locale: 'ar', dialCode: '+973',
    languages: { primary: 'ar', secondary: 'en' },
    regionLabel: 'Ville',
    cities: ['Manama', 'Muharraq', 'Riffa', 'Hamad Town', "A'ali", 'Isa Town', 'Sitra', 'Budaiya', 'Jidhafs', 'Al Hidd', 'Sanabis', 'Tubli'],
    regions: [],
    idLabel: role => (role === 'student' ? "Birth certificate / شهادة الميلاد" : "CPR number (9 digits)"),
    idTypes: role => role === 'student'
      ? [{ key: 'cpr', label: 'CPR' }, { key: 'passport', label: 'Passport' }, { key: 'birth', label: 'Birth certificate' }]
      : [{ key: 'cpr', label: 'CPR', pattern: /^\d{9}$/ }, { key: 'passport', label: 'Passport' }],
    validId: v => /^\d{9}$/.test(String(v || '').trim()) || String(v || '').trim().length >= 5,
    // CR-024 : le curriculum du pays — matières, barème, échelle de notes.
    curriculum: {
      markMax: 100, passMark: 50,
      subjects: ['Arabic', 'English', 'Mathematics', 'Science', 'Islamic Studies', 'Social Studies'],
      gradeScale: [{ min: 90, grade: 'A', label: 'Excellent' }, { min: 80, grade: 'B', label: 'Very good' }, { min: 70, grade: 'C', label: 'Good' }, { min: 60, grade: 'D', label: 'Satisfactory' }, { min: 50, grade: 'E', label: 'Pass' }, { min: 0, grade: 'F', label: 'Fail' }],
    },
    legal: {
      law: 'Personal Data Protection Law No. 30 of 2018 (PDPL)',
      authority: 'Personal Data Protection Authority, Bahrain',
      consent: "I authorize the school to process these personal data for my child's education, in accordance with Bahrain's PDPL (Law No. 30 of 2018). I may request access, correction or deletion at any time.",
    },
  },

  // ── Qatar ─────────────────────────────────────────────────────────────────
  QA: {
    key: 'QA', label: 'Qatar', iso: 'QA', currency: 'QAR', locale: 'ar', dialCode: '+974',
    languages: { primary: 'ar', secondary: 'en' },
    regionLabel: 'Ville',
    cities: ['Doha', 'Al Rayyan', 'Al Wakrah', 'Al Khor', 'Lusail', 'Umm Salal', 'Al Wukair', 'Mesaieed', 'Dukhan', 'Al Daayen', 'Al Shamal'],
    regions: [],
    idLabel: role => (role === 'student' ? "Birth certificate / شهادة الميلاد" : "QID number (11 digits)"),
    idTypes: role => role === 'student'
      ? [{ key: 'qid', label: 'QID' }, { key: 'passport', label: 'Passport' }, { key: 'birth', label: 'Birth certificate' }]
      : [{ key: 'qid', label: 'QID', pattern: /^\d{11}$/ }, { key: 'passport', label: 'Passport' }],
    validId: v => /^\d{11}$/.test(String(v || '').trim()) || String(v || '').trim().length >= 5,
    curriculum: {
      markMax: 100, passMark: 50,
      subjects: ['Arabic', 'English', 'Mathematics', 'Science', 'Islamic Education', 'Qatar History'],
      gradeScale: [{ min: 90, grade: 'A', label: 'Excellent' }, { min: 80, grade: 'B', label: 'Very good' }, { min: 70, grade: 'C', label: 'Good' }, { min: 60, grade: 'D', label: 'Satisfactory' }, { min: 50, grade: 'E', label: 'Pass' }, { min: 0, grade: 'F', label: 'Fail' }],
    },
    legal: {
      law: 'Law No. 13 of 2016 on Personal Data Privacy Protection',
      authority: 'National Cyber Security Agency, Qatar',
      consent: "I authorize the school to process these personal data for my child's education, in accordance with Qatar's Law No. 13 of 2016 on Personal Data Privacy Protection. I may request access, correction or deletion at any time.",
    },
  },

  // ── Tunisie (le référentiel d'origine, intact — reste le défaut) ──────────
  TN: {
    key: 'TN', label: 'Tunisie', iso: 'TN', currency: 'DT', locale: 'fr-TN', dialCode: '+216',
    languages: { primary: 'ar', secondary: 'fr', optional: 'en' },
    regionLabel: 'Gouvernorat',
    cities: ['Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili'],
    regions: ['Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan','Kasserine','Kébili','Le Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan'],
    idLabel: role => (role === 'student' ? "N° acte de naissance" : "CIN (8 chiffres)"),
    idTypes: role => role === 'student'
      ? [{ key: 'acte', label: 'Acte de naissance' }, { key: 'passport', label: 'Passeport' }]
      : [{ key: 'cin', label: 'CIN', pattern: /^\d{8}$/ }, { key: 'passport', label: 'Passeport' }, { key: 'sejour', label: 'Carte de séjour' }],
    validId: v => /^\d{8}$/.test(String(v || '').trim()) || String(v || '').trim().length >= 5,
    curriculum: {
      markMax: 20, passMark: 10,
      subjects: ['Mathématiques', 'Français', 'Arabe', 'Éveil scientifique', 'Anglais'],
      gradeScale: [{ min: 16, grade: 'A', label: 'Excellent' }, { min: 14, grade: 'B', label: 'Très bien' }, { min: 12, grade: 'C', label: 'Bien' }, { min: 10, grade: 'D', label: 'Passable' }, { min: 0, grade: 'E', label: 'Insuffisant' }],
    },
    legal: {
      law: 'Loi organique n° 2004-63 du 27 juillet 2004',
      authority: 'INPDP : Instance Nationale de Protection des Données Personnelles',
      consent: "J'autorise l'établissement à traiter ces données personnelles dans le cadre de la scolarité, conformément à la loi organique n° 2004-63 relative à la protection des données à caractère personnel (INPDP).",
    },
  },

  // ── Libye ─────────────────────────────────────────────────────────────────
  LY: {
    key: 'LY', label: 'Libye', iso: 'LY', currency: 'LYD', locale: 'ar', dialCode: '+218',
    languages: { primary: 'ar', secondary: 'en' },
    regionLabel: 'Ville',
    cities: ['Tripoli', 'Benghazi', 'Misrata', 'Sabha', 'Al Bayda', 'Zawiya', 'Ajdabiya', 'Tobruk', 'Al Khums', 'Zliten', 'Sirte', 'Gharyan', 'Derna', 'Sabratha', 'Zuwara', 'Murzuq'],
    regions: [],
    idLabel: role => (role === 'student' ? "Birth certificate / شهادة الميلاد" : "National number (الرقم الوطني)"),
    idTypes: role => role === 'student'
      ? [{ key: 'national', label: 'National number' }, { key: 'passport', label: 'Passport' }, { key: 'birth', label: 'Birth certificate' }]
      : [{ key: 'national', label: 'National number' }, { key: 'passport', label: 'Passport' }],
    validId: v => String(v || '').trim().length >= 5,
    curriculum: {
      markMax: 100, passMark: 50,
      subjects: ['Arabic', 'English', 'Mathematics', 'Science', 'Islamic Education', 'Social Studies'],
      gradeScale: [{ min: 90, grade: 'A', label: 'Excellent' }, { min: 80, grade: 'B', label: 'Very good' }, { min: 70, grade: 'C', label: 'Good' }, { min: 60, grade: 'D', label: 'Satisfactory' }, { min: 50, grade: 'E', label: 'Pass' }, { min: 0, grade: 'F', label: 'Fail' }],
    },
    legal: {
      law: 'la réglementation libyenne applicable sur la protection des données',
      authority: '',
      consent: "J'autorise l'établissement à traiter ces données personnelles dans le cadre de la scolarité de mon enfant. Je peux en demander l'accès, la rectification ou la suppression à tout moment.",
    },
  },
}

// Les villes SONT la maille de choix (Pays → Ville → École). Là où le pays
// raisonne en gouvernorats (Tunisie), `regions` garde sa liste ; ailleurs, la
// région d'un formulaire retombe sur la liste des villes.
for (const p of Object.values(PACKS)) if (!p.regions.length) p.regions = p.cities

export const PACK_LIST = Object.values(PACKS).map(p => ({ key: p.key, label: p.label }))
export const DEFAULT_PACK = 'TN'   // la Tunisie reste le défaut tant qu'aucun pays n'est choisi

// ── Le pack actif ─────────────────────────────────────────────────────────────
let ACTIVE = DEFAULT_PACK
export const setLocalePack = key => { ACTIVE = PACKS[key] ? key : DEFAULT_PACK }
export const localePackKey = () => ACTIVE
export const pack = () => PACKS[ACTIVE] || PACKS[DEFAULT_PACK]

// ── Accès pratiques ───────────────────────────────────────────────────────────
export const regionLabel = () => pack().regionLabel
export const regions = () => pack().regions
export const citiesOf = key => (PACKS[key] || pack()).cities || []
export const languagesOf = key => (PACKS[key] || pack()).languages || { primary: 'fr' }
export const idLabelFor = role => pack().idLabel(role)
export const idTypesFor = role => (pack().idTypes ? pack().idTypes(role) : [])
export const validId = v => pack().validId(v)
export const legal = () => pack().legal
export const packCurrency = () => pack().currency
export const countryCode = () => pack().iso || 'XX'

// ── Curriculum du pays (CR-024) ───────────────────────────────────────────────
const DEFAULT_CURRICULUM = { markMax: 20, passMark: 10, subjects: ['Mathématiques', 'Français', 'Arabe', 'Éveil scientifique', 'Anglais'], gradeScale: [] }
export const curriculum = () => pack().curriculum || DEFAULT_CURRICULUM
export const subjectsForCountry = () => curriculum().subjects
export const markMaxOf = () => curriculum().markMax
export const passMarkOf = () => curriculum().passMark
/** La mention correspondant à un score, selon l'échelle du pays. */
export const gradeOf = score => {
  if (score == null || Number.isNaN(Number(score))) return null
  const scale = curriculum().gradeScale || []
  return scale.find(g => Number(score) >= g.min) || null
}
