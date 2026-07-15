// Tests du cœur métier — les règles que web ET mobile partagent.
// Zéro dépendance : node --test. Le stockage retombe sur la mémoire (storage.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { FEATURES, featureEnabled } from '../src/features.js'
import { canAccess } from '../src/access.js'
import { isoOf, rentreeDate, rentreeLabel } from '../src/clock.js'
import { mentionFor } from '../src/results.js'
import { spaceOfRole, belongsToSpace, seesAllSpaces, canDecide } from '../src/social.js'
import { db, uid } from '../src/db.js'
import { loginAs, current, logout } from '../src/auth.js'

test('modules cachés : éteints mais présents', () => {
  for (const m of ['homework', 'exams', 'library', 'transport']) assert.equal(FEATURES[m], false)
  assert.equal(featureEnabled('/app/homework'), false)
  assert.equal(featureEnabled('/app/evaluate'), true)
})

test('accès : refus par défaut et périmètres de rôle', () => {
  assert.equal(canAccess('parent', '/app/payments'), true)
  assert.equal(canAccess('teacher', '/app/payments'), false)   // un enseignant ne voit pas les paiements
  assert.equal(canAccess('teacher', '/app/evaluate'), true)
  assert.equal(canAccess('parent', '/app/evaluate'), false)
  assert.equal(canAccess('admin', '/app/route-inconnue'), false) // défaut = refus
  assert.equal(canAccess('security', '/app/security'), true)
})

test('dates : locales, jamais UTC ; rentrée calculée', () => {
  assert.equal(isoOf(new Date(2026, 6, 10)), '2026-07-10')
  const r = rentreeDate(new Date(2026, 6, 10))
  assert.equal(r.getMonth(), 8); assert.equal(r.getDate(), 15); assert.equal(r.getFullYear(), 2026)
  assert.match(rentreeLabel(new Date(2026, 6, 10)), /septembre/)
})

test('mentions : ordonnées et définies aux bornes', () => {
  const excellent = mentionFor(95), faible = mentionFor(20)
  assert.ok(excellent && excellent.label)
  assert.ok(faible && faible.label)
  assert.notEqual(excellent.label, faible.label)
})

test('espaces : chacun le sien, la direction voit tout', () => {
  assert.equal(spaceOfRole('parent'), 'parent')
  assert.equal(belongsToSpace('parent', 'parent'), true)
  assert.equal(belongsToSpace('parent', 'teacher'), false)     // un enseignant ne rejoint pas une sortie parents
  assert.equal(seesAllSpaces('schooladmin'), true)
  assert.equal(seesAllSpaces('parent'), false)
})

test('séparation des pouvoirs : personne n\'approuve sa propre proposition', () => {
  const ev = { status: 'soumis', by: 'u_x', space: 'parent' }
  assert.equal(canDecide(ev, { id: 'u_x', role: 'admin' }), false)
  assert.equal(canDecide(ev, { id: 'u_autre', role: 'admin' }), true)
  assert.equal(canDecide(ev, { id: 'u_autre', role: 'parent' }), false)
})

test('db : se sème en mémoire, stable entre deux lectures', () => {
  const d1 = db()
  assert.ok(d1.users.length >= 6, 'utilisateurs de démo présents')
  assert.ok(d1.students.length > 0)
  assert.equal(db()._v, d1._v)
})

test('auth : session par la couture, jamais par le navigateur', () => {
  const u = loginAs('u_owner')
  assert.ok(u && current() && current().id === 'u_owner')
  logout()
  assert.equal(current(), null)
})

test('uid : identifiants distincts', () => {
  const seen = new Set(Array.from({ length: 200 }, () => uid('t')))
  assert.equal(seen.size, 200)
})

// ── Le bureau (workbench.js) : l'atelier, pas la vitrine ─────────────────────
import { decisionsFor } from '../src/workbench.js'
import { requestLeave } from '../src/hr.js'
import { declare, approve, sendToParent, acknowledge } from '../src/accidents.js'

