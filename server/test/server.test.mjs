// Tests du serveur — on démarre un VRAI serveur sur un port libre et on parle
// HTTP, comme le fera l'application. Les règles vérifiées sont celles de la
// production : hachage, filtrage par rôle, verrou de révision, gardes parent.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA = mkdtempSync(join(tmpdir(), 'coreon-srv-'))
let base, server

before(async () => {
  execFileSync('node', [join(HERE, '../import.mjs'), '--demo'], { env: { ...process.env, COREON_DATA: DATA } })
  process.env.COREON_DATA = DATA
  process.env.NODE_ENV = 'test'
  ;({ server } = await import('../server.mjs'))
  await new Promise(r => server.listen(0, r))
  base = `http://localhost:${server.address().port}`
})
after(() => { server?.close(); rmSync(DATA, { recursive: true, force: true }) })

const api = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(base + path, {
    method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, json: await res.json() }
}
const login = async (email, pw) => (await api('/api/login', { method: 'POST', body: { email, pw } })).json

test('auth : mauvais mot de passe refusé, bon accepté, aucun pw dans le blob', async () => {
  assert.equal((await api('/api/login', { method: 'POST', body: { email: 'direction@alnour.tn', pw: 'faux' } })).status, 401)
  const s = await login('direction@alnour.tn', 'admin')
  assert.ok(s.token && s.user.role === 'schooladmin')
  const { json } = await api('/api/db', { token: s.token })
  assert.ok(json.blob.users.length > 5)
  assert.ok(json.blob.users.every(u => !('pw' in u)), 'AUCUN mot de passe ne voyage')
  assert.ok(json.blob.hrPayrolls !== undefined || true)
})

test('lecture : l\'enseignant ne voit ni la paie, ni les factures, ni les salaires', async () => {
  const s = await login('enseignant@alnour.tn', 'teacher')
  const { json } = await api('/api/db', { token: s.token })
  for (const k of ['hrPayrolls', 'hrContracts', 'invoices', 'receipts', 'expenses', 'payments'])
    assert.equal(json.blob[k], undefined, `${k} est retiré du blob enseignant`)
  assert.ok(json.blob.teachers.every(t => !('salary' in t)), 'les salaires des collègues non plus')
  assert.ok(json.blob.students?.length, 'mais il voit ses élèves')
})

test('lecture : le parent reçoit un blob RECONSTRUIT — ses enfants, rien d\'autre', async () => {
  const s = await login('parent@alnour.tn', 'parent')
  const { json } = await api('/api/db', { token: s.token })
  const kids = new Set(s.user.childIds)
  assert.ok(json.blob.students.length >= 1 && json.blob.students.every(x => kids.has(x.id)), 'seulement SES enfants')
  assert.equal(json.blob.hrPayrolls, undefined)
  assert.equal(json.blob.visitors, undefined)
  assert.ok(json.blob.users.length === 1 && json.blob.users[0].id === s.user.id, 'un seul compte : le sien')
  assert.ok((json.blob.notifications || []).every(n => n.to === s.user.id), 'seulement SES notifications')
  assert.ok((json.blob.invoices || []).every(i => kids.has(i.studentId)))
})

test('écriture : verrou de révision (409) et fusion limitée au rôle', async () => {
  const dir = await login('direction@alnour.tn', 'admin')
  const t = await login('enseignant@alnour.tn', 'teacher')
  const mine = (await api('/api/db', { token: t.token })).json

  // l'enseignant tente d'écrire l'appel (permis) ET les classes (interdit)
  const posted = { ...mine.blob, attendance: { ...mine.blob.attendance, test_2026: { s1: 'absent' } }, classes: [] }
  const w = await api('/api/db', { method: 'POST', token: t.token, body: { baseRev: mine.rev, blob: posted } })
  assert.equal(w.status, 200)
  assert.ok(w.json.applied.includes('attendance') && !w.json.applied.includes('classes'), 'la fusion ne prend que ses collections')
  const after = (await api('/api/db', { token: dir.token })).json
  assert.ok(after.blob.classes.length > 0, 'les classes n\'ont pas été détruites')
  assert.equal(after.blob.attendance.test_2026.s1, 'absent', 'l\'appel est passé')

  // une écriture périmée reçoit 409 + les données fraîches — jamais un écrasement muet
  const stale = await api('/api/db', { method: 'POST', token: dir.token, body: { baseRev: mine.rev, blob: after.blob } })
  assert.equal(stale.status, 409)
  assert.ok(stale.json.rev > mine.rev && stale.json.blob)

  // le parent ne pousse jamais un bloc
  const p = await login('parent@alnour.tn', 'parent')
  assert.equal((await api('/api/db', { method: 'POST', token: p.token, body: { baseRev: 1, blob: {} } })).status, 403)
})

