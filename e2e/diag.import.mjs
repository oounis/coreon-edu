// DIAGNOSTIC — CR-034 : l'import CSV guidé, piloté de bout en bout.
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'

const PORT = 8999
const server = serveDist(PORT)
const browser = await chromium.launch({ executablePath: findChrome() })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 } })).newPage()
const B = `http://localhost:${PORT}`
const fails = []
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails.push(m) }
page.on('pageerror', e => fails.push('pageerror: ' + e.message))

console.log('\n══ IMPORT DE DONNÉES (CR-034) ══\n')
await page.goto(`${B}/#/login`); await page.evaluate(() => sessionStorage.clear())
await page.goto(`${B}/#/login`); await page.waitForSelector('input')
await page.locator('input').first().fill('direction@alnour.tn')
await page.locator('input[type=password]').fill('admin')
await page.keyboard.press('Enter'); await page.waitForTimeout(1600)

await page.goto(`${B}/#/app/import`); await page.waitForTimeout(1000)
ok(await page.locator('text=Import de données').count() > 0, 'la page Import s’ouvre (direction)')

// coller un CSV : 1 création + 1 doublon + 1 erreur de date
const csv = 'nom;date de naissance;classe;parent;email parent\nDiag Testenfant;05/03/2019;Diag Classe;Diag Testparent;diag.parent@test.bh\nDiag Testenfant;05/03/2019;Diag Classe;;\nDiag Sansdate;99/99/9999;;;'
await page.locator('textarea').fill(csv); await page.waitForTimeout(400)
await page.locator('button:has-text("Continuer")').click(); await page.waitForTimeout(500)
ok(await page.locator('select').count() > 3, 'pas 2 : la correspondance des colonnes est proposée')
await page.locator('button:has-text("Vérifier")').click(); await page.waitForTimeout(500)
const body = await page.locator('body').innerText()
ok(/1 · Créer/.test(body), 'répétition : 1 création annoncée')
ok(/1 · Ignorer/.test(body), 'répétition : le doublon est ignoré')
ok(/1 · Erreur/.test(body), 'répétition : la date invalide est une erreur')
ok(/sera créée/.test(body), 'répétition : la classe inconnue est annoncée')
await page.locator('button:has-text("Importer")').click(); await page.waitForTimeout(900)
const body2 = await page.locator('body').innerText()
ok(/C.est fait/.test(body2), 'l’import s’exécute')
ok(/identifiants provisoires/.test(body2), 'les identifiants générés sont proposés au téléchargement')
ok(/Journal des imports/.test(body2) && /test|collé/.test(body2), 'l’import est journalisé')

// l'élève existe désormais dans le répertoire
await page.goto(`${B}/#/app/students`); await page.waitForTimeout(1200)
await page.locator('input[placeholder*="echerch"], input[type="search"]').first().fill('Diag Testenfant').catch(() => {})
await page.waitForTimeout(600)
ok((await page.locator('body').innerText()).includes('Diag Testenfant'), 'l’élève importé apparaît dans le répertoire Élèves')

// l'annulation
await page.goto(`${B}/#/app/import`); await page.waitForTimeout(800)
if (await page.locator('button:has-text("Annuler cet import")').count()) {
  await page.locator('button:has-text("Annuler cet import")').click(); await page.waitForTimeout(1500)
}
await page.goto(`${B}/#/app/students`); await page.waitForTimeout(1200)
ok(!(await page.locator('body').innerText()).includes('Diag Testenfant'), 'l’annulation retire l’élève importé')

await browser.close(); server.close()
console.log(fails.length ? `\n✗ ${fails.length} échec(s)` : '\n✓ diagnostic import complet')
process.exit(fails.length ? 1 : 0)
