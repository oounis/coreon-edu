// ════════════════════════════════════════════════════════════════════════════
// CÂBLER LE MOT D'INTERFACE SUR t() — AVEC UN VRAI PARSEUR.
//
// POURQUOI CET OUTIL EXISTE (2026-07-30). `i18n-wire.py` travaille au MOTIF.
// Pour les phrases accentuées cela passe, parce que l'accent est un indice si
// fort qu'il ne se trouve pas dans du code. Pour les MOTS d'interface sans
// accent — « Annuler », « Enregistrer », « Fermer », les libellés les plus vus
// du produit — l'indice disparaît, et le motif `>…<` attrape alors du JS :
//
//     events.filter(e => hasJoined(e, u.id))   →  le `>` de la flèche
//     (Date.now() - i.at) < 86400000           →  le `<` de la comparaison
//     return <div …>                           →  un mot-clé câblé
//
// Six fichiers cassés en une passe, sur les mêmes pièges que le commit de la
// veille avait pourtant nommés. La leçon, cette fois écrite dans le dépôt :
// SEUL UN ARBRE distingue un nœud de texte JSX d'un `>` arithmétique. Ce
// fichier-ci est le codemod AST — il ne devine rien, il lit des JSXText.
//
//   node docs/quality/i18n-wire-ast.mjs --dry            → essai à blanc
//   node docs/quality/i18n-wire-ast.mjs app/src/pages/Staff.jsx
//   node docs/quality/i18n-wire-ast.mjs --all
//
// Dépendance de DÉVELOPPEMENT seulement (app/package.json) : @babel/parser.
// Aucune barrière de CI n'en dépend — la barrière est `i18n-raw.py`, en Python
// pur. Un codemod est un outil de chantier, pas un gardien.
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createRequire } from 'node:module'

const ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '')
// @babel/parser est une devDependency de app/, pas de la racine : on résout
// DEPUIS app/ — sinon node remonte depuis docs/quality/ et ne trouve rien.
const { parse } = createRequire(join(ROOT, 'app/package.json'))('@babel/parser')
const SKIP = new Set(['i18n.js', 'i18n.ar.js', 'i18n.en.js'])

// Ce qui n'est PAS du texte à traduire. Trois familles, apprises en les
// câblant par erreur : les MARQUES (« Coreon Intelligence », « Kogia Group »),
// les RACCOURCIS et sigles (« Ctrl », « K », « CSV »), et les NOMS DE LANGUE
// (un sélecteur affiche chaque langue dans sa propre langue).
// …et les CODES : devise et pays sont des identifiants normalisés. Traduire
// « DT » casserait le calcul monétaire le jour où la clé entre au dictionnaire.
const NOT_TEXT = /^(Coreon|coreon|edu|Kogia|Ctrl|esc|OK|CSV|PDF|ZIP|API|URL|ID|manifest|Gradebook|OneRoster|Clever|Wonde|LMS|English|Français|العربية|DT|BHD|MAD|DZD|SAR|QAR|KWD|AED|LYD|EUR|USD|TND|TN|BH|QA|LY|MA|DZ)\b/i
// Un identifiant technique en camelCase (`classId`, `sourcedId`) : jamais du
// texte. Un mot d'interface ne colle pas une majuscule à une minuscule.
const IDENTIFIER = /^[a-z]+[A-Z][A-Za-z]*$/
// Un mot ou une courte expression d'interface : au moins une lettre pour
// commencer, et rien qui ressemble à du code (l'arbre s'en charge déjà, ceci
// écarte les restes : nombres seuls, ponctuation, séparateurs).
// Le jeu de caractères admis. La 1ʳᵉ version interdisait le DEUX-POINTS et
// les CHIFFRES : « Chaque article porte un seuil : en dessous, il apparaît
// ici. » était donc rejetée en silence — et le deux-points est la ponctuation
// la plus fréquente de ce produit. On l'ouvre, avec les guillemets français
// et les chiffres ; la FORME de l'expression (branche de ternaire, nœud de
// texte) reste ce qui garantit qu'on ne touche pas à du code.
const WORDISH = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9'’·«»…:;%\-–— ,.!?()/&+]{0,140}$/

/** Le texte mérite-t-il d'être câblé ? */
function translatable(txt) {
  if (!txt || txt.length < 2) return false          // « K », « · » : pas du texte
  if (!WORDISH.test(txt)) return false
  if (IDENTIFIER.test(txt)) return false
  // on teste la marque sur le mot NU : « Kogia Group ( » doit être reconnu
  const bare = txt.replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ)]+$/g, '')
  return !NOT_TEXT.test(bare) && !NOT_TEXT.test(txt)
}

function jsFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) jsFiles(p, out)
    else if (name.endsWith('.jsx') && !SKIP.has(name)) out.push(p)
  }
  return out
}

// Les props QUI PORTENT DU TEXTE. Sur un arbre, ce set est sûr : une
// JSXAttribute ne peut pas être un paramètre par défaut déstructuré — le piège
// qui interdisait à la version au motif de toucher aux props sans indice
// français (`title="Frais & Finances"`, `label="En retard"` : ni accent, ni
// mot-outil, donc invisibles, et pourtant en haut de l'écran).
const TEXT_PROPS = new Set([
  'title', 'sub', 'label', 'placeholder', 'hint', 'alt', 'aria-label',
])

/** Les chaînes d'une expression JSX qui sont VRAIMENT du texte affiché.
 *
 *  CE QUE L'ARBRE NE DIT PAS. Un AST donne la forme, pas la destination. Une
 *  première version descendait dans toute l'expression et a câblé :
 *      tab === 'etab'        →  tab === t('etab')     (une COMPARAISON)
 *      citiesOf(f.country || 'TN')                    (un CODE PAYS)
 *      <Ic n="Baby"/>                                 (un NOM D'ICÔNE)
 *  Aucun de ces trois n'est affiché ; les traduire casse la logique le jour où
 *  la clé entre au dictionnaire. On ne devine donc plus : on n'accepte que les
 *  FORMES dont la valeur est, par construction, ce que React va rendre —
 *      {cond ? 'Enregistrer' : 'Enregistrement…'}     les deux branches
 *      {x || 'Aucun'}                                 le défaut
 *      {'texte'}                                      la chaîne nue
 *  et on ne descend pas plus loin. Le reste se fait à la main, en le voyant.
 */
function strings(expr, hits) {
  const take = (n) => {
    if (n?.type === 'StringLiteral' && translatable(n.value.trim())) {
      hits.push({ start: n.start, end: n.end, txt: n.value.trim(), expr: true })
    }
  }
  if (!expr) return
  if (expr.type === 'StringLiteral') return take(expr)
  if (expr.type === 'ConditionalExpression') { take(expr.consequent); take(expr.alternate); return }
  if (expr.type === 'LogicalExpression' && (expr.operator === '||' || expr.operator === '??')) {
    // `cond && 'texte'` : la GAUCHE est un test, jamais du texte.
    take(expr.right)
    if (expr.left.type === 'ConditionalExpression') strings(expr.left, hits)
  }
}

/** Tous les JSXText traduisibles d'un fichier, en positions exactes. */
function targets(src) {
  const ast = parse(src, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'objectRestSpread'],
    errorRecovery: false,
  })
  // LE NOM LOCAL DE `t`. `Attach.jsx` importe `{ t as tr }` : un codemod qui
  // écrit `t(…)` produit alors un `t` non défini — attrapé par la barrière
  // oxlint `no-undef`, mais seulement après avoir cassé le fichier. On lit donc
  // le binding réel dans l'arbre au lieu de supposer qu'il s'appelle `t`.
  let local = null
  for (const st of ast.program.body) {
    if (st.type !== 'ImportDeclaration' || st.source.value !== '@core/i18n.js') continue
    for (const sp of st.specifiers) {
      if (sp.type === 'ImportSpecifier' && (sp.imported.name || sp.imported.value) === 't') {
        local = sp.local.name
      }
    }
  }

  const hits = []
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(walk); return }
    if (node.type === 'JSXText') {
      const raw = node.value
      const txt = raw.trim()
      if (translatable(txt)) {
        const lead = raw.length - raw.trimStart().length
        const tail = raw.length - raw.trimEnd().length
        hits.push({ start: node.start + lead, end: node.end - tail, txt })
      }
    }
    // ── LA TROISIÈME FAMILLE (2026-07-30, trouvée par le balayage navigateur) ──
    // `{saving ? 'Enregistrement…' : 'Enregistrer'}` : une chaîne DANS une
    // expression JSX. Invisible aux deux compteurs (ce n'est ni une clé `t()`,
    // ni un nœud de texte, ni une prop, ni une clé d'objet) ET à ce codemod,
    // qui ne lisait que JSXText et JSXAttribute. Le bouton « Enregistrer » de
    // l'appel restait français dans les trois langues.
    //
    // On ne descend que dans les ENFANTS (`{…}` entre balises) et dans les
    // props porteuses de texte : une expression d'attribut quelconque porte des
    // classes CSS, des routes, des couleurs — pas du texte.
    if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
      for (const child of node.children || []) {
        if (child.type === 'JSXExpressionContainer') strings(child.expression, hits)
      }
    }
    if (node.type === 'JSXAttribute' && node.value?.type === 'JSXExpressionContainer') {
      const nm = node.name.type === 'JSXNamespacedName'
        ? `${node.name.namespace.name}:${node.name.name.name}` : node.name.name
      if (TEXT_PROPS.has(nm)) strings(node.value.expression, hits)
    }
    if (node.type === 'JSXAttribute' && node.value?.type === 'StringLiteral') {
      const name = node.name.type === 'JSXNamespacedName'
        ? `${node.name.namespace.name}:${node.name.name.name}`
        : node.name.name
      const txt = node.value.value.trim()
      if (TEXT_PROPS.has(name) && translatable(txt)) {
        // on remplace la VALEUR entière, guillemets compris, par {t('…')}
        hits.push({ start: node.value.start, end: node.value.end, txt, attr: true })
      }
    }
    for (const k in node) {
      if (k === 'loc' || k === 'leadingComments' || k === 'trailingComments') continue
      walk(node[k])
    }
  }
  walk(ast.program.body)
  return { hits, local }
}

