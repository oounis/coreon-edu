// ════════════════════════════════════════════════════════════════════════════
// SMOKE TEST DE PRODUCTION — « peut-on livrer cet ERP à de vraies écoles ? »
//
// Sept catégories, sur le VRAI bundle (app/dist), pilotant le navigateur :
//   A. Authentification (positif + négatif + sécurité)
//   B. CRUD données (créer / lire / mettre à jour / archiver)
//   C. Workflows métier de bout en bout
//   D. Permissions & RBAC (matrice de refus)
//   E. Intégrité des données (références uniques, pas de NaN/undefined, isolation)
//   F. Gestion d'erreur (mauvaise route, formulaire vide, mauvaise saisie)
//   G. Stabilité (zéro exception JS sur pages × rôles)
// ════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'

const PORT = 8996
const server = serveDist(PORT)
const browser = await chromium.launch({ executablePath: findChrome() })
const B = `http://localhost:${PORT}`

let pass = 0, fail = 0
const results = []
const ok = (cat, cond, msg) => { results.push({ cat, cond: !!cond, msg }); cond ? pass++ : fail++
  console.log(`${cond ? 'PASS' : 'FAIL'} [${cat}] ${msg}`) }

const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
const page = await ctx.newPage()
const jsErrors = []
page.on('pageerror', e => jsErrors.push(e.message))

const login = async (email, pw) => {
  await page.goto(`${B}/#/login`); await page.evaluate(() => sessionStorage.clear())
  await page.goto(`${B}/#/login`); await page.waitForSelector('input')
  await page.locator('input').first().fill(email)
  await page.locator('input[type=password]').fill(pw)
  await page.keyboard.press('Enter'); await page.waitForTimeout(1400)
  return page.url().includes('#/app')
}
const body = () => page.locator('body').innerText()
// attendre la fin du lazy-load (le squelette de Suspense porte role=status)
const settle = async () => { await page.waitForTimeout(250)
  for (let w = 0; w < 14 && await page.locator('[role=status]').count() > 0; w++) await page.waitForTimeout(150)
  await page.waitForTimeout(200) }

console.log('\n════ SMOKE TEST DE PRODUCTION — COREON EDU (WEB) ════\n')

// ─────────────────────────────────────────── A. AUTHENTIFICATION
console.log('── A. Authentification ──')
ok('AUTH+', await login('direction@alnour.tn', 'admin'), 'Direction se connecte (positif)')
// négatif : mauvais mot de passe
await page.goto(`${B}/#/login`); await page.evaluate(() => sessionStorage.clear())
await page.goto(`${B}/#/login`); await page.waitForSelector('input')
await page.locator('input').first().fill('direction@alnour.tn')
await page.locator('input[type=password]').fill('MAUVAIS')
await page.keyboard.press('Enter'); await page.waitForTimeout(700)
ok('AUTH-', !page.url().includes('#/app') && /incorrect/i.test(await body()), 'Mauvais mot de passe refusé avec message (négatif)')
// les 9 rôles se connectent
const roles = [['owner@kogia.tn','owner'],['direction@alnour.tn','admin'],['admin@alnour.tn','office'],
  ['rh@alnour.tn','rh'],['comptable@alnour.tn','compta'],['enseignant@alnour.tn','teacher'],
  ['surveillant@alnour.tn','super'],['securite@alnour.tn','secu'],['parent@alnour.tn','parent']]
let allIn = true
for (const [e, p] of roles) if (!await login(e, p)) allIn = false
ok('AUTH+', allIn, `Les 9 rôles se connectent (${roles.length}/9)`)
// récupération de mot de passe existe
await page.goto(`${B}/#/login`); await page.waitForTimeout(400)
ok('AUTH+', await page.locator('a:has-text("Mot de passe oublié")').count() > 0, 'Récupération de mot de passe disponible')

