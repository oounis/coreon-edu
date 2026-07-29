// ════════════════════════════════════════════════════════════════════════════
// LE REPÈRE DE DATES SUIT LE LECTEUR — pas le développeur.
//
// LE DÉFAUT (trouvé le 2026-07-29). Vingt-et-un fichiers écrivaient
// `format(d, 'EEEE d MMMM', { locale: fr })` — le français EN DUR, cinquante et
// une fois. Résultat : une directrice de Manama qui lit l'anglais voyait
// « Students · 29 juillet 2026 », et en arabe la date restait française au
// milieu d'un écran de droite à gauche. L'audit de traduction ne pouvait pas le
// voir : il mesure les clés `t()`, et une date n'en est pas une. La couverture
// pouvait donc atteindre 95 % avec toutes les dates en français.
//
// LA RÈGLE. Un seul endroit décide, et il décide comme `dateLocale()` du cœur :
// la langue donne la famille, le PAYS départage l'arabe.
//   fr → fr · en → en-GB (Golfe : jj/mm/aaaa, pas le format américain)
//   ar → arTN en Tunisie (« جويلية ») · ar (MSA) partout ailleurs (« يوليو »)
// C'est la leçon du FAT 2026-07-26 : « جويلية » est l'arabe TUNISIEN, Bahreïn
// dit « يوليو ». Une date arabe juste au Bahreïn est fausse à Tunis, et
// l'inverse — seul le pack pays tranche.
//
// POURQUOI ICI ET PAS DANS LE CŒUR. `core/` est du JS pur sans dépendance :
// il ne connaît pas date-fns et ne doit pas l'apprendre. Le cœur publie le
// repère BCP-47 (`dateLocale()`, pour Intl) ; cette couture-ci traduit la même
// décision en objets date-fns pour le web.
//
// USAGE. `import { df } from '../datefns.js'` puis `{ locale: df() }`.
// Ne jamais réimporter `fr` depuis 'date-fns/locale' dans une page : la
// barrière `python3 docs/quality/i18n-audit.py --dates` refuse que le français
// revienne en dur.
// ════════════════════════════════════════════════════════════════════════════
import { fr, enGB, ar, arTN } from 'date-fns/locale'
import { locale } from '@core/i18n.js'
import { countryCode } from '@core/locales.js'

/** Le repère date-fns du lecteur : langue d'abord, pays pour départager l'arabe. */
export function df() {
  const l = locale()
  if (l === 'en') return enGB
  if (l === 'ar') return countryCode() === 'TN' ? arTN : ar
  return fr
}

/** Sucre : `{ locale: df() }` écrit une fois pour toutes. */
export const dfOpt = () => ({ locale: df() })