/** `import { t } from '@core/i18n.js'` — appelé seulement si `t` n'est pas déjà
 *  lié dans ce fichier (le binding réel est lu dans l'arbre, pas deviné). */
function ensureImport(src) {
  const named = src.match(/^import \{([^}]*)\} from '@core\/i18n\.js'\n/m)
  if (named) {
    return src.slice(0, named.index) +
      `import { ${named[1].trim()}, t } from '@core/i18n.js'\n` +
      src.slice(named.index + named[0].length)
  }
  const first = src.match(/^import .*\n/m)
  if (first) {
    return src.slice(0, first.index + first[0].length) +
      "import { t } from '@core/i18n.js'\n" +
      src.slice(first.index + first[0].length)
  }
  // Aucun import dans ce fichier : on insère APRÈS l'en-tête de commentaires,
  // pour ne pas décoller la bannière qui explique le fichier.
  const m = src.match(/^(?:\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)\s*\n)+/)
  const at = m ? m[0].length : 0
  return src.slice(0, at) + "import { t } from '@core/i18n.js'\n" + src.slice(at)
}

const argv = process.argv.slice(2)
const dry = argv.includes('--dry')
const all = argv.includes('--all')
let files = argv.filter((a) => !a.startsWith('--')).map((a) => join(ROOT, a))
if (all || files.length === 0) files = jsFiles(join(ROOT, 'app/src'))

let total = 0
for (const p of files) {
  const src = readFileSync(p, 'utf8')
  let hits, local
  try {
    ({ hits, local } = targets(src))
  } catch (e) {
    console.error(`✗ ${relative(ROOT, p)} — analyse impossible : ${e.message}`)
    process.exitCode = 1
    continue
  }
  if (!hits.length) continue
  const fn = local || 't'          // `t`, ou l'alias que ce fichier a choisi
  // On découpe DE LA FIN vers le début : les positions d'avant restent valides.
  let out = src
  for (const h of hits.slice().sort((a, b) => b.start - a.start)) {
    // CodeQL js/incomplete-sanitization : `replace(/'/g, "\\'")` n'échappait QUE
    // l'apostrophe. L'antislash, lui, passait tel quel — et il est le caractère
    // d'échappement du littéral. Un texte comme `C:\Users\name` ne produisait
    // même pas une erreur de syntaxe : il donnait `'C:\Users\name'`, que JS
    // relit comme `C:Users` + un saut de ligne + `ame`. Corruption silencieuse
    // du texte traduit, la pire espèce. Les retours ligne et les caractères de
    // contrôle avaient le même sort.
    // JSON.stringify échappe l'antislash, les guillemets ET les caractères de
    // contrôle, et rend toujours un littéral JS valide. On y perd la préférence
    // pour l'apostrophe : un outil de réécriture doit d'abord être correct.
    const lit = JSON.stringify(h.txt)
    // dans une EXPRESSION on n'ajoute pas d'accolades : on y est déjà.
    const rep = h.expr ? `${fn}(${lit})` : `{${fn}(${lit})}`
    out = out.slice(0, h.start) + rep + out.slice(h.end)
  }
  if (!local) out = ensureImport(out)
  total += hits.length
  console.log(`${relative(ROOT, p)}  +${hits.length}`)
  if (!dry) writeFileSync(p, out)
}
console.log(`\n${total} nœuds de texte câblés${dry ? ' (essai à blanc)' : ''}`)
