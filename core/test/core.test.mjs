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
