// ── Espace parents : logique des événements proposés par les parents ────────
//
// Un parent propose une sortie (match de football, atelier danse, café des parents…).
// Les autres parents s'inscrivent pendant une fenêtre de 24 h. Si le quorum est
// atteint, la proposition part à la Direction, qui approuve et réserve le lieu.
//
// Les règles ci-dessous sont celles des plateformes qui font ça pour de vrai
// (Spond, Meetup, Playo, Eventbrite) :
//
//  • QUORUM + ÉCHÉANCE. On fixe un minimum de participants et une date limite
//    d'inscription. Passée l'échéance sans le quorum, l'événement est annulé
//    automatiquement et personne ne doit rien : c'est le « minimum players /
//    auto-cancel » de Spond et Playo.
//  • CONSENTEMENT AU PRIX AVANT L'INSCRIPTION. Le prix par personne est affiché
//    sur la carte ET dans la boîte d'inscription, et le parent doit cocher
//    « J'ai compris que ma participation coûte X DT » pour pouvoir s'inscrire.
//    On enregistre le montant accepté et l'horodatage : c'est cette trace qui
//    évite qu'un parent arrive au terrain en croyant que c'est gratuit.
//    Si l'organisateur change le prix après coup, tous les consentements sautent
//    et chacun doit re-confirmer (sinon on lui aurait fait accepter un autre prix).
//  • ON NE PRÉLÈVE RIEN DANS L'APPLICATION. Le parent s'engage (« pledge »),
//    et l'argent est encaissé par l'administration — exactement comme les frais
//    de scolarité : le parent signale, l'administration confirme. Jamais l'inverse.
//  • DÉLAI DE RÉSERVATION. Un lieu scolaire se réserve à l'avance : on impose
//    3 jours francs entre la proposition et l'événement, pour laisser le temps
//    des inscriptions (24 h) puis de la décision de la Direction.
//  • ANNULATION. Quorum manqué, refus de la Direction, ou annulation par
//    l'organisateur : dans les trois cas, aucun paiement n'est dû.

import { STATUS, BRAND } from './tokens.js'
import { currency } from './currency.js'
export const MIN_LEAD_DAYS = 3        // délai minimum entre la proposition et l'événement
export const RSVP_WINDOW_H = 24       // fenêtre d'inscription
export const DEFAULT_MIN = 8          // quorum par défaut (un match de foot : 8 joueurs)
export const CANCEL_WINDOW_H = 48     // au-delà, un désistement est « tardif »

// Le libellé du bouton d'inscription doit ÉNONCER l'obligation de payer — un simple
// « Confirmer » ne suffit pas, même quand le paiement est conditionnel (directive
// européenne 2011/83 art. 8(2) ; CJUE C-249/21 Fuhrmann, C-400/22 Conny). On garde
// la même exigence ici : c'est aussi la meilleure protection contre le parent qui
// arrive au terrain en pensant que c'est gratuit.
export const joinButtonLabel = ev => (ev.pricePerPerson || 0) > 0
  ? `Réserver ma place : ${ev.pricePerPerson} ${currency()} si confirmé`
  : 'Réserver ma place · gratuit'

// ── États ───────────────────────────────────────────────────────────────────
// Toute proposition passe par DEUX validations : l'Administration instruit
// (lieu libre ? conflit ? sécurité nécessaire ?), puis la Direction tranche.
// Un seul valideur, c'était une signature ; deux, c'est une décision.
//
// collecte   : inscriptions ouvertes, quorum pas encore atteint
// quorum     : quorum atteint, inscriptions ouvertes jusqu'à l'échéance
// soumis     : à l'étude par l'Administration
// vise       : visé par l'Administration, en attente de la Direction
// approuve   : approuvé par la Direction — lieu réservé, calendrier, sécurité prévenue
// refuse     : refusé (par l'Administration ou la Direction), motif obligatoire
// annule     : annulé par l'organisateur
// echoue     : échéance passée sans le quorum → annulation automatique
// termine    : la date est passée
export const STATES = {
  collecte: { label: 'Inscriptions ouvertes', color: STATUS.info },
  quorum:   { label: 'Quorum atteint',        color: STATUS.ok },
  soumis:   { label: "En attente de l'Administration", color: STATUS.warn },
  vise:     { label: 'Visé · en attente de la Direction', color: BRAND.indigo },
  approuve: { label: 'Approuvé',              color: STATUS.ok },
  refuse:   { label: 'Refusé',                color: STATUS.danger },
  annule:   { label: 'Annulé',                color: STATUS.neutral },
  echoue:   { label: 'Quorum non atteint',    color: STATUS.neutral },
  termine:  { label: 'Terminé',               color: STATUS.neutral },
}
export const isLive = s => s === 'collecte' || s === 'quorum'
export const isDead = s => s === 'refuse' || s === 'annule' || s === 'echoue'
export const isPending = s => s === 'soumis' || s === 'vise'

