// DIAGNOSTIC — CR-019 : les départements RH & Comptabilité, réels et cloisonnés.
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'

const PORT = 8995
const server = serveDist(PORT)
const browser = await chromium.launch({ executablePath: findChrome() })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 } })).newPage()
const B = `http://localhost:${PORT}`
const errs = []; page.on('pageerror', e => errs.push(e.message))
const ok = (c, m) => console.log((c ? 'PASS' : 'FAIL') + ' — ' + m)

const loginAs = async (email, pw) => {
  await page.goto(`${B}/#/login`); await page.evaluate(() => sessionStorage.clear())
  await page.goto(`${B}/#/login`); await page.waitForSelector('input')
  await page.locator('input').first().fill(email)
  await page.locator('input[type=password]').fill(pw)
  await page.keyboard.press('Enter'); await page.waitForTimeout(1500)
}

console.log('\n══ DÉPARTEMENTS RH & COMPTABILITÉ (CR-019) ══\n')

// ── RH
await loginAs('rh@alnour.tn', 'rh')
ok(page.url().includes('#/app'), 'la RH se connecte')
let body = await page.locator('body').innerText()
ok(/Ressources humaines|RH & Paie|Congés en attente|Personnel/.test(body), 'tableau de bord RH dédié')
// la RH accède à SON périmètre
await page.goto(`${B}/#/app/hr`); await page.waitForTimeout(700)
ok(!/non autorisé/i.test(await page.locator('body').innerText()) && page.url().includes('/app/hr'), 'la RH ouvre /app/hr')
// …mais PAS la comptabilité : redirigée
await page.goto(`${B}/#/app/accounting`); await page.waitForTimeout(800)
ok(!page.url().includes('/app/accounting'), 'la RH est REFUSÉE sur la comptabilité (redirigée)')

// ── Comptabilité
await loginAs('comptable@alnour.tn', 'compta')
ok(page.url().includes('#/app'), 'le comptable se connecte')
body = await page.locator('body').innerText()
ok(/Comptabilité|Recouvrement|finances/i.test(body), 'tableau de bord Comptabilité dédié')
await page.goto(`${B}/#/app/accounting`); await page.waitForTimeout(700)
ok(page.url().includes('/app/accounting'), 'le comptable ouvre /app/accounting')
// …mais PAS la RH ni les élèves
await page.goto(`${B}/#/app/hr`); await page.waitForTimeout(800)
ok(!page.url().includes('/app/hr'), 'le comptable est REFUSÉ sur la RH')
await page.goto(`${B}/#/app/students`); await page.waitForTimeout(800)
ok(!page.url().includes('/app/students'), 'le comptable est REFUSÉ sur les élèves')

// ── les boutons de démo existent sur la connexion
await page.goto(`${B}/#/login`); await page.waitForTimeout(600)
const demo = await page.locator('body').innerText()
ok(/RH & Paie/.test(demo) && /Comptabilité/.test(demo), 'les deux départements ont un bouton de démo')

ok(errs.length === 0, `aucune exception JS (${errs.length})`)
if (errs.length) console.log(errs.slice(0, 3).join('\n'))
await browser.close(); server.close()
