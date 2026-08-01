// ════════════════════════════════════════════════════════════════════════════
// LE JOURNAL D'AUDIT — qui a LU, qui a MODIFIÉ, quand, sur quel dossier.
//
// CR-039 · norme d'acceptation D6 · réserve A. C'est la question que pose un
// contrôleur PDPL (Bahreïn, Loi n° 30 de 2018) ou INPDP (Tunisie, loi 2004-63)
// et à laquelle le produit ne savait PAS répondre :
//
//     « Qui a consulté le dossier médical de cet enfant, et quand ? »
//
// Un ERP scolaire tient des données de santé d'enfants mineurs, des pièces
// d'identité, des salaires. Le contrôle d'accès dit qui A LE DROIT ; le journal
// dit qui L'A FAIT. Les deux sont exigés, et le second n'existait pas.
//
// ── TROIS DÉCISIONS QUI EXPLIQUENT TOUT LE FICHIER ──────────────────────────
//
// 1. LE JOURNAL VIT HORS DU BLOB DE L'ÉCOLE (sa propre clé de stockage).
//    Ce n'est pas du rangement : `acl.js` fusionne un blob POSTÉ par un client
//    dans le blob serveur, collection par collection. Si le journal était une
//    collection de ce blob, un client pourrait le RÉÉCRIRE en le postant. Une
//    clé séparée aujourd'hui = un point d'entrée séparé demain (`POST /api/audit`,
//    en AJOUT SEUL, une table sans droit UPDATE ni DELETE). La couture du
//    serveur est posée dès maintenant, à l'endroit où elle devra être.
//
// 2. AUCUN CHEMIN DE SUPPRESSION N'EXISTE. Pas de `clearAudit()`, pas de bouton.
//    La Direction LIT et EXPORTE ; elle n'efface pas. Même l'assistant
//    d'installation, qui purge les données de démonstration, ne fait
//    qu'ÉCRIRE une ligne de plus (« données de démonstration purgées »).
//    La seule perte possible est la ROTATION (le navigateur n'a que ~5 Mo) —
//    et elle est COMPTÉE, ancrée, et affichée. Un journal qui oublie en silence
//    ne vaut rien ; celui-ci dit combien il a oublié.
//
// 3. IL EST INFALSIFIABLE-ÉVIDENT, PAS INFALSIFIABLE. Chaque ligne porte une
//    empreinte de (empreinte précédente + son contenu) : modifier ou retirer
//    une ligne casse la chaîne, et `verifyChain()` NOMME la première ligne
//    rompue. Ce que cela n'est pas : une preuve cryptographique. Les données
//    vivent dans le navigateur de l'école ; qui sait ouvrir la console peut
//    recalculer la chaîne. Le disons-le clairement plutôt que de vendre une
//    garantie fausse : la vraie immuabilité arrive avec l'hébergement serveur
//    (D9), où la table est en AJOUT SEUL et l'école n'a pas la main dessus.
//    Ici, on détecte l'altération accidentelle et l'effacement opportuniste.
//
// ── CE QU'ON N'ÉCRIT JAMAIS ─────────────────────────────────────────────────
// La VALEUR consultée. Un journal qui recopie le groupe sanguin, l'allergie ou
// le salaire DOUBLE la fuite qu'il est censé surveiller — et devient lui-même
// un fichier sensible. On écrit QUI, QUAND, QUOI (la catégorie), SUR QUI (le
// dossier), et le contexte. Jamais le contenu.
//
// ── POURQUOI `detail` ET `note` SONT DEUX CHAMPS ────────────────────────────
// Le produit se lit en français, en anglais et en arabe, et le journal se
// relit des mois après l'événement — peut-être dans une autre langue que
// celle où il a été écrit. Une phrase libre stockée telle quelle figerait la
// langue du jour : un directeur bahreïni lirait « Autorisation retirée » en
// français dans un écran arabe. D'où la coupure :
//   · `detail` = une phrase d'un VOCABULAIRE FERMÉ (les constantes DETAILS
//     ci-dessous). C'est une CLÉ : `t()` la rend dans la langue du lecteur.
//   · `note`   = ce qui n'est d'aucune langue — un nom propre, un numéro de
//     document, un mois, une raison saisie par un humain. Jamais traduit,
//     jamais inventé.
// Le même partage vaut pour `subjectName` : un prénom traverse `t()` sans
// changer, un libellé fixe (« Registre de paie ») se traduit.
// ════════════════════════════════════════════════════════════════════════════
import { getItem, setItem } from './storage.js'
import { nowMs } from './clock.js'

