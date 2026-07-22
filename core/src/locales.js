// ════════════════════════════════════════════════════════════════════════════
// LES PACKS DE PAYS (CR-004 · CR-005)
//
// Le produit ne DOIT PLUS supposer la Tunisie. Mais on ne jette rien : la
// Tunisie devient UN pack parmi d'autres, et reste le pack par défaut tant
// qu'aucun pays n'est choisi (Othman, 2026-07-23 : « je ne sais pas encore
// dans quel pays je démarre — garde le tunisien, mais rends-le international »).
//
// Un pack décrit ce qui change d'un pays à l'autre :
//   · currency        — la devise (symbole affiché)
//   · regionLabel     — « Gouvernorat », « Région », « State », « Province »…
//   · regions         — la liste (vide = champ libre)
//   · idLabel(role)   — le nom de la pièce d'identité selon le profil
//   · validId(v)      — sa validation (souple par défaut : on n'invente pas la
//                       règle d'un pays qu'on ne connaît pas encore)
//   · legal           — le cadre de protection des données (consentement, loi)
//
// Ce module ne connaît NI React NI le stockage : il décrit, c'est tout.
// L'hôte pose le pack actif au démarrage et à chaque changement de pays
// (setLocalePack), exactement comme la devise.
// ════════════════════════════════════════════════════════════════════════════

const GENERIC_LEGAL = {
  law: 'la réglementation applicable sur la protection des données',
  authority: '',
  consent: "J'autorise l'établissement à traiter ces données personnelles dans le cadre de la scolarité de mon enfant. Je peux en demander l'accès, la rectification ou la suppression à tout moment.",
}

export const PACKS = {
  // ── Tunisie : le référentiel existant, intact ─────────────────────────────
  TN: {
    key: 'TN', label: 'Tunisie', iso: 'TN', currency: 'DT', locale: 'fr-TN', dialCode: '+216',
    regionLabel: 'Gouvernorat',
    regions: ['Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan','Kasserine','Kébili','Le Kef','Mahdia','Manouba','Médenine','Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan'],
    idLabel: role => (role === 'student' ? "N° acte de naissance" : "CIN (8 chiffres)"),
    // CR-018 : le type de pièce est CHOISI, pas figé. Un humain peut se présenter
    // avec sa CIN, un passeport, une carte de séjour — chacun avec sa propre règle.
    idTypes: role => role === 'student'
      ? [{ key: 'acte', label: 'Acte de naissance' }, { key: 'passport', label: 'Passeport' }]
      : [{ key: 'cin', label: 'CIN', pattern: /^\d{8}$/ }, { key: 'passport', label: 'Passeport' }, { key: 'sejour', label: 'Carte de séjour' }],
    validId: v => /^\d{8}$/.test(String(v || '').trim()),
    legal: {
      law: 'Loi organique n° 2004-63 du 27 juillet 2004',
      authority: 'INPDP : Instance Nationale de Protection des Données Personnelles',
      consent: "J'autorise l'établissement à traiter ces données personnelles dans le cadre de la scolarité, conformément à la loi organique n° 2004-63 relative à la protection des données à caractère personnel (INPDP).",
    },
  },

  // ── France : GDPR, euros, départements laissés en champ libre ─────────────
  FR: {
    key: 'FR', label: 'France', iso: 'FR', currency: 'EUR', locale: 'fr-FR', dialCode: '+33',
    regionLabel: 'Département',
    regions: [],
    idLabel: role => (role === 'student' ? "N° acte de naissance" : "N° de pièce d'identité"),
    idTypes: role => role === 'student'
      ? [{ key: 'acte', label: 'Acte de naissance' }, { key: 'passport', label: 'Passeport' }]
      : [{ key: 'cni', label: "Carte nationale d'identité" }, { key: 'passport', label: 'Passeport' }, { key: 'sejour', label: 'Titre de séjour' }],
    validId: v => String(v || '').trim().length >= 4,
    legal: {
      law: 'Règlement général sur la protection des données (RGPD)',
      authority: 'CNIL : Commission Nationale de l\'Informatique et des Libertés',
      consent: "J'autorise l'établissement à traiter ces données personnelles dans le cadre de la scolarité de mon enfant, conformément au RGPD. Je dispose d'un droit d'accès, de rectification et d'effacement.",
    },
  },

  // ── International : neutre, aucun présupposé de pays ───────────────────────
  INTL: {
    key: 'INTL', label: 'International', iso: 'XX', currency: 'EUR', locale: 'fr', dialCode: '',
    regionLabel: 'Région',
    regions: [],
    idLabel: role => (role === 'student' ? "N° d'identité / acte de naissance" : "N° de pièce d'identité / passeport"),
    idTypes: role => role === 'student'
      ? [{ key: 'birth', label: 'Birth certificate / Acte de naissance' }, { key: 'passport', label: 'Passport' }]
      : [{ key: 'id', label: 'National ID / Carte d\'identité' }, { key: 'passport', label: 'Passport' }, { key: 'residence', label: 'Residence permit' }],
    validId: v => String(v || '').trim().length >= 4,
    legal: GENERIC_LEGAL,
  },
}

export const PACK_LIST = Object.values(PACKS).map(p => ({ key: p.key, label: p.label }))
export const DEFAULT_PACK = 'TN'   // on garde le tunisien par défaut, comme demandé

// ── Le pack actif ─────────────────────────────────────────────────────────────
// Posé au démarrage et à chaque enregistrement des paramètres. On ne relit
// jamais la base pendant un rendu : un formulaire peut afficher la liste des
// régions des dizaines de fois.
let ACTIVE = DEFAULT_PACK
export const setLocalePack = key => { ACTIVE = PACKS[key] ? key : DEFAULT_PACK }
export const localePackKey = () => ACTIVE
export const pack = () => PACKS[ACTIVE] || PACKS[DEFAULT_PACK]

// ── Accès pratiques (l'écran n'a pas à connaître la structure) ────────────────
export const regionLabel = () => pack().regionLabel
export const regions = () => pack().regions
export const idLabelFor = role => pack().idLabel(role)
export const idTypesFor = role => (pack().idTypes ? pack().idTypes(role) : [])
export const validId = v => pack().validId(v)
export const legal = () => pack().legal
export const packCurrency = () => pack().currency
export const countryCode = () => pack().iso || 'XX'
