// DIAGNOSTIC — CR-022 : noter toute une classe dans une grille.
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'

const PORT = 8989
const server = serveDist(PORT)
const browser = await chromium.launch({ executablePath: findChrome() })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 } })).newPage()
const B = `http://localhost:${PORT}`
const errs = []; page.on('pageerror', e => errs.push(e.message))
const ok = (c, m) => console.log((c ? 'PASS' : 'FAIL') + ' — ' + m)

console.log('\n══ BULLETINS : SAISIE PAR CLASSE ══\n')

await page.goto(`${B}/#/login`); await page.evaluate(() => sessionStorage.clear())
await page.goto(`${B}/#/login`); await page.waitForSelector('input')
await page.locator('input').first().fill('direction@alnour.tn')
await page.locator('input[type=password]').fill('admin')
await page.keyboard.press('Enter'); await page.waitForTimeout(1600)
await page.goto(`${B}/#/app/academic`); await page.waitForTimeout(1200)

ok(/Noter toute une classe/.test(await page.locator('body').innerText()), 'l’entrée « Noter toute une classe » est proposée')

// Ouvrir une classe de PRIMAIRE : en petite enfance la grille montre des
// acquis (des <select>), pas des notes — c'est voulu, et ça se teste à part.
const carte = () => page.locator('div').filter({ hasText: /^Noter toute une classe/ }).last()
const nb = await carte().locator('button').count()
let clsName = '', early = true
for (let i = 0; i < nb; i++) {
  const b = carte().locator('button').nth(i)
  clsName = (await b.innerText()).trim()
  await b.click(); await page.waitForTimeout(800)
  early = await page.locator('input[data-cell]').count() === 0
  if (!early) break
  await page.locator('button:has-text("Tous les élèves")').click(); await page.waitForTimeout(600)
}
ok(!early, `une classe de primaire est ouverte (${clsName})`)

const body = await page.locator('body').innerText()
ok(/Enregistrer la classe/.test(body), `la grille de ${clsName} est ouverte`)
const cells = await page.locator('[data-cell]').count()
const rows = await page.locator('tbody tr').count()
ok(cells > 0 && rows > 0, `grille rendue : ${rows} élèves × ${Math.round(cells / Math.max(rows,1))} colonnes`)

// le bouton d'enregistrement est inactif tant qu'on n'a rien saisi
ok(await page.locator('button:has-text("Enregistrer la classe")').isDisabled(), 'rien saisi : « Enregistrer » est inactif')

// saisir la première colonne pour 3 élèves, au CLAVIER
const first = page.locator('[data-cell="0-0"]')
await first.click(); await first.fill('14'); await page.keyboard.press('Enter')
await page.keyboard.type('16'); await page.keyboard.press('Enter')
await page.keyboard.type('9')
await page.waitForTimeout(400)
const v = await page.evaluate(() => ['0-0','1-0','2-0'].map(k => document.querySelector(`[data-cell="${k}"]`)?.value))
ok(v[0] === '14' && v[1] === '16' && v[2] === '9', `Entrée descend bien la colonne (${v.join(', ')})`)

// moyennes en direct
const txt = await page.locator('tfoot').innerText().catch(() => '')
ok(/13/.test(txt), `la moyenne de la classe se calcule en direct (${txt.split('\n').join(' ').slice(0, 60)})`)

ok(!(await page.locator('button:has-text("Enregistrer la classe")').isDisabled()), 'après saisie : « Enregistrer » est actif')
await page.locator('button:has-text("Enregistrer la classe")').click()
await page.waitForTimeout(1200)
ok(/bulletin\(s\) enregistré|enregistré/i.test(await page.locator('body').innerText()), 'l’enregistrement confirme')

// on rouvre : la saisie est retrouvée
await page.waitForTimeout(600)
// rouvrir LA MÊME classe, pas la première de la liste
await carte().locator(`button:text-is(${JSON.stringify(clsName)})`).first().click()
await page.waitForTimeout(900)
const again = await page.evaluate(() => document.querySelector('[data-cell="0-0"]')?.value)
ok(again === '14', `on reprend où l’on s’est arrêté (${again})`)

ok(errs.length === 0, `aucune exception JS (${errs.length})`)
if (errs.length) console.log(errs.slice(0, 3).join('\n'))
await browser.close(); server.close()