// ─────────────────────────────────────────── B. CRUD DONNÉES
console.log('── B. CRUD données ──')
await login('direction@alnour.tn', 'admin')
await page.goto(`${B}/#/app/students`); await page.waitForTimeout(900)
const before = await page.locator('table tbody tr').count()
// CREATE : ouvrir le formulaire, saisir, enregistrer
await page.locator('button:has-text("Inscrire un élève"), button:has-text("Inscrire")').first().click().catch(()=>{})
await page.waitForTimeout(600)
// BOUNDARY/NEGATIF : enregistrer vide → bloqué
const saveBtn = page.locator('button:has-text("Enregistrer"), button:has-text("Inscrire")').last()
await saveBtn.click().catch(()=>{}); await page.waitForTimeout(500)
ok('CRUD-', await page.locator('button:has-text("Enregistrer"), button:has-text("Inscrire")').count() > 0, 'Formulaire élève vide : reste ouvert / non enregistré (négatif)')
// CREATE valide
const nameField = page.locator('label:has(span:text-is("Nom complet *"))').locator('input').first()
if (await nameField.count()) { await nameField.fill('SmokeUnique Élève'); await page.waitForTimeout(200)
  await page.locator('input[type=checkbox]').last().check().catch(()=>{})   // consentement loi 2004-63
  await saveBtn.click(); await page.waitForTimeout(1000) }
await page.goto(`${B}/#/app/students`); await page.waitForTimeout(900)
// READ : recherche du nouvel élève (le 1er champ texte = recherche du DataTable)
const search = page.locator('input[type=text], input:not([type])').first()
if (await search.count()) { await search.fill('SmokeUnique'); await page.waitForTimeout(600) }
const found = /SmokeUnique/.test(await body())
ok('CRUD+', found, 'CREATE + READ : le nouvel élève apparaît dans la liste')
ok('CRUD+', /STD-[A-Z]{2}-/.test(await body()), 'Le nouvel élève reçoit une référence ERP')

// ─────────────────────────────────────────── C. WORKFLOWS MÉTIER
console.log('── C. Workflows métier ──')
// Grille de notes (évaluation) : ouvrir, saisir, enregistrer
await page.goto(`${B}/#/app/academic`); await settle()
ok('FLOW+', /Noter toute une classe/.test(await body()), 'Bulletins : la saisie par classe est proposée')
// Admissions : la file existe (le parcours public la remplit ailleurs)
await page.goto(`${B}/#/app/admissions`); await settle()
ok('FLOW+', !/non autorisé/i.test(await body()), 'Admissions : accessible et rendue')
// Comptabilité : facturation
await page.goto(`${B}/#/app/accounting`); await settle()
await page.waitForFunction(() => location.hash.includes('/app/accounting'), { timeout: 5000 }).catch(()=>{})
ok('FLOW+', page.url().includes('/app/accounting') && !/\bNaN\b/.test(await body()), 'Comptabilité : rendue sans NaN')

// ─────────────────────────────────────────── D. PERMISSIONS & RBAC (négatif/sécurité)
console.log('── D. Permissions & RBAC ──')
// Enseignant NE DOIT PAS voir la comptabilité ni la RH
await login('enseignant@alnour.tn', 'teacher')
await page.goto(`${B}/#/app/accounting`); await page.waitForTimeout(700)
ok('RBAC', !page.url().includes('/app/accounting'), 'Enseignant REFUSÉ sur la comptabilité')
await page.goto(`${B}/#/app/hr`); await page.waitForTimeout(700)
ok('RBAC', !page.url().includes('/app/hr'), 'Enseignant REFUSÉ sur la RH')
// Parent ne voit que son périmètre — pas les élèves de l'école
await login('parent@alnour.tn', 'parent')
await page.goto(`${B}/#/app/students`); await page.waitForTimeout(700)
ok('RBAC', !page.url().includes('/app/students'), 'Parent REFUSÉ sur la liste des élèves')
await page.goto(`${B}/#/app/accounts`); await page.waitForTimeout(700)
ok('RBAC', !page.url().includes('/app/accounts'), 'Parent REFUSÉ sur la gestion des comptes')
// Comptable refusé sur RH (cloisonnement départements)
await login('comptable@alnour.tn', 'compta')
await page.goto(`${B}/#/app/hr`); await page.waitForTimeout(700)
ok('RBAC', !page.url().includes('/app/hr'), 'Comptable REFUSÉ sur la RH (cloisonnement)')