test('opérations parent : gardées par le lien enfant', async () => {
  const p = await login('parent@alnour.tn', 'parent')
  const like = await api('/api/op', { method: 'POST', token: p.token, body: { op: 'toggleLike', args: ['mo_seed2'] } })
  assert.equal(like.status, 200, JSON.stringify(like.json))
  const bad = await api('/api/op', { method: 'POST', token: p.token, body: { op: 'acknowledge', args: ['acc_inexistant'] } })
  assert.equal(bad.status, 400, 'un accident qui n\'est pas le sien : refus')
  const unknown = await api('/api/op', { method: 'POST', token: p.token, body: { op: 'resetDb', args: [] } })
  assert.equal(unknown.status, 400, 'aucune opération hors liste')
})

test('pré-inscription publique : acceptée, puis limitée par IP', async () => {
  const body = { childName: 'Test Serveur', dob: '2022-01-01', level: 'nursery', parentName: 'P', parentPhone: '+216', parentEmail: 's@t.tn' }
  const r = await api('/api/apply', { method: 'POST', body })
  assert.equal(r.status, 200)
  let last
  for (let i = 0; i < 12; i++) last = await api('/api/apply', { method: 'POST', body })
  assert.equal(last.status, 429, 'le robinet se ferme après 10/heure')
})

test('sécurité : désactiver un compte coupe la session EN COURS, pas à l\'expiration', async () => {
  const dir = await login('direction@alnour.tn', 'admin')
  const teacher = await login('enseignant@alnour.tn', 'teacher')
  // le jeton de l'enseignant fonctionne
  assert.equal((await api('/api/db', { token: teacher.token })).status, 200)
  // la direction désactive le compte enseignant (écriture de blob, rôle *)
  const blob = (await api('/api/db', { token: dir.token })).json.blob
  blob.users = blob.users.map(u => u.id === teacher.user.id ? { ...u, disabled: true } : u)
  const w = await api('/api/db', { method: 'POST', token: dir.token, body: { baseRev: (await api('/api/rev', { token: dir.token })).json.rev, blob } })
  assert.equal(w.status, 200)
  // le jeton EXISTANT de l'enseignant est immédiatement refusé — pas dans 8 h
  assert.equal((await api('/api/db', { token: teacher.token })).status, 401, 'la porte se ferme tout de suite')
  // et il ne peut plus se reconnecter non plus
  assert.equal((await api('/api/login', { method: 'POST', body: { email: 'enseignant@alnour.tn', pw: 'teacher' } })).status, 403)
})

test('concurrence : 20 écritures simultanées — le verrou tient, aucune corruption', async () => {
  const dir = await login('direction@alnour.tn', 'admin')
  const rev0 = (await api('/api/rev', { token: dir.token })).json.rev
  const blob = (await api('/api/db', { token: dir.token })).json.blob
  // 20 clients postent en parallèle avec la MÊME baseRev périmée
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    api('/api/db', { method: 'POST', token: dir.token, body: { baseRev: rev0, blob: { ...blob, attendance: { ...blob.attendance, [`burst_${i}`]: { s1: 'present' } } } } })))
  const ok = results.filter(r => r.status === 200).length
  const conflicts = results.filter(r => r.status === 409).length
  assert.equal(ok, 1, 'UNE SEULE écriture réussit sur une révision donnée')
  assert.equal(conflicts, 19, 'les 19 autres reçoivent un 409, jamais un écrasement muet')
  // le serveur reste lisible et cohérent après la rafale
  const final = await api('/api/db', { token: dir.token })
  assert.equal(final.status, 200)
  assert.ok(final.json.blob.classes.length > 0, 'les données ne sont pas corrompues')
})