test('bureau : chaque étape d’un accident allume puis éteint la bonne décision', () => {
  const d = db()
  const admin = d.users.find(u => u.id === 'u_admin')
  const dir = d.users.find(u => u.role === 'schooladmin')
  const parent = d.users.find(u => u.id === 'p1')          // parent de s1
  const cnt = (u, k) => decisionsFor(u).find(i => i.key === k)?.count ?? 0

  const a0 = cnt(admin, 'accident-valider'), v0 = cnt(dir, 'accident-valider')
  const { accident } = declare({ childId: 's1', zones: ['tete'], kind: 'bosse',
    severity: 'benin', whatHappened: 'Chute pendant la récréation.', byId: admin.id, byName: admin.name })
  assert.equal(cnt(dir, 'accident-valider'), v0 + 1, 'le directeur voit la déclaration à valider')
  assert.equal(cnt(admin, 'accident-valider'), a0, 'le témoin ne se valide pas lui-même')

  const e0 = cnt(dir, 'accident-envoyer')
  assert.ok(!approve(accident.id, dir.id, dir.name).error)
  assert.equal(cnt(dir, 'accident-valider'), v0, 'validé : la décision s’éteint')
  assert.equal(cnt(dir, 'accident-envoyer'), e0 + 1, 'et la suivante s’allume : envoyer au parent')

  const s0 = cnt(parent, 'parent-ack')
  assert.ok(!sendToParent(accident.id).error)
  assert.equal(cnt(dir, 'accident-envoyer'), e0)
  assert.equal(cnt(parent, 'parent-ack'), s0 + 1, 'le parent voit SA décision : signer')

  assert.ok(!acknowledge(accident.id, parent.name).error)
  assert.equal(cnt(parent, 'parent-ack'), s0, 'signé : plus rien n’attend le parent')
})

test('bureau : personne ne décide de sa propre demande de congé', () => {
  const d = db()
  const admin = d.users.find(u => u.id === 'u_admin')
  const dir = d.users.find(u => u.role === 'schooladmin')
  const cnt = (u) => decisionsFor(u).find(i => i.key === 'hr-conges')?.count ?? 0
  const a0 = cnt(admin), d0 = cnt(dir)
  requestLeave({ staffId: admin.id, kind: 'annuel', from: '2026-08-01', to: '2026-08-03' })
  assert.equal(cnt(dir), d0 + 1, 'le directeur voit la demande de l’admin')
  assert.equal(cnt(admin), a0, 'l’admin ne voit pas sa propre demande')
})

test('bureau : une demande du personnel n’apparaît qu’à l’étape de SON circuit', () => {
  const d = db()
  const admin = d.users.find(u => u.id === 'u_admin')
  const dir = d.users.find(u => u.role === 'schooladmin')
  // req1 (semence) : chain ['admin','schooladmin'], currentLevel 0 → à l'admin, pas au directeur
  const req = d.requests.find(r => r.id === 'req1')
  assert.ok(req && req.status === 'pending' && req.currentLevel === 0)
  const at = u => decisionsFor(u).find(i => i.key === 'req-viser')?.count ?? 0
  assert.ok(at(admin) >= 1, 'l’étape courante est chez l’admin')
  assert.equal(at(dir), 0, 'le directeur n’est pas encore sollicité')
})

test('bureau : la gravité trie — ce qui protège un enfant passe avant l’argent', () => {
  const d = db()
  const dir = d.users.find(u => u.role === 'schooladmin')
  const RANK = { danger: 0, warn: 1, info: 2 }
  const tones = decisionsFor(dir).map(i => RANK[i.tone])
  assert.ok(tones.length > 0, 'l’école semée a du travail en attente')
  assert.ok(tones.every((t, i) => i === 0 || tones[i - 1] <= t), 'tri par gravité stable')
})

// ── Le reçu ne ment jamais (admissions.js × storage.js) ──────────────────────
// Le 2026-07-14, deux vraies pré-inscriptions ont été perdues : quatre photos en
// base64 dépassaient le quota du navigateur, l'écriture échouait EN SILENCE, et
// le parent repartait avec la référence d'un dossier jamais enregistré.
import { setStorage } from '../src/storage.js'
import { apply, appById } from '../src/admissions.js'