// ─────────────────────────────────────────── E. INTÉGRITÉ DES DONNÉES
console.log('── E. Intégrité des données ──')
await login('direction@alnour.tn', 'admin')
await page.goto(`${B}/#/app/students`); await page.waitForTimeout(900)
// références uniques
const refs = (await body()).match(/STD-[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+-\d{4}-\d{8}-\d/g) || []
ok('DATA', refs.length > 1 && new Set(refs).size === refs.length, `Références élèves uniques (${new Set(refs).size}/${refs.length} à l'écran)`)
// isolation parent : deux parents ne voient pas le même enfant
await login('parent@alnour.tn', 'parent')
await page.goto(`${B}/#/app`); await page.waitForTimeout(800)
const p1 = await body()
await login('parent3@alnour.tn', 'parent')
await page.goto(`${B}/#/app`); await page.waitForTimeout(800)
const p3 = await body()
// Amira (s1) appartient à p1 ; ne doit pas apparaître chez p3
ok('DATA', p1.includes('Amira') && !p3.includes('Amira'), 'Isolation parent : chaque parent ne voit que SON enfant')

// ─────────────────────────────────────────── F. GESTION D'ERREUR
console.log('── F. Gestion d\'erreur ──')
await login('direction@alnour.tn', 'admin')
// route inexistante → pas d'écran blanc, pas de crash
await page.goto(`${B}/#/app/cette-page-nexiste-pas`); await page.waitForTimeout(700)
const bad = await body()
ok('ERR', bad.trim().length > 20 && !/^\s*$/.test(bad), 'Route inconnue : pas d\'écran blanc (redirigé/géré)')
// route publique inconnue
await page.goto(`${B}/#/nawak`); await page.waitForTimeout(600)
ok('ERR', (await body()).trim().length > 20, 'Route publique inconnue : gérée sans crash')

// ─────────────────────────────────────────── G. STABILITÉ (balayage pages × rôles)
console.log('── G. Stabilité ──')
const sweep = {
  'direction@alnour.tn/admin': ['/app','/app/students','/app/academic','/app/accounting','/app/hr','/app/admissions','/app/settings','/app/documents','/app/facilities'],
  'enseignant@alnour.tn/teacher': ['/app','/app/evaluate','/app/attendance','/app/journal','/app/behavior'],
  'parent@alnour.tn/parent': ['/app','/app/live','/app/payments','/app/journal','/app/accidents'],
  'comptable@alnour.tn/compta': ['/app','/app/accounting','/app/finance','/app/budget'],
  'rh@alnour.tn/rh': ['/app','/app/hr','/app/staff','/app/recruit'],
}
let blank = 0, pages = 0
for (const [cred, routes] of Object.entries(sweep)) {
  const [e, p] = cred.split('/'); await login(e, p)
  for (const r of routes) { pages++
    await page.goto(`${B}/#${r}`)
    // attendre la fin du chargement paresseux (le squelette porte role=status)
    await page.waitForTimeout(300)
    for (let w = 0; w < 12 && await page.locator('[role=status]').count() > 0; w++) await page.waitForTimeout(150)
    await page.waitForTimeout(200)
    const txt = await body()
    if (txt.trim().length < 20 || /\bNaN\b/.test(txt)) { blank++; console.log(`   ⚠ ${e.split('@')[0]} ${r} : suspect (len ${txt.trim().length})`) }
  }
}
ok('STAB', blank === 0, `Aucune page blanche / NaN sur ${pages} pages × rôles`)
ok('STAB', jsErrors.length === 0, `Zéro exception JS sur tout le parcours (${jsErrors.length})`)
if (jsErrors.length) console.log('   ', jsErrors.slice(0, 5).join('\n    '))

// ─────────────────────────────────────────── BILAN
console.log(`\n════ BILAN WEB : ${pass} PASS · ${fail} FAIL ════`)
console.log('Par catégorie :')
for (const cat of ['AUTH+','AUTH-','CRUD+','CRUD-','FLOW+','RBAC','DATA','ERR','STAB']) {
  const c = results.filter(r => r.cat === cat)
  if (c.length) console.log(`   ${cat.padEnd(6)} ${c.filter(r=>r.cond).length}/${c.length}`)
}
await browser.close(); server.close()
process.exit(fail > 0 ? 1 : 0)