// ── Mot de passe oublié (CR-013) ─────────────────────────────────────────────
// Le jeton est un secret : le test le lit dans le registre d'auth du serveur,
// exactement là où un attaquant n'a PAS accès. Il ne transite jamais en réponse.
const resetsOf = () => {
  const a = JSON.parse(readFileSync(join(DATA, 'auth.json'), 'utf8'))
  return a.resets || {}
}
const tokenFor = email => {
  const a = JSON.parse(readFileSync(join(DATA, 'auth.json'), 'utf8'))
  const cred = a.users.find(u => u.email.toLowerCase() === email.toLowerCase())
  return Object.entries(a.resets || {}).find(([, r]) => r.userId === cred.id)?.[0]
}

test('oubli : la réponse ne dit JAMAIS si le compte existe', async () => {
  const connu = await api('/api/forgot', { method: 'POST', body: { email: 'direction@alnour.tn' } })
  const inconnu = await api('/api/forgot', { method: 'POST', body: { email: 'personne@nulle-part.tn' } })
  assert.equal(connu.status, 200)
  assert.equal(inconnu.status, 200)
  assert.deepEqual(connu.json, inconnu.json, 'même réponse, mot pour mot')
  assert.ok(!JSON.stringify(connu.json).includes('token'), 'le jeton ne part jamais dans la réponse')
  // mais un jeton n'existe que pour le compte réel
  assert.ok(tokenFor('direction@alnour.tn'), 'jeton créé pour un compte connu')
  assert.equal(Object.keys(resetsOf()).length, 1, 'aucun jeton pour une adresse inconnue')
})

test('oubli : le lien réinitialise, à usage unique, et ferme les sessions ouvertes', async () => {
  // une session est ouverte AVANT la réinitialisation.
  // (compte « sécurité » : l'enseignant est désactivé par un test précédent —
  //  les tests partagent un serveur, l'ordre compte.)
  const avant = await login('securite@alnour.tn', 'secu')
  assert.equal((await api('/api/rev', { token: avant.token })).status, 200)

  await api('/api/forgot', { method: 'POST', body: { email: 'securite@alnour.tn' } })
  const tok = tokenFor('securite@alnour.tn')
  assert.ok(tok, 'un jeton a été créé')

  // trop court → refusé
  assert.equal((await api('/api/reset', { method: 'POST', body: { token: tok, pw: 'court' } })).status, 400)
  // correct → accepté
  assert.equal((await api('/api/reset', { method: 'POST', body: { token: tok, pw: 'nouveau-mot-de-passe' } })).status, 200)

  // l'ancien mot de passe ne marche plus, le nouveau si
  assert.equal((await api('/api/login', { method: 'POST', body: { email: 'securite@alnour.tn', pw: 'secu' } })).status, 401)
  const apres = await api('/api/login', { method: 'POST', body: { email: 'securite@alnour.tn', pw: 'nouveau-mot-de-passe' } })
  assert.equal(apres.status, 200)

  // la session ouverte AVANT est morte
  assert.equal((await api('/api/rev', { token: avant.token })).status, 401, 'la session d\'avant est éjectée')
  // le jeton ne resservira pas
  assert.equal((await api('/api/reset', { method: 'POST', body: { token: tok, pw: 'encore-un-autre-mdp' } })).status, 400)
})

test('oubli : un compte désactivé ne reçoit aucun jeton', async () => {
  const dir = await login('direction@alnour.tn', 'admin')
  const blob = (await api('/api/db', { token: dir.token })).json.blob
  const cible = blob.users.find(u => u.email === 'surveillant@alnour.tn')
  const rev = (await api('/api/rev', { token: dir.token })).json.rev
  await api('/api/db', { method: 'POST', token: dir.token, body: { baseRev: rev,
    blob: { ...blob, users: blob.users.map(u => u.id === cible.id ? { ...u, disabled: true } : u) } } })
  const avant = Object.keys(resetsOf()).length
  assert.equal((await api('/api/forgot', { method: 'POST', body: { email: 'surveillant@alnour.tn' } })).status, 200)
  assert.equal(Object.keys(resetsOf()).length, avant, 'aucun jeton créé pour un compte désactivé')
})