// La chaîne de validation : Administration, puis Direction.
export const CHAIN = ['admin', 'schooladmin']
// Qui doit décider maintenant ?
export const awaitingRole = ev => ev.status === 'soumis' ? 'admin' : ev.status === 'vise' ? 'schooladmin' : null
// Personne ne valide sa propre proposition (même règle que les demandes RH).
export const canDecide = (ev, user) =>
  awaitingRole(ev) === user.role && ev.by !== user.id

// ── Espaces ─────────────────────────────────────────────────────────────────
// Chaque corps de l'école a son espace : les parents entre eux, les enseignants
// entre eux, l'administration entre elle. Les sujets ne se mélangent pas — on ne
// propose pas une réunion pédagogique aux parents, ni un café des parents à la
// comptabilité. La Direction et l'Administration voient tout (elles valident).
export const SPACES = {
  parent: {
    key: 'parent', label: 'Espace parents', members: 'aux parents', roles: ['parent'],
    sub: "Proposez une sortie, un match, un atelier. Les autres parents s'inscrivent, l'école valide.",
  },
  teacher: {
    key: 'teacher', label: 'Espace enseignants', members: 'aux enseignants', roles: ['teacher'],
    sub: 'Formations, réunions pédagogiques, sorties entre collègues : proposées par vous, validées par l\'école.',
  },
  staff: {
    key: 'staff', label: 'Espace personnel', members: 'au personnel de l’école', roles: ['admin', 'schooladmin', 'supervisor', 'security'],
    sub: "Réunions, formations et moments d'équipe du personnel de l'école.",
  },
}
export const spaceOfRole = role => Object.values(SPACES).find(s => s.roles.includes(role))?.key || 'staff'
// L'Administration et la Direction valident tous les espaces ; elles les VOIENT tous.
// Voir un espace et en faire partie sont deux choses différentes : la Direction lit
// le match de football des pères pour l'approuver, elle ne s'y inscrit pas.
export const seesAllSpaces = role => role === 'admin' || role === 'schooladmin'
export const belongsToSpace = (space, role) => spaceOfRole(role) === (space || 'parent')

// ── Catégories (par espace) ─────────────────────────────────────────────────
// Icônes désignées par leur NOM lucide (contrat <Ic n="…"/>), jamais par un emoji.
// Un emoji est dessiné par le SYSTÈME : le même caractère n'a pas le même style sur
// Android, iOS, Windows et le web. C'est exactement ce qui donnait à Kogia une
// iconographie différente sur chaque écran. Source : brand/KOGIA_HARMONY.md §6
const CAT = {
  sport:      { k: 'sport',      label: 'Sport',                icon: 'Volleyball' },
  atelier:    { k: 'atelier',    label: 'Atelier',              icon: 'Palette' },
  sortie:     { k: 'sortie',     label: 'Sortie',               icon: 'Bus' },
  rencontre:  { k: 'rencontre',  label: 'Rencontre',            icon: 'Coffee' },
  solidarite: { k: 'solidarite', label: 'Solidarité',           icon: 'HeartHandshake' },
  fete:       { k: 'fete',       label: 'Fête',                 icon: 'PartyPopper' },
  formation:  { k: 'formation',  label: 'Formation',            icon: 'GraduationCap' },
  pedago:     { k: 'pedago',     label: 'Réunion pédagogique',  icon: 'Presentation' },
  reunion:    { k: 'reunion',    label: 'Réunion de service',   icon: 'FolderKanban' },
}
export const CATEGORIES = Object.values(CAT)
export const CATEGORIES_OF = {
  parent:  [CAT.sport, CAT.atelier, CAT.sortie, CAT.rencontre, CAT.solidarite, CAT.fete],
  teacher: [CAT.formation, CAT.pedago, CAT.atelier, CAT.sport, CAT.sortie, CAT.fete],
  staff:   [CAT.reunion, CAT.formation, CAT.solidarite, CAT.sport, CAT.fete],
}