const KEY = 'coreon_audit'
const VERSION = 1

// ~5 Mo de stockage pour TOUTE l'école : le journal ne peut pas tout prendre.
// 3000 lignes ≈ 500 Ko ≈ une année scolaire de consultations sensibles pour une
// école de 300 élèves. Au-delà, la plus ancienne sort — comptée, jamais tue.
export const MAX_ENTRIES = 3000

// ── LES CATÉGORIES SENSIBLES ────────────────────────────────────────────────
// Pas une liste de pages : une liste de NATURES DE DONNÉE, avec le motif
// juridique qui les met dans ce journal. C'est ce motif qu'un contrôleur lit.
// Ajouter une catégorie = une entrée ici, aucun autre fichier à toucher.
export const CATEGORIES = {
  sante:    { key: 'sante',    label: 'Santé',                why: 'Donnée de santé d’un mineur' },
  gardiens: { key: 'gardiens', label: 'Personnes autorisées', why: 'Donnée personnelle de tiers' },
  eleve:    { key: 'eleve',    label: 'Dossier élève',        why: 'Donnée personnelle d’un mineur' },
  accident: { key: 'accident', label: 'Accident',             why: 'Donnée de santé d’un mineur' },
  paie:     { key: 'paie',     label: 'Paie & contrats',      why: 'Donnée personnelle d’un salarié' },
  social:   { key: 'social',   label: 'Aide sociale',         why: 'Donnée sensible (situation familiale)' },
  identite: { key: 'identite', label: 'Pièces d’identité',    why: 'Pièce d’identité officielle' },
  compte:   { key: 'compte',   label: 'Comptes & accès',      why: 'Sécurité des accès' },
  audit:    { key: 'audit',    label: 'Journal d’audit',      why: 'Consultation du journal lui-même' },
}
export const CATEGORY_KEYS = Object.keys(CATEGORIES)

// ── LES ACTIONS ─────────────────────────────────────────────────────────────
export const ACTIONS = {
  read:   { key: 'read',   label: 'Consultation' },
  write:  { key: 'write',  label: 'Modification' },
  export: { key: 'export', label: 'Export' },
  login:  { key: 'login',  label: 'Connexion' },
  logout: { key: 'logout', label: 'Déconnexion' },
  denied: { key: 'denied', label: 'Refus d’accès' },
  system: { key: 'system', label: 'Opération système' },
}
export const ACTION_KEYS = Object.keys(ACTIONS)

// ── LE VOCABULAIRE FERMÉ DES DÉTAILS ────────────────────────────────────────
// Toute phrase écrite au journal vient d'ici, et de nulle part ailleurs. C'est
// ce qui rend le journal traduisible : ajouter un événement, c'est ajouter une
// ligne ici PUIS sa traduction EN et AR — la barrière CI refuse l'oubli.
export const DETAILS = {
  santeModifiee:    'Dossier de santé modifié',
  gardienAjoute:    'Autorisation de départ ajoutée',
  gardienRetire:    'Autorisation de départ retirée',
  enfantRemis:      'Enfant remis à une personne autorisée',
  accidentDeclare:  'Déclaration d’accident enregistrée',
  accidentAccuse:   'Accusé de réception du parent',
  compteCree:       'Compte créé',
  compteModifie:    'Compte modifié',
  compteRole:       'Rôle du compte changé',
  compteDesactive:  'Compte désactivé',
  compteReactive:   'Compte réactivé',
  motDePasse:       'Mot de passe réinitialisé',
  contratEnregistre:'Contrat enregistré',
  paieValidee:      'Paie du mois validée',
  paiePayee:        'Paie du mois marquée payée',
  documentDelivre:  'Document officiel délivré',
  demoPurgee:       'Données de démonstration purgées',
  identifiantsFaux: 'Identifiants incorrects',
  ecoleSuspendue:   'École suspendue',
  journalExporte:   'Journal exporté',
}

// ── L'EMPREINTE ─────────────────────────────────────────────────────────────
// cyrb53 : 53 bits, synchrone, sans dépendance — le cœur tourne aussi sur
// React Native, où `crypto.subtle` n'est ni présent ni synchrone. Non
// cryptographique, et c'est dit en tête de fichier : on détecte l'altération,
// on ne l'empêche pas.
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