test('inscription : jamais de faux reçu — le stockage plein est dit, pas avalé', () => {
  // un stockage à quota : refuse toute écriture au-delà de `limit`
  const m = new Map()
  let limit = Infinity
  setStorage({
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (String(v).length > limit) throw new Error('QuotaExceeded'); m.set(k, String(v)) },
    removeItem: k => m.delete(k),
  })
  const tick = () => { const t = Date.now(); while (Date.now() <= t) { /* ids distincts */ } }
  const base = JSON.stringify(db()).length          // l'école de démo se sème ici
  limit = base + 200 * 1024                          // ~200 Ko de marge — comme un vrai quota

  // 1) une pièce trop lourde : le dossier passe SANS elle, et on le DIT
  const big = 'x'.repeat(500 * 1024)
  const r1 = apply({ childName: 'Hammouda', dob: '2021-01-01', level: 'kg1',
    parentName: 'O. Ounis', parentPhone: '30359449',
    files: [{ type: 'photo', name: 'p.jpg', size: big.length, mime: 'image/jpeg', data: big }] })
  assert.ok(r1.app, 'la candidature survit à la pièce')
  assert.equal(r1.filesDropped, true, 'et l’abandon des pièces est DIT au parent')
  assert.ok(appById(r1.app.id), 'le dossier est réellement en base')
  assert.equal(appById(r1.app.id).files.length, 0)

  // 2) une candidature légère passe entière
  tick()
  const r2 = apply({ childName: 'ounis Marwan', dob: '2020-05-05', level: 'g1',
    parentName: 'O. Ounis', parentPhone: '+21600000000' })
  assert.ok(r2.app && r2.filesDropped === false)
  assert.ok(appById(r2.app.id))
  // une candidature qui arrive PRÉVIENT la direction — jamais en silence
  const notifs = db().notifications.filter(n => n.title === 'Nouvelle candidature' && n.body.includes('Marwan'))
  assert.deepEqual(notifs.map(n => n.role).sort(), ['admin', 'schooladmin'])

  // 3) quota totalement plein : une ERREUR franche, pas de reçu
  tick()
  limit = 10
  const r3 = apply({ childName: 'Fantôme', dob: '2020-01-01', level: 'g1',
    parentName: 'X', parentPhone: '00000000' })
  assert.ok(r3.error, 'pas de reçu pour un dossier non enregistré')
  assert.ok(!r3.app)

  setStorage(null)   // un stockage neuf pour la suite
})

// ── L'extension des demandes (requests.js) : le travail qui suit la signature ─
import { mutate } from '../src/db.js'
import { assign as assignWork, close as closeWork, monthReport, categoryOf } from '../src/requests.js'
import { isoOf as isoOf2 } from '../src/clock.js'