// Mixité. En Tunisie, une activité « réservée aux mères » est courante et se dit
// simplement ainsi. On parle des PARENTS (mères / pères), pas d'un genre abstrait :
// c'est plus clair, plus respectueux, et cohérent avec le fait que cet espace est
// réservé aux parents de l'école. Une activité mixte reste le défaut.
// On dit « réservé aux… » (désigné) plutôt que « interdit aux… » (barré) : même
// règle, formulation respectueuse. Mixte est le défaut, et une activité non mixte
// exige un motif — pour qu'elle réponde à un besoin réel (confort, sport, garde)
// et non à une exclusion, ce que la Constitution tunisienne (art. 21) et la loi
// de 2018 contre les discriminations invitent à prendre au sérieux.
// `restricted` s'accorde avec « activité » (féminin) : « réservée aux mères ».
export const AUDIENCES = [
  { k: 'mixte',  label: 'Mixte · tous les parents', short: 'Mixte', gender: null,    restricted: null },
  { k: 'meres',  label: 'Réservé aux mères',        short: 'Mères', gender: 'Femme', restricted: 'réservée aux mères' },
  { k: 'peres',  label: 'Réservé aux pères',        short: 'Pères', gender: 'Homme', restricted: 'réservée aux pères' },
  // Hors espace parents on ne parle plus de « mères » et de « pères ».
  { k: 'tous',   label: 'Ouvert à tous',            short: 'Tous',    gender: null,    restricted: null },
  { k: 'femmes', label: 'Réservé aux femmes',       short: 'Femmes',  gender: 'Femme', restricted: 'réservée aux femmes' },
  { k: 'hommes', label: 'Réservé aux hommes',       short: 'Hommes',  gender: 'Homme', restricted: 'réservée aux hommes' },
]
export const audienceOf = k => AUDIENCES.find(a => a.k === k) || AUDIENCES[0]
export const needsReason = k => !!audienceOf(k).gender
export const AUDIENCES_OF = {
  parent:  ['mixte', 'meres', 'peres'].map(audienceOf),
  teacher: ['tous', 'femmes', 'hommes'].map(audienceOf),
  staff:   ['tous', 'femmes', 'hommes'].map(audienceOf),
}
export const defaultAudience = space => AUDIENCES_OF[space][0].k

// Les enfants : la question que tout parent se pose avant de dire oui.
export const KIDS = [
  { k: 'bienvenus', label: 'Enfants bienvenus',        hint: 'Vous pouvez venir avec vos enfants.' },
  { k: 'sans',      label: 'Sans les enfants',         hint: 'Activité réservée aux adultes : merci de ne pas amener les enfants.' },
  { k: 'garde',     label: 'Garde d’enfants prévue',   hint: 'Une garde est organisée sur place pendant l’activité.' },
  { k: 'pour',      label: 'Pour les enfants',         hint: 'L’activité est destinée aux enfants, accompagnés d’un parent.' },
]
export const kidsOf = k => KIDS.find(x => x.k === k) || KIDS[0]

export const PLACES = ['Terrain de football', 'Cour de l’école', 'Gymnase', 'Salle polyvalente', 'Salle de classe', 'Bibliothèque', 'Extérieur (hors école)']

// ── Règles de date ──────────────────────────────────────────────────────────
const DAY = 86400000
export const addDays = (d, n) => new Date(d.getTime() + n * DAY)