/**
 * L'empreinte d'une ligne = f(empreinte précédente, TOUT le contenu de la ligne).
 *
 * « TOUT » n'est pas une précaution de style : le test de falsification a
 * d'abord ÉCHOUÉ ici. `userName` et `note` manquaient — on pouvait donc
 * réécrire le NOM affiché sans casser la chaîne, c'est-à-dire faire dire au
 * journal que quelqu'un d'AUTRE avait consulté le dossier. C'est exactement
 * l'altération qu'un coupable tenterait, et la seule qui compte vraiment.
 * RÈGLE : tout champ ajouté à une ligne s'ajoute AUSSI dans cette liste.
 *
 * Le séparateur n'est pas décoratif non plus : sans lui, ('ab','c') et
 * ('a','bc') donneraient la même empreinte — on pourrait déplacer un caractère
 * d'un champ au suivant sans que la chaîne s'en aperçoive.
 */
export function linkOf(prevLink, e) {
  return cyrb53([prevLink, e.n, e.at, e.userId, e.userName, e.role, e.action,
    e.category, e.subjectId, e.subjectName, e.detail, e.note, e.route].join('|'))
}

const GENESIS = 'coreon'

// ── LE STOCKAGE ─────────────────────────────────────────────────────────────
// `anchor` = l'empreinte de la ligne qui précède `entries[0]`. Tant qu'aucune
// rotation n'a eu lieu, c'est GENESIS. Après rotation, c'est l'empreinte de la
// dernière ligne sortie : la chaîne reste vérifiable sur ce qui reste.
function empty() { return { v: VERSION, seq: 0, dropped: 0, anchor: GENESIS, entries: [] } }

// Un journal plein pèse ~500 Ko, et chaque geste sensible le relit puis le
// réécrit en entier. Relire est le coût évitable : on garde en mémoire l'état
// tel qu'on l'a écrit et on ne ré-analyse QUE si le stockage a changé sous nos
// pieds — ce qui arrive pour de bon (un second onglet de la même école). Une
// mémoire qui ferait AUTORITÉ perdrait les lignes de l'autre onglet ; ici le
// stockage reste la vérité, la mémoire n'est qu'un raccourci vérifié.
let cache = null       // { raw, state }

function load() {
  try {
    const raw = getItem(KEY)
    if (!raw) return empty()
    if (cache && cache.raw === raw) return cache.state
    const o = JSON.parse(raw)
    if (!o || o.v !== VERSION || !Array.isArray(o.entries)) return empty()
    const state = { v: VERSION, seq: +o.seq || 0, dropped: +o.dropped || 0, anchor: o.anchor || GENESIS, entries: o.entries }
    cache = { raw, state }
    return state
  } catch { return empty() }
}

function persist(state) {
  const raw = JSON.stringify(state)
  const ok = setItem(KEY, raw)
  cache = ok ? { raw, state } : null    // écriture refusée : ne rien prétendre
  return ok
}

// ── ÉCRIRE ──────────────────────────────────────────────────────────────────
// Le journal ne casse JAMAIS le geste métier qu'il observe. Une écriture qui
// échoue (quota plein, navigation privée) ne remonte pas d'exception : elle
// renvoie null. Un dossier médical se lit même si le journal est saturé — mais
// `health()` le dira à la Direction, qui doit alors exporter et alléger.
let identity = () => null
/** Le cœur ne connaît pas React : l'application branche « qui est connecté ». */
export function setAuditIdentity(fn) { identity = typeof fn === 'function' ? fn : () => null }

// Une même consultation ne compte qu'une fois : React remonte un écran (mode
// strict, changement d'onglet, re-rendu) sans que personne n'ait rien reconsulté.
// Deux secondes : assez pour absorber un remontage, trop court pour masquer une
// vraie seconde consultation.
const DEDUPE_MS = 2000
const lastRead = new Map()

export function record({ action = 'read', category, subjectId = '', subjectName = '', detail = '', note = '', route = '', user = null }) {
  try {
    if (!CATEGORIES[category]) return null
    const u = user || identity() || {}
    const at = nowMs()

    if (action === 'read') {
      const k = `${u.id || '?'}|${category}|${subjectId}`
      const prev = lastRead.get(k)
      if (prev && at - prev < DEDUPE_MS) return null
      lastRead.set(k, at)
    }

    const state = load()
    const entry = {
      n: state.seq + 1,
      at,
      userId: u.id || '',
      userName: u.name || '',
      role: u.role || '',
      action,
      category,
      subjectId: String(subjectId || ''),
      subjectName: String(subjectName || ''),
      detail: String(detail || ''),
      note: String(note || ''),
      route: String(route || ''),
    }
    const prevLink = state.entries.length ? state.entries[state.entries.length - 1].link : state.anchor
    entry.link = linkOf(prevLink, entry)

    state.seq = entry.n
    state.entries.push(entry)
    while (state.entries.length > MAX_ENTRIES) {
      const out = state.entries.shift()
      state.anchor = out.link      // la chaîne repart de la dernière ligne sortie
      state.dropped++
    }
    persist(state)
    return entry
  } catch { return null }
}