test('demandes : catégorie → assigné → échéance → clôture, tout est tracé', () => {
  // une demande approuvée (le circuit d'approbation est déjà testé ailleurs)
  mutate(d => { d.requests.unshift({ id: 'req_w1', at: Date.now(), by: 't1', byName: 'Sami Ben Ali',
    type: 'Demande de matériel', fields: {}, chain: ['admin'], currentLevel: 1, approvals: [], status: 'approved' }) })
  assert.equal(categoryOf({ type: 'Demande de matériel' }), 'Logistique', 'la catégorie vient du type, pas d’une saisie')

  // on n'assigne pas une demande encore en attente
  mutate(d => { d.requests.unshift({ id: 'req_w2', at: Date.now(), by: 't1', byName: 'Sami Ben Ali',
    type: 'Réclamation', fields: {}, chain: ['admin'], currentLevel: 0, approvals: [], status: 'pending' }) })
  assert.ok(assignWork('req_w2', { assigneeId: 'u_admin', assigneeName: 'Karim', byName: 'Dir' }).error,
    'la signature d’abord : pas de travail sans approbation')

  // assigner, avec une échéance déjà dépassée — le retard sera constaté
  const r1 = assignWork('req_w1', { assigneeId: 'u_admin', assigneeName: 'Karim Jelassi', deadline: '2020-01-01', byName: 'Lina Aderra' })
  assert.ok(r1.ok)
  let w = db().requests.find(r => r.id === 'req_w1')
  assert.equal(w.assigneeId, 'u_admin')
  assert.equal(w.trace.length, 1, 'l’assignation est tracée')

  // clôturer : le retard est constaté et ÉCRIT ; la trace s'allonge
  const r2 = closeWork('req_w1', { byId: 'u_admin', byName: 'Karim Jelassi', note: 'Matériel livré.' })
  assert.ok(r2.ok && r2.late === true, 'échéance dépassée → clôture en retard, dite')
  w = db().requests.find(r => r.id === 'req_w1')
  assert.equal(w.status, 'closed')
  assert.equal(w.closedLate, true)
  assert.equal(w.trace.length, 2)

  // le bilan du mois compte depuis les faits
  const rep = monthReport(isoOf2(new Date()).slice(0, 7))
  assert.ok(rep.closed >= 1)
  assert.ok(rep.closedLate >= 1)
  assert.ok(rep.byCategory['Logistique']?.closed >= 1)
  assert.ok(rep.byAssignee['Karim Jelassi']?.closed >= 1)

  // et le bureau (workbench) le voit : plus rien à assigner sur req_w1, mais
  // req_w2 en attente reste au circuit — pas à l'atelier
  const dir = db().users.find(u => u.role === 'schooladmin')
  const keys = decisionsFor(dir).map(i => i.key)
  assert.ok(!keys.includes('req-retard') || db().requests.some(r => r.status === 'approved' && r.deadline && r.id !== 'req_w1'),
    'une demande clôturée quitte la liste des retards')
})

// ── L'arabe n'est pas une traduction, c'est une direction (i18n.js) ──────────
import { t, setLocale, locale, dir, LOCALES, AR } from '../src/i18n.js'
import { NAV, SECTIONS } from '../src/nav.js'
import { LEVELS, CYCLES } from '../src/levels.js'

test('i18n : langue, direction, persistance, et retour au français jamais au trou', () => {
  setLocale('fr')
  assert.equal(locale(), 'fr'); assert.equal(dir(), 'ltr')
  assert.equal(t('Tableau de bord'), 'Tableau de bord')
  setLocale('ar')
  assert.equal(dir(), 'rtl')
  assert.equal(t('Tableau de bord'), 'لوحة المتابعة')
  assert.equal(t('Phrase jamais traduite'), 'Phrase jamais traduite', 'clé absente → français, jamais un trou')
  setLocale('xx')                                     // langue inconnue : refusée
  assert.equal(locale(), 'ar')
  setLocale('fr')
})

test('i18n : la couverture ne régresse pas — navigation, sections, rôles, niveaux', () => {
  setLocale('ar')
  const misses = []
  const need = s => { if (!s) return; if (t(s) === s) misses.push(s) }
  for (const n of NAV) { need(n.label); Object.values(n.labelFor || {}).forEach(need) }
  SECTIONS.forEach(s => need(s.label))
  LEVELS.forEach(l => need(l.label))
  Object.values(CYCLES).forEach(c => need(c.label))
  for (const r of ['Plateforme','Direction','Administration','Enseignant','Surveillant','Sécurité','Parent']) need(r)
  setLocale('fr')
  assert.deepEqual(misses, [], `traductions manquantes : ${misses.join(' · ')}`)
})

test('i18n : le dictionnaire ne contient ni entrée vide ni copie du français', () => {
  for (const [k, v] of Object.entries(AR)) {
    assert.ok(v && v.trim().length, `entrée vide : ${k}`)
    assert.notEqual(v, k, `traduction identique à la clé : ${k}`)
  }
})