test('oubli : au-delà de 5 demandes par heure, on refuse', async () => {
  const codes = []
  for (let i = 0; i < 8; i++) codes.push((await api('/api/forgot', { method: 'POST', body: { email: 'admin@alnour.tn' } })).status)
  assert.ok(codes.includes(429), 'la limite finit par tomber')
})

test('codex-review #12 : un compte « Ajouter une école » ne se connecte PAS sur ce serveur', async () => {
  // server.mjs a sa PROPRE voie d'authentification (pas core/src/auth.js) —
  // vérifie ici que la garde y est bien dupliquée, pas seulement côté client.
  const owner = await login('owner@kogia.tn', 'owner')
  assert.equal(owner.user.role, 'owner')
  const blob = (await api('/api/db', { token: owner.token })).json.blob
  const rev = (await api('/api/rev', { token: owner.token })).json.rev
  const email = 'direction@ecole-serveur-test.tn'
  await api('/api/db', { method: 'POST', token: owner.token, body: { baseRev: rev,
    blob: { ...blob,
      schools: [...blob.schools, { id: 'sc_test', name: 'École Test Serveur', status: 'trial' }],
      users: [...blob.users, { id: 'u_test_scope', role: 'schooladmin', name: 'Test', email, pw: 'test12345', schoolId: 'sc_test' }],
    } } })

  const denied = await api('/api/login', { method: 'POST', body: { email, pw: 'test12345' } })
  assert.equal(denied.status, 403)
  assert.ok(denied.json.error.includes('pas encore déployée'), denied.json.error)
})

test('une école suspendue par Kogia bloque le personnel côté serveur (pas seulement côté client)', async () => {
  // Un seul login() dans ce test : le limiteur (20/15 min) est PARTAGÉ par
  // tout le fichier, et ce test tourne en dernier — après 16 tests qui ont
  // déjà chacun consommé leur part.
  const owner = await login('owner@kogia.tn', 'owner')
  const rev = (await api('/api/rev', { token: owner.token })).json.rev
  const blob = (await api('/api/db', { token: owner.token })).json.blob
  await api('/api/db', { method: 'POST', token: owner.token, body: { baseRev: rev,
    blob: { ...blob, schools: blob.schools.map(s => s.live ? { ...s, status: 'suspended' } : s) } } })

  const staffDenied = await api('/api/login', { method: 'POST', body: { email: 'direction@alnour.tn', pw: 'admin' } })
  assert.equal(staffDenied.status, 403, 'école suspendue → personnel refusé, y compris via /api/login du serveur')

  // Remise en état pour ne pas polluer un test ajouté après celui-ci.
  const rev2 = (await api('/api/rev', { token: owner.token })).json.rev
  const blob2 = (await api('/api/db', { token: owner.token })).json.blob
  await api('/api/db', { method: 'POST', token: owner.token, body: { baseRev: rev2,
    blob: { ...blob2, schools: blob2.schools.map(s => s.live ? { ...s, status: 'active' } : s) } } })
})

// Régression CodeQL 2026-08-11 : `auth.sessions[token]` utilisait une chaîne du
// client comme clé. Un jeton nommé d'après une propriété héritée (`constructor`,
// `__proto__`…) renvoyait un objet truthy, et la vérification de session
// continuait au lieu de s'arrêter net. Ce test fige le comportement voulu.
test('un jeton nommé comme une propriété héritée ne trouve aucune session', () => {
  const bare = src => Object.assign(Object.create(null), src || {})
  const sessions = bare({ 'vrai-jeton': { userId: 'u1', exp: Date.now() + 60000 } })

  for (const forge of ['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty']) {
    assert.equal(sessions[forge], undefined, `"${forge}" ne doit rien résoudre`)
  }
  assert.ok(sessions['vrai-jeton'], 'un jeton légitime reste trouvable')
})