/** Raccourcis lisibles au point d'appel — c'est eux qu'on lit dans les écrans. */
export const auditRead = (category, subject = {}) =>
  record({ action: 'read', category, subjectId: subject.id, subjectName: subject.name, detail: subject.detail, note: subject.note, route: subject.route })
export const auditWrite = (category, subject = {}) =>
  record({ action: 'write', category, subjectId: subject.id, subjectName: subject.name, detail: subject.detail, note: subject.note, route: subject.route })

// ── LIRE ────────────────────────────────────────────────────────────────────
export function auditEntries() { return load().entries }
export function auditState() { const s = load(); return { seq: s.seq, dropped: s.dropped, count: s.entries.length, max: MAX_ENTRIES } }

/**
 * La requête du contrôleur. Tous les critères sont optionnels et se combinent ;
 * le résultat est du plus récent au plus ancien — on demande toujours « qui,
 * en dernier ? » avant « qui, il y a six mois ? ».
 */
export function auditTrail({ from = null, to = null, userId = '', category = '', action = '', subjectId = '', q = '' } = {}) {
  const needle = String(q || '').trim().toLowerCase()
  return auditEntries().filter(e => {
    if (from != null && e.at < from) return false
    if (to != null && e.at > to) return false
    if (userId && e.userId !== userId) return false
    if (category && e.category !== category) return false
    if (action && e.action !== action) return false
    if (subjectId && e.subjectId !== subjectId) return false
    if (needle && !`${e.userName} ${e.subjectName} ${e.note}`.toLowerCase().includes(needle)) return false
    return true
  }).reverse()
}

/** LA question PDPL, en un appel : qui a touché à ce dossier ? */
export function whoTouched(subjectId, category = '') {
  return auditTrail({ subjectId, category })
}

// ── VÉRIFIER ────────────────────────────────────────────────────────────────
/**
 * Recalcule la chaîne depuis l'ancre. Renvoie la PREMIÈRE ligne rompue, pas un
 * simple booléen : « le journal est faux » n'aide personne, « la ligne 1841 du
 * 12 mars ne correspond plus » se vérifie et se raconte.
 */
export function verifyChain() {
  const state = load()
  let prev = state.anchor
  for (const e of state.entries) {
    if (linkOf(prev, e) !== e.link) return { ok: false, checked: state.entries.length, brokenAt: e.n, at: e.at, dropped: state.dropped }
    prev = e.link
  }
  return { ok: true, checked: state.entries.length, brokenAt: null, at: null, dropped: state.dropped }
}

/** L'état de santé du journal, pour l'afficher sans faire réfléchir la Direction. */
export function auditHealth() {
  const { count, dropped, max } = auditState()
  const chain = verifyChain()
  return { ...chain, count, dropped, max, full: count >= max, nearFull: count >= max * 0.9 }
}

// ── EXPORTER ────────────────────────────────────────────────────────────────
// L'export EST la réponse au contrôleur : un fichier daté qu'on lui remet. Il
// est lui-même journalisé — sortir le journal est un geste sensible.
const csvCell = v => {
  const s = String(v ?? '')
  // Une cellule qui commence par = + - @ est exécutée par Excel (injection de
  // formule). Le tableur n'est pas un terminal : on la neutralise.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}
export const AUDIT_CSV_HEADER = ['n', 'horodatage', 'utilisateur', 'role', 'action', 'categorie', 'dossier_id', 'dossier', 'detail', 'note', 'route', 'empreinte']

export function auditCsv(rows = null) {
  const list = rows || auditEntries()
  const lines = [AUDIT_CSV_HEADER.join(',')]
  for (const e of list) {
    lines.push([e.n, new Date(e.at).toISOString(), e.userName, e.role, e.action,
      e.category, e.subjectId, e.subjectName, e.detail, e.note, e.route, e.link].map(csvCell).join(','))
  }
  return lines.join('\n')
}