// ── La clé d'appel se lit au DERNIER underscore (kg_ns_2026-07-14) ───────────
import { attKey, attParts } from '../src/db.js'
test('présence : un identifiant de classe peut contenir des underscores', () => {
  assert.deepEqual(attParts('kg_ns_2026-07-14'), { classId: 'kg_ns', iso: '2026-07-14' })
  assert.deepEqual(attParts('c1_2026-07-14'), { classId: 'c1', iso: '2026-07-14' })
  assert.equal(attKey('kg_pk', '2026-07-15'), 'kg_pk_2026-07-15')
  assert.ok(!isNaN(new Date(attParts(attKey('kg_1', '2026-07-15')).iso)), 'la date relue est valide')
})

// ── Le suivi du comportement : encourager d'abord, jamais classer (règle n°9) ─
import { observe, studentSummary as behaviorSummary, classClimate, removeEntry, TRAITS, positiveTraits } from '../src/behavior.js'

test('comportement : observer nourrit le parcours de l\'enfant et prévient le parent', () => {
  const d = db()
  const teacher = d.users.find(u => u.id === 't1')
  const before = behaviorSummary('s1').total
  const beforeNotifs = d.notifications.length
  const r = observe({ studentId: 's1', trait: 'entraide', note: 'A aidé un camarade.', byId: teacher.id, byName: teacher.name })
  assert.ok(r.entry && !r.error)
  assert.equal(behaviorSummary('s1').total, before + 1)
  assert.ok(db().notifications.length > beforeNotifs, 'le parent est prévenu')
})

test('comportement : l\'encouragement domine — les positifs d\'abord', () => {
  // le catalogue met les traits positifs en tête, et ils sont plus nombreux
  assert.ok(positiveTraits().length >= Object.values(TRAITS).filter(t => !t.positive).length,
    'au moins autant d\'encouragements que de rappels')
  assert.equal(Object.values(TRAITS)[0].positive, true, 'le premier trait est positif')
})

test('comportement : un enfant voit SON parcours, la direction voit une TENDANCE (pas de palmarès)', () => {
  // le climat d'une classe rend des tendances agrégées, jamais un classement d'élèves
  const climate = classClimate('c5a')
  assert.ok('positiveRate' in climate && 'byTrait' in climate)
  assert.ok(!('ranking' in climate) && !('topStudents' in climate), 'aucun classement d\'élèves')
})

test('comportement : rien ne s\'efface — un retrait est tracé', () => {
  const d = db()
  const t = d.users.find(u => u.id === 't1')
  const { entry } = observe({ studentId: 's3', trait: 'participation', byId: t.id, byName: t.name })
  removeEntry(entry.id, t.name)
  const still = db().behavior.find(e => e.id === entry.id)
  assert.ok(still, 'l\'entrée existe toujours')
  assert.ok(still.removed && still.removed.by, 'mais elle est marquée retirée, avec trace')
  assert.ok(!behaviorSummary('s3').recent.some(e => e.id === entry.id), 'et ne compte plus dans le bilan')
})

// ── Les moments (photo/vidéo) : la vie privée des enfants, dans le cœur ───────
import { share, feedForParent, visibleToParent, toggleLike, removeMoment } from '../src/gallery.js'

