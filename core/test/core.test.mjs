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
import { schoolInsights, behaviorClimate, attendanceSignal, feeSignal } from '../src/insights.js'

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

// ── Les fêtes : le coin du jour ne ment pas ──────────────────────────────────
import { feteOfDay, nextFerie, upcoming } from '../src/fetes.js'

test('fêtes : un férié gagne sur une journée mondiale, et le compte à rebours est juste', () => {
  assert.equal(feteOfDay('2026-03-20').kind, 'ferie', "l'Indépendance passe avant la journée du bonheur")
  const j = feteOfDay('2026-11-20')
  assert.equal(j.kind, 'journee'); assert.match(j.label, /enfant/i)
  const n = nextFerie('2026-07-15')
  assert.equal(n.d, '2026-07-25'); assert.equal(n.inDays, 10, 'République dans 10 jours')
})

test("fêtes : l'agenda est trié, mélange fériés et journées, et passe l'année", () => {
  const a = upcoming('2026-12-20', 6)
  assert.equal(a.length, 6)
  assert.ok(a.every((x, i, arr) => i === 0 || arr[i - 1].d <= x.d), 'trié par date')
  assert.ok(a.some(x => x.d.startsWith('2027-')), "franchit le passage d'année")
  assert.ok(a.some(x => x.kind === 'ferie') && a.some(x => x.kind === 'journee'))
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

// ═══════════════════════════════════════════════════════════════════════════
// LES 5 RÈGLES QUI N'AVAIENT PAS DE TÉMOIN — la dette la plus honnête du
// projet (docs/quality/test-plan.md) se ferme ici. Chaque règle non négociable
// a désormais son test d'exécution.
// ═══════════════════════════════════════════════════════════════════════════
import { addPickup, revokePickup, mayCollect, handOver, pickupsOf } from '../src/childcare.js'
import { issueInvoice, cancelInvoice, invoices } from '../src/accounting.js'
import { withdraw, activeStudents, archivedStudents } from '../src/academic.js'
import { advance, enrol, seatsOf, setFiles, docsFor } from '../src/admissions.js'

// Le parcours LÉGITIME d'une candidature jusqu'à « accepté » : le test passe
// par la porte (pièces fournies, étude), jamais par-dessus le mur.
function acceptedApplication(childName, level) {
  const a = apply({ childName, dob: '2022-01-01', level, parentName: 'Parent Test', parentPhone: '+216 20 111 222', parentEmail: 't@test.tn' })
  advance(a.app.id, 'pieces', 'Test')
  setFiles(a.app.id, docsFor(level).map(d => ({ type: d.key, name: `${d.key}.pdf`, size: 10, mime: 'application/pdf', data: 'x' })))
  advance(a.app.id, 'examen', 'Test')
  advance(a.app.id, 'accepte', 'Test')
  return appById(a.app.id)
}
import { book, conflictFor } from '../src/facilities.js'

test('règle n°1 : un enfant ne part JAMAIS avec quelqu\'un hors liste', () => {
  const child = db().students.find(s => !s.archived)
  assert.ok(handOver(child.id, 'personne_inconnue', 'Éducatrice').error, 'hors liste → refus')
  addPickup(child.id, { name: 'Salma Trabelsi', relation: 'Oncle / Tante', phone: '+216 20 000 000', cin: '01234567', addedBy: 'test' })
  const p = pickupsOf(child.id).find(x => x.cin === '01234567')
  assert.ok(p && mayCollect(child.id, p.id).allowed, 'personne autorisée → oui')
  const ok = handOver(child.id, p.id, 'Éducatrice')
  assert.equal(ok.departure?.personName, 'Salma Trabelsi', 'le départ est journalisé : qui, quand, remis par qui')
  revokePickup(child.id, p.id, 'Direction', 'retrait demandé par le parent')
  assert.equal(mayCollect(child.id, p.id).allowed, false, 'autorisation retirée → refus')
  assert.ok(handOver(child.id, p.id, 'Éducatrice').error)
  assert.ok(pickupsOf(child.id).some(x => x.id === p.id), 'on DÉSACTIVE, on ne supprime pas : la trace reste')
})

test('règle n°4 : une facture émise ne se modifie pas — on l\'annule par un AVOIR', () => {
  let issued = null
  for (const s of db().students) { const r = issueInvoice(s.id, 'Test'); if (r.invoice) { issued = r.invoice; break } }
  assert.ok(issued, 'au moins un élève est facturable')
  const before = invoices().length
  assert.ok(cancelInvoice(issued.id, '', 'Test').error, 'annuler sans motif → refus (indéfendable)')
  assert.ok(cancelInvoice(issued.id, 'Erreur de saisie', 'Test').ok)
  const inv = invoices().find(i => i.id === issued.id)
  assert.equal(invoices().length, before, 'la facture n\'est jamais supprimée')
  assert.equal(inv.stage, 'annulee')
  assert.match(inv.creditNote, /^AV-/, 'l\'avoir porte un numéro de série')
  assert.equal(inv.cancelReason, 'Erreur de saisie')
  assert.ok(cancelInvoice(issued.id, 'encore', 'Test').error, 'une annulée ne s\'annule pas deux fois')
})

test('règle n°5 : on ARCHIVE, on ne supprime jamais un dossier scolaire', () => {
  const total = db().students.length
  const s = activeStudents()[0]
  assert.ok(withdraw(s.id, '', 'Direction').error, 'un motif est obligatoire')
  assert.ok(withdraw(s.id, 'Départ à l\'étranger', 'Direction').ok)
  assert.equal(db().students.length, total, 'aucune suppression — le dossier reste')
  const after = db().students.find(x => x.id === s.id)
  assert.ok(after.archived && after.archivedReason && after.archivedBy, 'archivé, motivé, signé')
  assert.ok(archivedStudents().some(x => x.id === s.id))
  assert.ok(!activeStudents().some(x => x.id === s.id))
})

test('règle n°6 : la capacité décide — jamais une place promise qui n\'existe pas', () => {
  const cls = db().classes[0]
  let guard = 0
  while (seatsOf(cls.id).free > 0 && guard++ < 40) {
    const a = acceptedApplication(`Enfant Test${guard}`, cls.level)
    const r = enrol(a.id, cls.id, 'Test')
    assert.ok(r.studentId, r.error)
  }
  assert.equal(seatsOf(cls.id).free, 0, 'la classe est pleine')
  const extra = acceptedApplication('Enfant DeTrop', cls.level)
  const refused = enrol(extra.id, cls.id, 'Test')
  assert.ok(refused.error && /pleine/i.test(refused.error), 'pas de promesse : refus explicite')
  assert.equal(seatsOf(cls.id).taken, seatsOf(cls.id).capacity, 'jamais au-dessus de la capacité')
  assert.equal(appById(extra.id).stage, 'attente', 'la candidature part en liste d\'attente, pas à la poubelle')
})

test('règle n°8 : la pédagogie passe avant l\'argent — un cours ne se fait pas déloger', () => {
  // Lundi 2026-07-20 : « Natation scolaire » 09:00–12:00 sur la piscine (créneau seedé).
  const c = conflictFor('f_pool', '2026-07-20', '10:00', '11:00')
  assert.ok(c.blocked, 'le créneau scolaire est intouchable')
  const refused = book({ facilityId: 'f_pool', date: '2026-07-20', from: '10:00', to: '11:00', audience: 'externe', who: 'Club Riadh', by: 'Test' })
  assert.ok(refused.error && /scolaire/i.test(refused.error), 'même un client qui paie est refusé')
  const ok = book({ facilityId: 'f_pool', date: '2026-07-20', from: '14:00', to: '16:00', audience: 'externe', who: 'Club Riadh', by: 'Test' })
  assert.ok(ok.booking, ok.error || 'hors créneau scolaire, la location est bienvenue')
})

// ── Les documents officiels : numérotés, journalisés, jamais effacés ─────────
import { issueDocument, registry } from '../src/documents.js'

test('documents : série sans trou, états contrôlés, registre append-only', () => {
  const active = activeStudents()[0]
  const year = new Date().getFullYear()
  const r1 = issueDocument({ type: 'scolarite', studentId: active.id, by: 'Test' })
  assert.ok(r1.doc, r1.error)
  assert.match(r1.doc.number, new RegExp(`^CS-${year}-\\d{4}$`), 'numéro de série par type et par année')
  const r2 = issueDocument({ type: 'scolarite', studentId: active.id, addressedTo: 'CNSS', by: 'Test' })
  assert.equal(+r2.doc.number.slice(-4), +r1.doc.number.slice(-4) + 1, 'la série ne saute pas')
  assert.ok(issueDocument({ type: 'radiation', studentId: active.id, by: 'Test' }).error, 'pas de radiation pour un élève actif')
  const archived = archivedStudents()[0]
  assert.ok(archived, 'un dossier archivé existe (règle n°5)')
  assert.ok(issueDocument({ type: 'scolarite', studentId: archived.id, by: 'Test' }).error, 'pas de scolarité pour un dossier archivé')
  const rad = issueDocument({ type: 'radiation', studentId: archived.id, by: 'Test' })
  assert.ok(rad.doc && rad.doc.number.startsWith('CR-'), 'la radiation sort du dossier archivé')
  assert.ok(registry().every(x => x.number && x.at && x.by), 'chaque entrée est numérotée, datée, signée')
})

// ── Budget : que des chiffres réels, la dépense s'annule motivée ─────────────
import { addExpense, voidExpense, expenses, monthlyReport } from '../src/budget.js'

test('budget : le rapport additionne le réel, la dépense s\'annule motivée', () => {
  const month = isoOf(new Date()).slice(0, 7)
  const before = monthlyReport(month)
  assert.ok(addExpense({ label: '', amount: 50, by: 'Test' }).error, 'sans libellé → refus')
  assert.ok(addExpense({ label: 'Papier', amount: 0, by: 'Test' }).error, 'montant nul → refus')
  const r = addExpense({ label: 'Ramettes A4', amount: 80, category: 'fournitures', by: 'Test' })
  assert.ok(r.expense)
  const after = monthlyReport(month)
  assert.equal(after.spent, before.spent + 80)
  assert.equal(after.balance, before.balance - 80)
  assert.ok(voidExpense(r.expense.id, '', 'Test').error, 'annulation sans motif → refus')
  assert.ok(voidExpense(r.expense.id, 'Doublon', 'Test').ok)
  assert.equal(monthlyReport(month).spent, before.spent, 'annulée : sortie du rapport')
  assert.ok(expenses().some(x => x.id === r.expense.id && x.cancelled), 'mais la trace reste')
})

// ── Inventaire : jamais sous zéro, seuil alerté, mouvements tracés ───────────
import { addItem, adjust, lowStock, itemById } from '../src/inventory.js'

test('inventaire : jamais sous zéro, seuil alerté, mouvements tracés', () => {
  const r = addItem({ name: 'Feutres', category: 'pedagogique', qty: 2, minQty: 3, by: 'Test' })
  assert.ok(r.item)
  assert.ok(lowStock().some(x => x.id === r.item.id), '2 ≤ seuil 3 → alerte')
  assert.ok(adjust(r.item.id, -5, 'Test').error, 'jamais sous zéro')
  assert.equal(adjust(r.item.id, +10, 'Test', 'Achat rentrée').qty, 12)
  assert.ok(!lowStock().some(x => x.id === r.item.id), 'au-dessus du seuil : plus d\'alerte')
  const it = itemById(r.item.id)
  assert.ok(it.moves.length >= 2 && it.moves.every(m => m.by && m.at), 'chaque mouvement est signé et daté')
})

// ── Recrutement : pas d'offre sans entretien, refus motivé ───────────────────
import { openPost, addCandidate, advanceCandidate } from '../src/recruit.js'

test('recrutement : on n\'embauche pas un CV — pas d\'offre sans entretien, refus motivé', () => {
  const p = openPost({ title: 'Éducatrice petite enfance', type: 'Éducatrice / Éducateur', by: 'Test' })
  const c = addCandidate({ postId: p.post.id, name: 'Candidate Test' })
  assert.ok(c.candidate)
  assert.ok(advanceCandidate(c.candidate.id, 'offre', 'Test').error, 'reçue → offre : saut refusé')
  assert.ok(advanceCandidate(c.candidate.id, 'embauchee', 'Test').error, 'reçue → embauchée : saut refusé')
  assert.ok(advanceCandidate(c.candidate.id, 'refusee', 'Test', '').error, 'refus sans motif → refus')
  assert.ok(advanceCandidate(c.candidate.id, 'entretien', 'Test').candidate)
  assert.ok(advanceCandidate(c.candidate.id, 'offre', 'Test').candidate)
  const hired = advanceCandidate(c.candidate.id, 'embauchee', 'Test')
  assert.equal(hired.candidate.stage, 'embauchee')
  assert.ok(hired.candidate.history.length >= 4, 'le parcours est écrit, étape par étape')
})

// ── ACL : la loi du serveur, testée comme une règle du métier ────────────────
import { blobForParent, blobForStaff, mergeWrite } from '../src/acl.js'

test('acl : le parent reçoit un blob RECONSTRUIT (défaut refus), le personnel un blob taillé', () => {
  const d = db()
  const parent = d.users.find(u => u.id === 'p1')
  const pb = blobForParent(d, parent)
  assert.equal(pb.hrPayrolls, undefined, 'jamais la paie')
  assert.equal(pb.visitors, undefined, 'jamais le registre de sécurité')
  assert.ok(pb.students.every(s => (parent.childIds || []).includes(s.id)), 'seulement SES enfants')
  assert.ok(pb.users.length === 1 && pb.users[0].id === parent.id)
  assert.ok(pb.users.every(u => !('pw' in u)) && pb.teachers.every(t => !('salary' in t)), 'ni mot de passe ni salaire')
  const tb = blobForStaff(d, 'teacher')
  assert.equal(tb.invoices, undefined, 'l\'enseignant ne voit pas les factures')
  assert.ok(tb.students?.length > 0, 'mais il voit les élèves')
})

test('acl : la fusion d\'écriture ne prend que les collections du rôle', () => {
  const server = { classes: [{ id: 'c1' }], attendance: {}, invoices: [{ id: 'i1' }] }
  const posted = { classes: [], attendance: { k: { s1: 'absent' } }, invoices: [] }
  const { merged, applied } = mergeWrite(server, posted, 'teacher')
  assert.ok(applied.includes('attendance') && !applied.includes('classes') && !applied.includes('invoices'))
  assert.equal(merged.classes.length, 1, 'les classes du serveur survivent')
  assert.equal(merged.invoices.length, 1, 'les factures aussi')
  assert.equal(merged.attendance.k.s1, 'absent', 'l\'appel est pris')
})

// ── Les comptes : l'annuaire de l'école, sous règles ─────────────────────────
import { createAccount, updateAccount, setDisabled, resetPassword } from '../src/accounts.js'

test('comptes : un e-mail un compte, et le dernier compte Direction est intouchable', () => {
  const r1 = createAccount({ role: 'security', name: 'Agent Test', email: 'agent.test@alnour.tn', pw: 'x' })
  assert.ok(r1.user && r1.user.role === 'security', 'la Direction crée aussi les comptes sécurité')
  assert.ok(createAccount({ role: 'teacher', name: 'Doublon', email: 'AGENT.TEST@alnour.tn' }).error, 'e-mail déjà pris (insensible à la casse) → refus')
  assert.ok(createAccount({ role: 'pirate', name: 'X', email: 'x@alnour.tn' }).error, 'rôle inconnu → refus')

  const dirs = db().users.filter(u => u.role === 'schooladmin' && !u.disabled)
  assert.equal(dirs.length, 1, 'l\'école de démo a UNE Direction active')
  assert.ok(setDisabled(dirs[0].id, true).error, 'désactiver la dernière Direction → refus (école verrouillée dehors)')
  assert.ok(updateAccount(dirs[0].id, { role: 'teacher' }).error, 'la rétrograder → refus aussi')

  const r2 = updateAccount(r1.user.id, { role: 'supervisor', name: 'Agent Promu' })
  assert.equal(r2.user.role, 'supervisor', 'changer un rôle ordinaire fonctionne')
  assert.ok(setDisabled(r1.user.id, true).ok && db().users.some(u => u.id === r1.user.id), 'désactivé, jamais supprimé — la trace reste')
  const pw = resetPassword(r1.user.id)
  assert.ok(pw.pw && pw.pw.length >= 6, 'mot de passe temporaire généré')
  const owner = db().users.find(u => u.role === 'owner')
  assert.ok(updateAccount(owner.id, { name: 'X' }).error, 'le compte plateforme ne se gère pas depuis l\'école')
})

// ── Capacité : une VRAIE école (500 élèves, un an d'appels) tient-elle ? ──────
// Tout est testé sur la démo de 36 élèves. Ici on fabrique une école réaliste
// et on mesure : la taille du blob, et le temps du filtrage par rôle (acl.js) —
// pour dire HONNÊTEMENT où sont les limites, pas pour deviner.
import { blobForParent as aclParent, blobForStaff as aclStaff } from '../src/acl.js'

test('capacité : 500 élèves × 180 jours d\'appels — le blob et le filtrage restent sains', () => {
  const N = 500, DAYS = 180, CLASSES = 25
  const classes = Array.from({ length: CLASSES }, (_, i) => ({ id: `c${i}`, name: `Classe ${i}`, grade: 'G', cycle: 'Primaire' }))
  const students = Array.from({ length: N }, (_, i) => ({ id: `s${i}`, name: `Élève ${i}`, classId: `c${i % CLASSES}`, parentId: `p${i}`, archived: false, allergies: 'Aucune' }))
  const users = students.map((s, i) => ({ id: `p${i}`, role: 'parent', name: `Parent ${i}`, email: `p${i}@ex.tn`, childIds: [s.id] }))
  users.push({ id: 'u_dir', role: 'schooladmin', name: 'Direction', email: 'dir@ex.tn' })
  const attendance = {}
  for (let d = 0; d < DAYS; d++) {
    const iso = `2026-${String((d % 12) + 1).padStart(2, '0')}-${String((d % 28) + 1).padStart(2, '0')}`
    for (const c of classes) {
      const marks = {}
      students.filter(s => s.classId === c.id).forEach(s => { marks[s.id] = d % 9 === 0 ? 'absent' : 'present' })
      attendance[`${c.id}_${iso}`] = marks
    }
  }
  const big = { _v: 1, classes, students, users, teachers: [], attendance,
    journal: [], behavior: [], moments: [], accidents: [], health: {}, pickups: {}, milestones: {},
    departures: [], payments: {}, invoices: [], receipts: [], reports: [], evaluations: [],
    applications: [], requests: [], notifications: [], canteen: {}, events: [], socialEvents: [],
    routes: [], homework: [], exams: [], hrPayrolls: [], settings: { schoolName: 'Grande École' } }

  const blobKB = Math.round(JSON.stringify(big).length / 1024)
  assert.ok(blobKB > 500, `blob réaliste ~${blobKB} KB`)
  // Bonne nouvelle honnête : 500 élèves × 180 j = ~800 KB, LARGEMENT sous le quota
  // localStorage (~5 Mo). Le pilote tient une vraie école ; la limite viendra des
  // pièces jointes (photos), pas des données structurées.
  assert.ok(blobKB < 4500, `sous le quota localStorage (~5 Mo) : ${blobKB} KB`)
  // Ce que la checklist veut savoir : ~90 000 marques d'appel produisent un blob de
  // cette taille. Repère honnête pour le pilote (localStorage ~5 Mo).
  console.log(`      capacité : 500 élèves × 180 j = ${blobKB} KB de blob (~${Object.keys(attendance).length} feuilles d'appel)`)

  // Le filtrage parent doit rester rapide même sur 500 comptes
  const t0 = Date.now()
  const pb = aclParent(big, users[0])
  const parentMs = Date.now() - t0
  assert.equal(pb.students.length, 1, 'le parent ne reçoit QUE son enfant, même dans une grande école')
  assert.ok(pb.users.length === 1, 'un seul compte')
  assert.ok(parentMs < 500, `filtrage parent en ${parentMs} ms (< 500)`)

  const t1 = Date.now()
  const sb = aclStaff(big, 'schooladmin')
  const staffMs = Date.now() - t1
  assert.equal(sb.students.length, N, 'la direction voit les 500')
  assert.ok(staffMs < 500, `filtrage direction en ${staffMs} ms`)
  console.log(`      filtrage : parent ${parentMs} ms · direction ${staffMs} ms`)
})

// ── Bords de calendrier : là où les bugs silencieux se cachent ───────────────
import { rentreeDate as rentree, isoOf as iso2 } from '../src/clock.js'
import { upcoming as fetesUpcoming, nextFerie as fetesNext } from '../src/fetes.js'

test('calendrier : la rentrée bascule d\'année au bon moment', () => {
  // avant le 15 septembre → rentrée de CETTE année
  const avant = rentree(new Date(2026, 5, 10))  // 10 juin 2026
  assert.equal(avant.getFullYear(), 2026)
  assert.equal(avant.getMonth(), 8); assert.equal(avant.getDate(), 15)
  // après le 15 septembre → rentrée de l'année PROCHAINE
  const apres = rentree(new Date(2026, 9, 1))    // 1 octobre 2026
  assert.equal(apres.getFullYear(), 2027, 'passé la rentrée, on vise septembre prochain')
})

test('calendrier : les fêtes franchissent le passage d\'année sans trou', () => {
  // fin décembre : l'agenda doit contenir des dates de 2027
  const a = fetesUpcoming('2026-12-28', 6)
  assert.equal(a.length, 6)
  assert.ok(a.every((x, i, arr) => i === 0 || arr[i - 1].d <= x.d), 'trié')
  assert.ok(a.some(x => x.d.startsWith('2027')), 'franchit 2026→2027')
  // le prochain férié après le dernier de l'année existe (table 2027 présente)
  const n = fetesNext('2026-12-20')
  assert.ok(n && n.d > '2026-12-20', 'un prochain férié existe toujours')
})

test('calendrier : isoOf est LOCAL, jamais UTC (le bug des dates de minuit)', () => {
  // 1er janvier à 00:30 locale ne doit pas devenir le 31 décembre (UTC)
  assert.equal(iso2(new Date(2026, 0, 1, 0, 30)), '2026-01-01')
  assert.equal(iso2(new Date(2026, 11, 31, 23, 30)), '2026-12-31')
})

// ── COREON INTELLIGENCE (core/insights.js) — la réponse à la « Focus AI ».
// On lit les faits déjà là ; on ne classe personne ; on n'invente rien.
test('intelligence : le climat se calcule des faits — récents et non retirés seulement', () => {
  const t0 = Date.now()
  const d = { behavior: [
    { trait: 'entraide', positive: true,  points: 2,  at: t0 - 1e3, removed: null },
    { trait: 'entraide', positive: true,  points: 2,  at: t0 - 2e3, removed: null },
    { trait: 'effort',   positive: true,  points: 2,  at: t0 - 3e3, removed: null },
    { trait: 'bavardage', positive: false, points: -1, at: t0 - 4e3, removed: null },
    { trait: 'effort',   positive: true,  points: 2,  at: t0 - 999 * 86400000, removed: null }, // trop vieux
    { trait: 'entraide', positive: true,  points: 2,  at: t0 - 5e3, removed: { by: 'x' } },      // retiré
  ] }
  const bc = behaviorClimate(d, 7)
  assert.equal(bc.total, 4, 'seules les observations récentes et non retirées comptent')
  assert.equal(bc.positives, 3)
  assert.equal(bc.toImprove, 1)
  assert.equal(bc.positiveRate, 75)
  assert.equal(bc.topTrait, 'entraide', 'le trait le plus encouragé — jamais un palmarès d\'élèves')
})

test('intelligence : présence — tendance + enfants à surveiller (bien-être, pas sanction)', () => {
  const iso = k => isoOf(new Date(Date.now() - k * 86400000))
  const attendance = {
    [attKey('c1', iso(1))]: { s_watch: 'absent', s_ok: 'present' },
    [attKey('c1', iso(2))]: { s_watch: 'absent', s_ok: 'present' },
    [attKey('c1', iso(3))]: { s_watch: 'late',   s_ok: 'present' },
  }
  const sig = attendanceSignal({ attendance }, 7)
  assert.ok(sig.current != null, 'un taux d\'absence se calcule dès qu\'il y a des appels')
  assert.deepEqual(sig.watch, ['s_watch'], 'seul l\'enfant aux absences répétées est signalé')
})

test('intelligence : recouvrement — le taux et les mois en retard, sans détour', () => {
  const d = { payments: { s1: [{ status: 'paid' }, { status: 'paid' }, { status: 'overdue' }], s2: [{ status: 'due' }] } }
  const fs = feeSignal(d)
  assert.equal(fs.total, 4)
  assert.equal(fs.paid, 2)
  assert.equal(fs.rate, 50)
  assert.equal(fs.overdue, 1)
})

test('intelligence : rien d\'inventé — pas de donnée, pas d\'insight ; la démo reste bien formée', () => {
  assert.deepEqual(schoolInsights({}, {}), [], 'une école vide ne ment pas')
  const items = schoolInsights(db())
  assert.ok(Array.isArray(items))
  const TONES = new Set(['ok', 'info', 'warn', 'danger'])
  for (const it of items) {
    assert.ok(it.key && it.value && it.label && it.to, 'chaque insight est complet')
    assert.ok(TONES.has(it.tone), 'un ton valide')
    assert.ok(it.to.startsWith('/app/'), 'pointe vers un écran où l\'on agit')
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// LES EMAILS DU CANDIDAT — un prospect sans compte n'est joignable QUE par
// email. On lui écrit à la soumission ET à chaque changement d'étape, et le
// dossier garde la trace de chaque envoi. (demandé par Othman, 2026-07-21)
// ═══════════════════════════════════════════════════════════════════════════
import { applicantEmail, emailsApplicant } from '../src/admissions-mail.js'
import { setMailTransport } from '../src/admissions.js'

test('email candidat : chaque étape produit un message juste (fonction pure)', () => {
  const app = { id: 'aTEST1', childName: 'Marwan Ben Ali', level: 'g1', parentName: 'Sana', parentEmail: 'sana@mail.tn' }
  for (const stage of ['nouvelle', 'pieces', 'examen', 'accepte', 'attente', 'inscrit', 'refuse']) {
    const m = applicantEmail(app, stage)
    assert.ok(m && m.to === 'sana@mail.tn', `${stage} : destinataire`)
    assert.ok(m.subject.includes('Marwan Ben Ali'), `${stage} : l'enfant est nommé dans l'objet`)
    assert.ok(m.text.includes('aTEST1'), `${stage} : la référence du dossier est rappelée`)
    assert.ok(m.text.includes('Sana'), `${stage} : le parent est salué`)
  }
  assert.equal(emailsApplicant('collecte'), false, 'une étape interne n\'écrit pas au candidat')
  assert.equal(applicantEmail(app, 'collecte'), null, 'étape non concernée → pas d\'email')
  assert.equal(applicantEmail({ ...app, parentEmail: '' }, 'accepte').to, null, 'pas d\'email fourni → to null, sans mentir')
  assert.match(applicantEmail(app, 'accepte').subject, /accept/i)
  assert.match(applicantEmail(app, 'refuse').text, /pas en mesure|défavorable|malheureusement/i)
})

test('email candidat : le cycle de vie journalise les envois sur le dossier', async () => {
  setMailTransport(null) // état par défaut : sans transport, l'email est « préparé »
  const r = apply({ childName: 'Nour Pré', dob: '2021-02-02', level: 'kg1', parentName: 'Rim', parentPhone: '+216 20 1', parentEmail: 'rim@mail.tn' })
  const id = r.app.id
  let a = appById(id)
  assert.equal(a.emails.length, 1, 'la soumission déclenche 1 email')
  assert.equal(a.emails[0].stage, 'nouvelle')
  assert.equal(a.emails[0].status, 'préparé', 'sans transport : préparé (jamais perdu)')

  advance(id, 'pieces', 'Test')
  a = appById(id)
  assert.equal(a.emails.length, 2, 'changement d\'étape → nouvel email')
  assert.equal(a.emails[1].stage, 'pieces')

  // Avec un transport branché, l'envoi passe de « envoi » à « envoyé ».
  // (pieces → refuse est un passage légitime qui n'exige pas de pièces)
  setMailTransport(() => Promise.resolve(true))
  advance(id, 'refuse', 'Test')
  const eid = appById(id).emails.at(-1).id
  await new Promise(res => setTimeout(res, 0)) // laisser filer la micro-tâche
  const sent = appById(id).emails.find(e => e.id === eid)
  assert.equal(sent.status, 'envoyé', 'transport ok → envoyé')
  setMailTransport(null) // ne pas polluer les autres tests

  // Un candidat sans email ne génère aucun envoi (et ne plante pas).
  const r2 = apply({ childName: 'Sans Mail', dob: '2021-01-01', level: 'kg1', parentName: 'X', parentPhone: '+216 20 2', parentEmail: '' })
  assert.equal(appById(r2.app.id).emails.length, 0, 'pas d\'email fourni → aucun envoi')
})

// ═══════════════════════════════════════════════════════════════════════════
// LE MAILER CENTRAL — un seul canal, tous les modules. Une notification peut
// aussi partir par email (opt-in `email:true`) vers le bon destinataire.
// ═══════════════════════════════════════════════════════════════════════════
import { sendMail, emailOfUser, parentEmailsOfStudent, parentEmailsOfClass } from '../src/mailer.js'
import { notify } from '../src/notify.js'

test('mailer : best-effort sans transport + résolution des destinataires', async () => {
  setMailTransport(null)
  const r0 = await sendMail({ to: 'x@y.tn', subject: 's', text: 't' })
  assert.equal(r0.ok, false); assert.equal(r0.via, 'no-transport')           // ne jette jamais
  assert.equal(await sendMail({ subject: 's', text: 't' }).then(r => r.via), 'no-recipient')
  assert.equal(emailOfUser('p1'), 'parent@alnour.tn')
  assert.ok(parentEmailsOfStudent('s1').includes('parent@alnour.tn'))         // p1 est parent de s1
  assert.ok(parentEmailsOfClass(db().students.find(s => s.id === 's1').classId).length >= 1)
})

test('notify email:true → part aussi par email, au bon destinataire', async () => {
  const sent = []
  setMailTransport(m => { sent.push(m); return Promise.resolve(true) })

  notify({ to: 'p1', email: true, kind: 'info', title: 'test direct', body: 'coucou' })
  await new Promise(r => setTimeout(r, 0))
  assert.ok(sent.some(m => m.to === 'parent@alnour.tn'), 'destinataire nommé → son email')

  sent.length = 0
  notify({ studentId: 's1', email: true, kind: 'incident', title: 'incident', body: 'x' })
  await new Promise(r => setTimeout(r, 0))
  assert.ok(sent.some(m => m.to === 'parent@alnour.tn'), 'studentId → email des parents')

  sent.length = 0
  notify({ to: 'p1', kind: 'info', title: 'silencieux', body: 'b' })          // pas d'email:true
  await new Promise(r => setTimeout(r, 0))
  assert.equal(sent.length, 0, 'sans email:true → aucun email (in-app seulement)')

  setMailTransport(null) // ne pas polluer les autres tests
})

// ── Pré-inscription par catégorie (CR-008 / CR-009 / CR-010) ─────────────────
test('pré-inscription : chaque niveau tombe dans la bonne catégorie', async () => {
  const { categoryOf } = await import('../src/enrolment.js')
  assert.equal(categoryOf('nursery'), 'creche')
  for (const k of ['prekg', 'kg1', 'kg2']) assert.equal(categoryOf(k), 'maternelle')
  for (const k of ['g1', 'g3', 'g6']) assert.equal(categoryOf(k), 'primaire')
  // un niveau inconnu ne casse pas la porte d'entrée
  assert.ok(['maternelle', 'primaire'].includes(categoryOf('inexistant')))
})

test('pré-inscription : on ne pose QUE les questions de la catégorie', async () => {
  const { stepsFor } = await import('../src/enrolment.js')
  const noms = c => stepsFor(c).flatMap(s => s.fields.map(f => f.name))
  const creche = noms('creche'), primaire = noms('primaire'), maternelle = noms('maternelle')

  // le bébé : pas d'école précédente ; le CM2 : pas de sieste ni de couches
  assert.ok(!creche.includes('prevSchool'), 'on ne demande pas son ancienne école à un bébé')
  assert.ok(!primaire.includes('napHabits'), 'on ne demande pas la sieste en 6ème année')
  assert.ok(!primaire.includes('diaper'), 'ni la propreté')
  assert.ok(creche.includes('napHabits') && creche.includes('diaper'), 'mais on la demande en crèche')
  assert.ok(primaire.includes('prevSchool') && primaire.includes('siblings'))
  // le rythme concerne la petite enfance, pas le primaire
  assert.ok(maternelle.includes('rythme') && !primaire.includes('rythme'))
  // le socle est demandé à tout le monde
  for (const c of ['creche', 'maternelle', 'primaire'])
    for (const req of ['childFirstName', 'dob', 'level', 'emergencyPhone', 'parentName', 'terms'])
      assert.ok(noms(c).includes(req), `${req} manque en ${c}`)
})

test('pré-inscription : les champs obligatoires bloquent, les pièces jamais', async () => {
  const { stepsFor, validateStep, validateAll } = await import('../src/enrolment.js')
  const vide = {}
  const e = validateAll('primaire', vide)
  assert.ok(e.childFirstName && e.dob && e.level && e.parentName && e.emergencyPhone, 'le socle est exigé')
  // les pièces ne bloquent JAMAIS : une page qui exige un scan à 22h ne reçoit rien
  const pieces = stepsFor('primaire').find(s => s.key === 'pieces')
  assert.deepEqual(validateStep(pieces, {}), {}, 'aucune pièce n’est bloquante')
})

test('pré-inscription : le détail de santé n’est exigé QUE si on a répondu oui', async () => {
  const { stepsFor, validateStep } = await import('../src/enrolment.js')
  const sante = stepsFor('creche').find(s => s.key === 'sante')
  const base = { emergencyName: 'Leïla', emergencyPhone: '+216 20 111 222' }
  assert.ok(!validateStep(sante, { ...base, hasCondition: 'Non' }).conditionDetail, 'non → rien à décrire')
  assert.ok(validateStep(sante, { ...base, hasCondition: 'Oui' }).conditionDetail, 'oui → il faut décrire')
  assert.ok(!validateStep(sante, { ...base, hasCondition: 'Oui', conditionDetail: 'Arachide' }).conditionDetail)
})

test('pré-inscription : la famille exige UN moyen de contact, pas un parent précis', async () => {
  const { stepsFor, validateStep } = await import('../src/enrolment.js')
  const fam = stepsFor('primaire').find(s => s.key === 'famille')
  assert.ok(validateStep(fam, {})._step, 'aucun contact : refus')
  assert.ok(!validateStep(fam, { motherPhone: '+216 20 000 000' })._step, 'la mère suffit')
  assert.ok(!validateStep(fam, { fatherEmail: 'p@ere.tn' })._step, 'le père seul suffit aussi')
  // un téléphone incohérent est refusé
  assert.ok(validateStep(fam, { motherPhone: 'abc' }).motherPhone)
})

test('pré-inscription : les conditions doivent TOUTES être acceptées', async () => {
  const { stepsFor, validateStep, TERMS } = await import('../src/enrolment.js')
  const eng = stepsFor('primaire').find(s => s.key === 'engagement')
  const base = { parentName: 'Karim', parentPhone: '+216 20 000 000' }
  assert.ok(validateStep(eng, base).terms, 'rien coché : refus')
  const presque = Object.fromEntries(TERMS.slice(0, -1).map(t => [t.key, true]))
  assert.ok(validateStep(eng, { ...base, terms: presque }).terms, 'une seule manquante : refus')
  const toutes = Object.fromEntries(TERMS.map(t => [t.key, true]))
  assert.ok(!validateStep(eng, { ...base, terms: toutes }).terms, 'toutes cochées : ça passe')
  assert.ok(TERMS.length >= 5, 'les engagements couvrent frais, préavis, santé, changements, données')
})

test('pré-inscription : la date de naissance ne peut pas être dans le futur', async () => {
  const { stepsFor, validateStep } = await import('../src/enrolment.js')
  const enfant = stepsFor('primaire').find(s => s.key === 'enfant')
  const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  assert.ok(validateStep(enfant, { childFirstName: 'A', childLastName: 'B', level: 'g1', dob: demain }).dob)
})

test('pré-inscription : le dossier envoyé garde le nom complet et les conditions datées', async () => {
  const { toApplication, TERMS } = await import('../src/enrolment.js')
  const a = toApplication({ childFirstName: 'Amira', childLastName: 'Ben Salah',
    terms: Object.fromEntries(TERMS.map(t => [t.key, true])) })
  assert.equal(a.childName, 'Amira Ben Salah', 'le nom complet est reconstruit pour l’école')
  assert.equal(a.acceptedTerms.length, TERMS.length, 'les conditions acceptées sont conservées')
  assert.ok(a.acceptedAt, 'avec leur date — un engagement sans date ne vaut rien')
})

// ── Saisie des bulletins par classe (CR-022) ────────────────────────────────
test('saisie par classe : une note par élève, enregistrée en un geste', async () => {
  const { resetDb, db } = await import('../src/db.js')
  const { saveClassReports, classGrid, reportOf, rowAverage, columnAverage, MARK_MAX } = await import('../src/academic.js')
  resetDb(); db()   // une école de démo neuve
  const cls = (db().classes || []).find(c => (db().students || []).filter(s => s.classId === c.id).length >= 3)
  const g = classGrid(cls.id, 't1')
  assert.ok(g.students.length >= 3, 'une classe avec des élèves')
  assert.ok(g.columns.length >= 3, 'des colonnes à remplir')

  const [a, b] = g.students
  const k = g.columns[0].key, k2 = g.columns[1].key
  const rows = g.early
    ? { [a.id]: { [k]: 'acquis' }, [b.id]: { [k]: 'encours' } }
    : { [a.id]: { [k]: 14, [k2]: 16 }, [b.id]: { [k]: 8 } }
  const r = saveClassReports({ classId: cls.id, term: 't1', rows, by: 'Test' })
  assert.equal(r.saved, 2, 'deux bulletins enregistrés en un seul appel')
  assert.equal(r.invalid, 0)
  assert.ok(reportOf(a.id, 't1'), 'le bulletin existe vraiment')
  if (!g.early) assert.equal(reportOf(a.id, 't1').marks[k], 14)
})

test('saisie par classe : une case vide n’efface jamais une note déjà saisie', async () => {
  const { resetDb, db } = await import('../src/db.js')
  const { saveClassReports, classGrid, reportOf } = await import('../src/academic.js')
  resetDb(); db()   // une école de démo neuve
  const cls = (db().classes || []).find(c => (db().students || []).filter(s => s.classId === c.id).length >= 2)
  const g = classGrid(cls.id, 't2')
  if (g.early) return                                   // les acquis se testent ailleurs
  const a = g.students[0]
  const [k1, k2] = g.columns.map(c => c.key)
  saveClassReports({ classId: cls.id, term: 't2', rows: { [a.id]: { [k1]: 12 } }, by: 'T' })
  // deuxième passage : on remplit une AUTRE matière, la première ne bouge pas
  saveClassReports({ classId: cls.id, term: 't2', rows: { [a.id]: { [k1]: '', [k2]: 15 } }, by: 'T' })
  const rep = reportOf(a.id, 't2')
  assert.equal(rep.marks[k1], 12, 'la note d’avant a survécu à une case laissée vide')
  assert.equal(rep.marks[k2], 15, 'la nouvelle est là')
})

test('saisie par classe : une note hors barème est refusée, pas arrondie en douce', async () => {
  const { resetDb, db } = await import('../src/db.js')
  const { saveClassReports, classGrid, reportOf, MARK_MAX } = await import('../src/academic.js')
  resetDb(); db()   // une école de démo neuve
  const cls = (db().classes || []).find(c => (db().students || []).filter(s => s.classId === c.id).length >= 2)
  const g = classGrid(cls.id, 't3')
  if (g.early) return
  const a = g.students[0], k = g.columns[0].key
  const r = saveClassReports({ classId: cls.id, term: 't3', rows: { [a.id]: { [k]: MARK_MAX + 5 } }, by: 'T' })
  assert.equal(r.invalid, 1, 'la note hors barème est comptée comme invalide')
  assert.equal(reportOf(a.id, 't3'), null, 'et rien n’est enregistré pour cet élève')
  // une colonne inconnue est refusée elle aussi
  const r2 = saveClassReports({ classId: cls.id, term: 't3', rows: { [a.id]: { 'Astrologie': 12 } }, by: 'T' })
  assert.equal(r2.invalid, 1, 'une matière qui n’existe pas est refusée')
})

test('saisie par classe : aucun bulletin vide n’est fabriqué', async () => {
  const { resetDb, db } = await import('../src/db.js')
  const { saveClassReports, classGrid, reports } = await import('../src/academic.js')
  resetDb(); db()   // une école de démo neuve
  const cls = (db().classes || []).find(c => (db().students || []).filter(s => s.classId === c.id).length >= 2)
  const avant = reports().length
  const r = saveClassReports({ classId: cls.id, term: 't1', rows: {}, by: 'T' })
  assert.equal(r.saved, 0, 'rien à enregistrer')
  assert.ok(r.skipped >= 2, 'les élèves non notés sont ignorés, pas créés')
  assert.equal(reports().length, avant, 'aucun bulletin fantôme')
})

test('saisie par classe : on peut reprendre où l’on s’est arrêté', async () => {
  const { resetDb, db } = await import('../src/db.js')
  const { saveClassReports, classGrid } = await import('../src/academic.js')
  resetDb(); db()   // une école de démo neuve
  const cls = (db().classes || []).find(c => (db().students || []).filter(s => s.classId === c.id).length >= 2)
  let g = classGrid(cls.id, 't1')
  if (g.early) return
  const a = g.students[0], k = g.columns[0].key
  saveClassReports({ classId: cls.id, term: 't1', rows: { [a.id]: { [k]: 11 } }, by: 'T' })
  g = classGrid(cls.id, 't1')
  assert.equal(g.rows[a.id][k], 11, 'la grille se rouvre déjà remplie')
})

test('saisie par classe : les moyennes ligne et colonne se calculent', async () => {
  const { rowAverage, columnAverage } = await import('../src/academic.js')
  assert.equal(rowAverage({ a: 10, b: 20 }), 15)
  assert.equal(rowAverage({}), null, 'aucune note : aucune moyenne inventée')
  assert.equal(columnAverage({ s1: { m: 10 }, s2: { m: 14 }, s3: {} }, 'm'), 12, 'les cases vides ne comptent pas')
  assert.equal(columnAverage({ s1: {} }, 'm'), null)
})
