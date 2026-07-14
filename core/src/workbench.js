// ════════════════════════════════════════════════════════════════════════════
// LE BUREAU — « qu'est-ce qui attend MA décision ? »
//
// Recherche (kogia-research/COMPETITIVE_v2.md, vérifié 3-0) : l'accueil
// administrateur de PowerSchool est un CHAMP DE RECHERCHE ; les KPI sont
// relégués sous Reports. Un tableau de bord d'ERP est un ATELIER, pas une
// vitrine. Nos tableaux de bord montraient des chiffres : c'était l'erreur.
//
// Ce module calcule la LISTE DE TRAVAIL d'un rôle à partir des FAITS — les
// étapes réelles des dossiers (candidatures, accidents, congés, demandes,
// versements, paie) — jamais à partir de statistiques. Chaque entrée est une
// décision possible, comptée, avec le lien direct vers l'écran où elle se prend.
//
// LES RÈGLES :
//  1. On ne montre à quelqu'un que ce que SON rôle peut décider — et jamais
//     ses propres dossiers (deux paires d'yeux, personne ne s'auto-valide).
//  2. Une liste vide est une INFORMATION (« l'école est à jour »), pas un
//     écran raté.
//  3. L'ordre est celui de la GRAVITÉ : ce qui protège un enfant passe avant
//     ce qui encaisse un chèque.
// ════════════════════════════════════════════════════════════════════════════
import { db } from './db.js'
import { applications, docsComplete, openClasses } from './admissions.js'
import { accidents } from './accidents.js'
import { leaves, payrolls, monthLabel } from './hr.js'
import { now } from './clock.js'

const HOURS = 3600 * 1000
/** Un accusé de réception qui attend plus de 24 h devient un retard à relancer. */
export const ACK_LATE_HOURS = 24

/** « 3 candidatures » / « 1 candidature » — le français d'abord. */
const n_ = (n, sing, plur) => `${n} ${n > 1 ? plur : sing}`

/**
 * LA LISTE DE TRAVAIL. Retourne des items triés par gravité :
 *   { key, count, label, sub, to, icon, tone }
 * `tone` ∈ danger | warn | info — la couleur suit l'urgence, pas le module.
 */