// La date la plus proche autorisée pour un événement (aujourd'hui + 3 jours).
export function earliestDate(now) {
  const d = addDays(now, MIN_LEAD_DAYS)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Échéance d'inscription : 24 h après la proposition, sans jamais dépasser la veille
// de l'événement (on doit laisser à la Direction le temps de décider).
export function rsvpDeadline(createdAt, dateISO) {
  const window = createdAt + RSVP_WINDOW_H * 3600000
  const eve = new Date(dateISO + 'T00:00:00').getTime() - DAY
  return Math.min(window, eve)
}
export const deadlinePassed = (ev, now = Date.now()) => now >= rsvpDeadline(ev.at, ev.date)

// ── Participants ────────────────────────────────────────────────────────────
// Un participant : { userId, name, rsvp:'oui'|'peut-etre', adults, children,
//                    priceAgreedPerPerson, amountAgreed, agreedAt, waitlisted }
// Seul « oui » compte pour le quorum et pour la capacité — « peut-être » est un
// signal, pas un engagement (c'est la convention de Spond, Bloomz, TeamSnap).
const going = ev => (ev.participants || []).filter(p => p.rsvp === 'oui' && !p.waitlisted)
export const goingList = going
export const maybeList = ev => (ev.participants || []).filter(p => p.rsvp === 'peut-etre')
export const waitlist = ev => (ev.participants || []).filter(p => p.waitlisted)

// On compte les têtes, pas les inscriptions : un parent qui vient avec 2 enfants
// occupe 3 places. Adultes et enfants sont comptés séparément (modèle ParentSquare).
export const headsOf = p => Math.max(1, p.adults || 1) + Math.max(0, p.children || 0)
export const goingCount = ev => going(ev).reduce((n, p) => n + headsOf(p), 0)
export const adultCount = ev => going(ev).reduce((n, p) => n + Math.max(1, p.adults || 1), 0)
export const childCount = ev => going(ev).reduce((n, p) => n + Math.max(0, p.children || 0), 0)

export const seatsLeft = ev => (ev.maxParticipants ? Math.max(0, ev.maxParticipants - goingCount(ev)) : null)
export const isFull = ev => ev.maxParticipants ? goingCount(ev) >= ev.maxParticipants : false
export const hasJoined = (ev, userId) => (ev.participants || []).some(p => p.userId === userId)
export const participantOf = (ev, userId) => (ev.participants || []).find(p => p.userId === userId)
// Le quorum se mesure en ADULTES : huit joueurs de football, pas huit poussettes.
export const quorumReached = ev => adultCount(ev) >= (ev.minParticipants || DEFAULT_MIN)
export const missingForQuorum = ev => Math.max(0, (ev.minParticipants || DEFAULT_MIN) - adultCount(ev))

// Peut-on rejoindre ? Renvoie null si oui, sinon la raison (affichée telle quelle).
export function joinBlockedReason(ev, user) {
  // On ne s'inscrit que dans SON espace. L'Administration voit l'activité des parents
  // pour l'instruire ; elle n'y prend pas une place.
  if (!belongsToSpace(ev.space, user.role)) return `Activité réservée ${SPACES[ev.space || 'parent'].members}.`
  if (!isLive(ev.status)) return "Les inscriptions sont closes."
  if (deadlinePassed(ev)) return "La date limite d'inscription est passée."
  if (hasJoined(ev, user.id)) return null
  const aud = audienceOf(ev.audience)
  if (aud.gender) {
    if (!user.gender) return `Activité ${aud.restricted} : renseignez votre civilité dans votre profil pour vous inscrire.`
    if (user.gender !== aud.gender) return `Activité ${aud.restricted}.`
  }
  return null   // complet → on n'interdit pas, on met en liste d'attente
}

// Le total qu'un parent s'engage à payer : une place par tête présente.
export const amountFor = (ev, adults = 1, children = 0) =>
  (ev.pricePerPerson || 0) * (Math.max(1, adults) + Math.max(0, children))

// Quand une place se libère, le premier de la liste d'attente est promu (FIFO).
export function promoteFromWaitlist(ev) {
  const promoted = []
  for (const p of (ev.participants || [])) {
    if (!p.waitlisted) continue
    if (ev.maxParticipants && goingCount(ev) + headsOf(p) > ev.maxParticipants) break
    p.waitlisted = false
    promoted.push(p)
  }
  return promoted
}

// Un désistement tardif (moins de 48 h avant) prive l'organisateur d'une place
// qu'il ne pourra plus remplir : on le signale, sans le bloquer.
export const isLateWithdrawal = (ev, now = Date.now()) =>
  new Date(ev.date + 'T00:00:00').getTime() - now < CANCEL_WINDOW_H * 3600000

// La Direction ne doit pas réserver un lieu déjà pris ce jour-là par l'école.
export function facilityClash(ev, schoolEvents = []) {
  if (!ev.place || ev.place.startsWith('Extérieur')) return null
  return schoolEvents.find(e => e.date === ev.date && e.place && e.place.trim().toLowerCase() === ev.place.trim().toLowerCase()) || null
}

// ── Sécurité ────────────────────────────────────────────────────────────────
// Un agent de sécurité ne peut pas ouvrir un portail dont il n'a pas entendu
// parler. Un événement doit être couvert quand :
//   • il commence ou se termine hors des heures scolaires (avant 07:30, après 18:00) ;
//   • il fait entrer beaucoup de monde ;
//   • il accueille des personnes qui ne sont pas du personnel (les parents).
export const SCHOOL_OPENS = '07:30'
export const NIGHT_FROM = '18:00'
export const CROWD_THRESHOLD = 15
// Préavis minimum pour l'agent : 72 h (idéal : une semaine).
// L'agent est un employé de l'école, pas une société qu'on réserve — il n'a pas
// besoin d'être recruté, il a besoin de PRÉPARER : reconnaître les issues et
// l'éclairage, vérifier les moyens de secours, établir le plan de portail et la
// liste des invités, sortir les clés. Les guides de sécurité événementielle
// placent cette préparation dans la semaine qui précède ; en deçà de 72 h, la
// reconnaissance saute. C'est exactement le délai de réservation d'un lieu
// (MIN_LEAD_DAYS = 3 jours), donc les deux règles se tiennent.
export const SECURITY_NOTICE_H = 72

const hhmmToMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0) }
export const isNightEvent = ev => hhmmToMin(ev.time) >= hhmmToMin(NIGHT_FROM) || hhmmToMin(ev.time) < hhmmToMin(SCHOOL_OPENS)