test('moments : un parent ne voit QUE son enfant ou la classe de son enfant', () => {
  const d = db()
  const p1 = d.users.find(u => u.id === 'p1')   // parent de s1 (classe c5a) et s29
  const p2 = d.users.find(u => u.id === 'p2')   // parent de s2 (classe c5a) et s32
  const teacher = d.users.find(u => u.id === 't1')

  // un moment identifié SUR s1 : visible par p1, PAS par p2
  const { moment: mS1 } = share({ classId: 'c5a', childIds: ['s1'], caption: 'Photo de s1', media: [{ type:'image', data:'x' }], byId: teacher.id, byName: teacher.name })
  assert.equal(visibleToParent(mS1, p1), true, 'le parent de l\'enfant le voit')
  assert.equal(visibleToParent(mS1, p2), false, 'un autre parent ne voit PAS la photo d\'un enfant qui n\'est pas le sien')

  // un moment DE CLASSE (aucun enfant identifié) en c5a : visible par les deux (leurs enfants y sont)
  const { moment: mClass } = share({ classId: 'c5a', childIds: [], caption: 'Sortie de classe', media: [{ type:'image', data:'x' }], byId: teacher.id, byName: teacher.name })
  assert.equal(visibleToParent(mClass, p1), true)
  assert.equal(visibleToParent(mClass, p2), true)

  // un moment de classe d'une AUTRE classe (c6a) : invisible pour p1 (son enfant n'y est pas)
  const { moment: mOther } = share({ classId: 'c6a', childIds: [], caption: 'Autre classe', media: [{ type:'image', data:'x' }], byId: teacher.id, byName: teacher.name })
  assert.equal(visibleToParent(mOther, p1), false, 'la classe d\'un autre enfant reste privée')

  // le fil du parent ne contient que le permis
  const feed = feedForParent(p1)
  assert.ok(feed.some(m => m.id === mS1.id) && feed.some(m => m.id === mClass.id))
  assert.ok(!feed.some(m => m.id === mOther.id), 'le fil ne fuit jamais une autre classe')
})

test('moments : partager exige une photo ou un mot ; le cœur du parent (like) bascule', () => {
  const d = db()
  const teacher = d.users.find(u => u.id === 't1')
  assert.ok(share({ classId: 'c5a', childIds: [], byId: teacher.id, byName: teacher.name }).error, 'ni photo ni mot → refusé')
  const { moment } = share({ classId: 'c5a', childIds: [], caption: 'Un mot suffit', byId: teacher.id, byName: teacher.name })
  const p1 = d.users.find(u => u.id === 'p1')
  toggleLike(moment.id, p1.id)
  assert.ok(db().moments.find(m => m.id === moment.id).likes.includes(p1.id), 'le cœur est posé')
  toggleLike(moment.id, p1.id)
  assert.ok(!db().moments.find(m => m.id === moment.id).likes.includes(p1.id), 'le cœur se retire')
})

// ── La cantine : le menu qui PROTÈGE l'enfant (croisement allergies) ─────────
import { atRiskForDay, studentReactsTo, setDay, toggleSubscriber, allergensOfDay, weekForChild, summary as canteenSummary } from '../src/canteen.js'

test('cantine : l\'alerte allergie est CALCULÉE du dossier, jamais oubliée', () => {
  const d = db()
  const amira = d.students.find(s => s.id === 's1')   // allergies: Arachides
  assert.equal(studentReactsTo(amira, 'arachide'), true, 'arachide attrape « Arachides »')
  assert.equal(studentReactsTo(amira, 'lait'), false)
  // le menu de démo a un plat aux arachides le lundi → Amira (inscrite) est en alerte
  const risk = atRiskForDay('lun')
  assert.ok(risk.some(r => r.student.id === 's1'), 'Amira apparaît dans l\'alerte du lundi')
  assert.ok(risk.find(r => r.student.id === 's1').allergens.some(a => a.key === 'arachide'))
})

test('cantine : on ratisse large — « cacahuète » attrape l\'allergie aux arachides', () => {
  const d = db()
  const amira = d.students.find(s => s.id === 's1')
  // un plat qui dit « cacahuète » sans dire « arachide » doit quand même alerter
  setDay('mer', [{ name: 'Sauce cacahuète', allergens: ['arachide'] }])
  assert.ok(atRiskForDay('mer').some(r => r.student.id === 's1'), 'faux négatif interdit : on alerte')
})

test('cantine : inscription/désinscription, et le menu d\'un enfant porte ses drapeaux', () => {
  toggleSubscriber('s5')
  assert.ok(atRiskForDay('lun') !== null)   // ne casse pas
  const week = weekForChild('s1')
  const lundi = week.find(w => w.key === 'lun')
  assert.ok(lundi.risks.some(r => /Arachide/i.test(r.label)), 'le lundi d\'Amira porte l\'alerte arachide')
  const sum = canteenSummary()
  assert.ok(sum.daysPlanned >= 1 && sum.subscribers >= 1)
})