export function decisionsFor(user) {
  if (!user) return []
  const d = db()
  const role = user.role
  const items = []
  const add = (count, item) => { if (count > 0) items.push({ count, ...item }) }

  if (role === 'schooladmin' || role === 'admin') {
    const acc = accidents()

    // ── Ce qui protège un enfant, d'abord ──────────────────────────────────
    // Deux paires d'yeux : celui qui a rédigé ne voit PAS « à valider » —
    // ce n'est pas sa décision à prendre.
    const aValider = acc.filter(a => a.stage === 'brouillon' && a.witness?.id !== user.id)
    add(aValider.length, {
      key: 'accident-valider', icon: 'HeartPulse', tone: 'danger', to: '/app/accidents',
      label: n_(aValider.length, 'déclaration d’accident à valider', 'déclarations d’accident à valider'),
      sub: 'Deux paires d’yeux : un adulte a vu, vous contrôlez.',
    })
    const aEnvoyer = acc.filter(a => a.stage === 'valide')
    add(aEnvoyer.length, {
      key: 'accident-envoyer', icon: 'Send', tone: 'danger', to: '/app/accidents',
      label: n_(aEnvoyer.length, 'accident validé à envoyer au parent', 'accidents validés à envoyer aux parents'),
      sub: 'Le parent doit savoir avant la sortie des classes.',
    })
    const aRelancer = acc.filter(a => a.stage === 'envoye' && (now() - a.sentAt) > ACK_LATE_HOURS * HOURS)
    add(aRelancer.length, {
      key: 'accident-relancer', icon: 'BellRing', tone: 'warn', to: '/app/accidents',
      label: n_(aRelancer.length, 'accusé de réception en retard', 'accusés de réception en retard'),
      sub: 'Plus de 24 h sans signature du parent — relancer.',
    })

    // ── Les familles qui attendent une réponse ─────────────────────────────
    const apps = applications()
    const nouvelles = apps.filter(a => a.stage === 'nouvelle')
    add(nouvelles.length, {
      key: 'adm-nouvelles', icon: 'UserPlus', tone: 'info', to: '/app/admissions',
      label: n_(nouvelles.length, 'candidature reçue à ouvrir', 'candidatures reçues à ouvrir'),
      sub: 'Déposées en ligne par les parents.',
    })
    const completes = apps.filter(a => a.stage === 'pieces' && docsComplete(a))
    add(completes.length, {
      key: 'adm-completes', icon: 'FileCheck2', tone: 'info', to: '/app/admissions',
      label: n_(completes.length, 'dossier complet à passer à l’étude', 'dossiers complets à passer à l’étude'),
      sub: 'Toutes les pièces obligatoires sont là.',
    })
    const aTrancher = apps.filter(a => a.stage === 'examen')
    add(aTrancher.length, {
      key: 'adm-trancher', icon: 'Scale', tone: 'warn', to: '/app/admissions',
      label: n_(aTrancher.length, 'candidature à trancher', 'candidatures à trancher'),
      sub: 'Accepter ou refuser — la famille attend.',
    })
    const aInscrire = apps.filter(a => a.stage === 'accepte')
    add(aInscrire.length, {
      key: 'adm-inscrire', icon: 'School', tone: 'info', to: '/app/admissions',
      label: n_(aInscrire.length, 'accepté à inscrire dans une classe', 'acceptés à inscrire dans une classe'),
      sub: 'La capacité décide : le système ne promet pas une place qui n’existe pas.',
    })
    // Liste d'attente : ne remonte QUE si une place s'est réellement libérée.
    const attentePlace = apps.filter(a => a.stage === 'attente' && openClasses(a.level).some(c => c.free > 0))
    add(attentePlace.length, {
      key: 'adm-attente', icon: 'Hourglass', tone: 'warn', to: '/app/admissions',
      label: n_(attentePlace.length, 'famille en liste d’attente — une place s’est libérée', 'familles en liste d’attente — des places se sont libérées'),
      sub: 'Premier arrivé, premier servi : la liste avance.',
    })

    // ── L'équipe ────────────────────────────────────────────────────────────
    // Personne ne décide de sa propre demande — donc on ne la lui montre pas.
    const conges = leaves().filter(l => l.stage === 'demande' && l.staffId !== user.id)
    add(conges.length, {
      key: 'hr-conges', icon: 'CalendarOff', tone: 'warn', to: '/app/hr',
      label: n_(conges.length, 'demande de congé à décider', 'demandes de congé à décider'),
      sub: 'Un employé attend pour organiser sa vie.',
    })
    const demandes = (d.requests || []).filter(r =>
      r.status === 'pending' && r.chain[r.currentLevel] === role && r.by !== user.id)
    add(demandes.length, {
      key: 'req-viser', icon: 'FileText', tone: 'info', to: '/app/requests',
      label: n_(demandes.length, 'demande du personnel à viser', 'demandes du personnel à viser'),
      sub: 'Le circuit de validation attend votre étape.',
    })

    // ── L'argent, en dernier — mais jamais oublié ───────────────────────────
    let versements = 0
    Object.values(d.payments || {}).forEach(arr =>
      arr.forEach(p => { if (p.status === 'pending') versements++ }))
    add(versements, {
      key: 'fin-versements', icon: 'CreditCard', tone: 'info', to: '/app/finance',
      label: n_(versements, 'versement signalé par un parent — à confirmer', 'versements signalés par les parents — à confirmer'),
      sub: 'Le parent ne se déclare jamais payé : vous confirmez après encaissement.',
    })
    payrolls().filter(p => p.stage !== 'paye').forEach(p => add(1, {
      key: 'hr-paie-' + p.month, icon: 'Banknote', tone: 'warn', to: '/app/hr',
      label: p.stage === 'brouillon'
        ? `paie de ${monthLabel(p.month)} à valider`
        : `paie de ${monthLabel(p.month)} validée — à verser`,
      sub: p.stage === 'brouillon'
        ? 'Un brouillon se corrige ; une paie validée ne bouge plus.'
        : 'Le virement clôt le mois.',
    }))
  }

  if (role === 'parent') {
    const kids = user.childIds || []
    // L'accusé de réception d'un accident est LA décision du parent — la seule
    // signature que l'école ne peut pas donner à sa place.
    const aSigner = accidents().filter(a => a.stage === 'envoye' && kids.includes(a.childId))
    add(aSigner.length, {
      key: 'parent-ack', icon: 'HeartPulse', tone: 'danger', to: '/app/accidents',
      label: n_(aSigner.length, 'déclaration d’accident à signer', 'déclarations d’accident à signer'),
      sub: 'L’école attend votre accusé de réception.',
    })
    let retards = 0
    kids.forEach(k => (d.payments?.[k] || []).forEach(p => { if (p.status === 'overdue') retards++ }))
    add(retards, {
      key: 'parent-retards', icon: 'CreditCard', tone: 'warn', to: '/app/payments',
      label: n_(retards, 'mois de scolarité en retard', 'mois de scolarité en retard'),
      sub: 'Signalez un versement — l’école confirmera.',
    })
  }

  // La gravité d'abord : danger > warn > info. À gravité égale, l'ordre métier
  // ci-dessus (l'enfant, la famille, l'équipe, l'argent) est déjà le bon.
  const RANK = { danger: 0, warn: 1, info: 2 }
  return items.sort((a, b) => (RANK[a.tone] ?? 3) - (RANK[b.tone] ?? 3))
}