export function securityNeeds(ev) {
  // Ce qui déclenche vraiment une présence : la nuit, la foule, la sortie du site.
  // En pleine journée, l'agent est déjà au portail — un café des parents à 9 h ne
  // demande pas de vacation. On ne crie pas au loup, sinon plus personne n'écoute.
  const reasons = []
  if (isNightEvent(ev)) reasons.push('Événement en soirée : ouverture et fermeture du portail, éclairage')
  if (goingCount(ev) >= CROWD_THRESHOLD) reasons.push(`Affluence : ${goingCount(ev)} personnes attendues`)
  if (ev.place && ev.place.startsWith('Extérieur')) reasons.push('Activité hors de l’école : sortie et retour du groupe')
  // La présence de personnes extérieures aggrave, mais ne suffit pas à elle seule.
  if (reasons.length && ev.space === 'parent') reasons.push('Accueil de personnes extérieures au personnel (parents)')
  return reasons
}
export const needsSecurity = ev => securityNeeds(ev).length > 0

// L'agent a-t-il été prévenu assez tôt ?
export function securityNotice(ev, now = Date.now()) {
  const start = new Date(`${ev.date}T${ev.time || '00:00'}:00`).getTime()
  const hours = (start - (ev.securityNotifiedAt || now)) / 3600000
  return { hours: Math.round(hours), short: hours < SECURITY_NOTICE_H }
}

// Le consentement d'un participant est-il toujours valable ? Si l'organisateur a
// changé le prix depuis, non : il faut re-confirmer le nouveau montant. On ne peut
// pas faire payer à quelqu'un un prix qu'il n'a jamais accepté.
export const consentStale = (ev, p) => (ev.pricePerPerson || 0) !== (p.priceAgreedPerPerson ?? 0)

// ── Transitions automatiques ────────────────────────────────────────────────
// Appelée à l'affichage : fait avancer les événements que le temps a rattrapés.
// Renvoie la liste des changements pour que l'appelant puisse notifier.
export function sweep(events, now = Date.now()) {
  const changes = []
  for (const ev of events) {
    if (isDead(ev.status) || ev.status === 'termine') continue
    const past = new Date(ev.date + 'T23:59:59').getTime() < now
    if (ev.status === 'approuve' && past) { ev.status = 'termine'; changes.push({ ev, to: 'termine' }); continue }
    if (isLive(ev.status) && deadlinePassed(ev, now)) {
      if (quorumReached(ev)) { ev.status = 'soumis'; ev.submittedAt = now; changes.push({ ev, to: 'soumis' }) }
      else { ev.status = 'echoue'; changes.push({ ev, to: 'echoue' }) }
      continue
    }
    if (isLive(ev.status)) {
      const next = quorumReached(ev) ? 'quorum' : 'collecte'
      if (next !== ev.status) { ev.status = next; changes.push({ ev, to: next }) }
    }
    if ((isPending(ev.status) || ev.status === 'approuve') && past && ev.status !== 'termine') {
      ev.status = 'termine'; changes.push({ ev, to: 'termine' })
    }
  }
  return changes
}

// ── Catalogue d'activités ───────────────────────────────────────────────────
// Le titre n'est pas un champ libre : on choisit une activité, et tout le reste
// suit — catégorie, lieu, mixité, enfants, quorum, prix. Un parent qui veut un
// match de football ne devrait pas avoir à décider dans quelle « catégorie » il
// range son match, ni sur quel terrain il se joue.
export const IDEAS = [
  { title: 'Match de football entre pères',       cat: 'sport',      audience: 'peres', kids: 'sans',      place: 'Terrain de football', min: 10, price: 5,  desc: 'Deux équipes, une heure de jeu, bonne humeur garantie.', covers: 'la location du terrain et les arbitres' },
  { title: 'Atelier danse entre mères',           cat: 'atelier',    audience: 'meres', kids: 'garde',     place: 'Salle polyvalente',   min: 8,  price: 8,  desc: 'Une heure de danse avec une intervenante. Une garde d’enfants est organisée sur place.', covers: 'l’intervenante et la garde d’enfants' },
  { title: 'Café des parents',                    cat: 'rencontre',  audience: 'mixte', kids: 'bienvenus', place: 'Bibliothèque',        min: 6,  price: 0,  desc: 'Un moment simple pour se rencontrer autour d’un café. Gratuit.' },
  { title: 'Tournoi de pétanque',                 cat: 'sport',      audience: 'mixte', kids: 'bienvenus', place: 'Cour de l’école',     min: 8,  price: 3,  desc: 'Doublettes tirées au sort.', covers: 'les boissons' },
  { title: 'Journée propreté du jardin',          cat: 'solidarite', audience: 'mixte', kids: 'bienvenus', place: 'Cour de l’école',     min: 6,  price: 0,  desc: 'On remet le jardin de l’école en état, ensemble. Apportez des gants.' },
  { title: 'Atelier cuisine tunisienne',          cat: 'atelier',    audience: 'mixte', kids: 'sans',      place: 'Salle polyvalente',   min: 8,  price: 12, desc: 'On cuisine et on partage le repas.', covers: 'les ingrédients' },
  { title: 'Sortie randonnée familiale',          cat: 'sortie',     audience: 'mixte', kids: 'pour',      place: 'Extérieur (hors école)', min: 10, price: 6, desc: 'Randonnée facile, adaptée aux enfants.', covers: 'le transport' },
  { title: 'Tournoi d’échecs parents–enfants',    cat: 'sport',      audience: 'mixte', kids: 'pour',      place: 'Bibliothèque',        min: 6,  price: 0,  desc: 'Chaque enfant joue avec un parent. Gratuit, échiquiers fournis.' },
  { title: 'Fête de fin d’année des parents',     cat: 'fete',       audience: 'mixte', kids: 'bienvenus', place: 'Cour de l’école',     min: 15, price: 10, desc: 'Chacun apporte un plat.', covers: 'la sono et la décoration' },
  { title: 'Séance de yoga entre mères',          cat: 'atelier',    audience: 'meres', kids: 'garde',     place: 'Gymnase',             min: 8,  price: 7,  desc: 'Une heure de yoga doux avec une professeure. Tapis fournis.', covers: 'la professeure et la garde d’enfants' },
  { title: 'Tournoi de volley-ball',              cat: 'sport',      audience: 'mixte', kids: 'bienvenus', place: 'Cour de l’école',     min: 12, price: 3,  desc: 'Équipes mixtes tirées au sort, deux terrains.', covers: 'les filets et les ballons' },
  { title: 'Basket entre parents',                cat: 'sport',      audience: 'mixte', kids: 'sans',      place: 'Gymnase',             min: 10, price: 4,  desc: 'Match amical, cinq contre cinq.', covers: 'la location du gymnase' },
  { title: 'Atelier lecture pour les enfants',    cat: 'atelier',    audience: 'mixte', kids: 'pour',      place: 'Bibliothèque',        min: 6,  price: 0,  desc: 'Des parents lisent des histoires aux enfants.' },
  { title: 'Match de football entre mères',       cat: 'sport',      audience: 'meres', kids: 'garde',     place: 'Terrain de football', min: 10, price: 5,  desc: 'Deux équipes, une heure de jeu. Garde d’enfants sur place.', covers: 'la location du terrain et la garde d’enfants' },
]
// ── Catalogue des enseignants ───────────────────────────────────────────────
export const IDEAS_TEACHER = [
  { title: 'Formation : évaluer sans noter',      cat: 'formation', audience: 'tous',   kids: 'sans', place: 'Salle polyvalente', min: 6, price: 0, desc: "Atelier entre collègues sur l'évaluation par compétences." },
  { title: 'Conseil de cycle',                     cat: 'pedago',    audience: 'tous',   kids: 'sans', place: 'Salle de classe',   min: 4, price: 0, desc: 'Harmoniser les progressions et les évaluations du cycle.' },
  { title: 'Préparation du conseil de classe',     cat: 'pedago',    audience: 'tous',   kids: 'sans', place: 'Salle de classe',   min: 3, price: 0, desc: 'Faire le point sur chaque élève avant le conseil.' },
  { title: 'Atelier numérique en classe',          cat: 'formation', audience: 'tous',   kids: 'sans', place: 'Salle Info',        min: 5, price: 0, desc: 'Prendre en main les outils numériques de la classe.' },
  { title: 'Sortie pédagogique · repérage',        cat: 'sortie',    audience: 'tous',   kids: 'sans', place: 'Extérieur (hors école)', min: 3, price: 8, desc: 'Repérer le lieu avant la sortie avec les élèves.', covers: 'le transport' },
  { title: 'Marche entre collègues',               cat: 'sport',     audience: 'tous',   kids: 'sans', place: 'Extérieur (hors école)', min: 4, price: 0, desc: 'Une heure de marche après les cours.' },
  { title: 'Yoga entre enseignantes',              cat: 'sport',     audience: 'femmes', kids: 'sans', place: 'Gymnase',           min: 5, price: 6, desc: 'Une heure de yoga doux après la classe.', covers: 'la professeure' },
  { title: 'Repas de fin de trimestre',            cat: 'fete',      audience: 'tous',   kids: 'bienvenus', place: 'Salle polyvalente', min: 6, price: 12, desc: 'On clôture le trimestre ensemble.', covers: 'le traiteur' },
]

// ── Catalogue du personnel (administration, surveillance, sécurité) ─────────
export const IDEAS_STAFF = [
  { title: 'Réunion de service',                   cat: 'reunion',    audience: 'tous', kids: 'sans', place: 'Salle polyvalente', min: 3, price: 0, desc: "Point hebdomadaire de l'équipe administrative." },
  { title: 'Formation premiers secours',           cat: 'formation',  audience: 'tous', kids: 'sans', place: 'Salle polyvalente', min: 6, price: 15, desc: 'Gestes qui sauvent, avec un formateur agréé.', covers: 'le formateur et le matériel' },
  { title: 'Exercice d’évacuation incendie',       cat: 'formation',  audience: 'tous', kids: 'sans', place: 'Cour de l’école',   min: 4, price: 0, desc: "Exercice d'évacuation avec l'agent de sécurité." },
  { title: 'Préparation de la rentrée',            cat: 'reunion',    audience: 'tous', kids: 'sans', place: 'Salle polyvalente', min: 4, price: 0, desc: 'Répartition des tâches avant la rentrée.' },
  { title: 'Collecte de fournitures scolaires',    cat: 'solidarite', audience: 'tous', kids: 'bienvenus', place: 'Bibliothèque', min: 4, price: 0, desc: 'Collecte pour les familles en difficulté.' },
  { title: 'Déjeuner d’équipe',                    cat: 'fete',       audience: 'tous', kids: 'sans', place: 'Salle polyvalente', min: 4, price: 10, desc: 'Un déjeuner ensemble, hors du bureau.', covers: 'le repas' },
]

export const IDEAS_OF = { parent: IDEAS, teacher: IDEAS_TEACHER, staff: IDEAS_STAFF }
export const ideasFor = space => IDEAS_OF[space] || IDEAS
// index par titre : le titre choisi remplit tout le formulaire
export const ideaByTitle = t => [...IDEAS, ...IDEAS_TEACHER, ...IDEAS_STAFF].find(i => i.title === t) || null
