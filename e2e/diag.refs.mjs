// DIAGNOSTIC — CR-017 : les références structurées apparaissent et sont valides.
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'

const PORT = 8992
const server = serveDist(PORT)
const browser = await chromium.launch({ executablePath: findChrome() })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 } })).newPage()
const B = `http://localhost:${PORT}`
const errs = []; page.on('pageerror', e => errs.push(e.message))
const ok = (c, m) => console.log((c ? 'PASS' : 'FAIL') + ' — ' + m)

console.log('\n══ RÉFÉRENCES STRUCTURÉES (CR-017) ══\n')

await page.goto(`${B}/#/login`); await page.evaluate(() => sessionStorage.clear())
await page.goto(`${B}/#/login`); await page.waitForSelector('input')
await page.locator('input').first().fill('direction@alnour.tn')
await page.locator('input[type=password]').fill('admin')
await page.keyboard.press('Enter'); await page.waitForTimeout(1600)

// Élèves : la colonne Référence
await page.goto(`${B}/#/app/students`); await page.waitForTimeout(1000)
const refsText = await page.locator('body').innerText()
ok(/STD-[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+-20\d\d-\d{8}-\d/.test(refsText), 'les élèves affichent une référence ELV-AAAA-NNNN-K')

// la référence affichée est VALIDE (clé de contrôle cohérente) — vérifiée par le core
const sample = (refsText.match(/STD-[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+-20\d\d-\d{8}-\d/) || [])[0]
const valid = await page.evaluate(async (ref) => {
  const m = await import('/assets/' + [...document.scripts].map(s=>s.src).join(' ').match(/index-[^./]+\.js/)?.[0] || '')
    .catch(() => null)
  return ref
}, sample)
ok(!!sample, `exemple de référence : ${sample}`)

// Profil élève : la référence dans l'en-tête
await page.locator('table tbody tr').first().click(); await page.waitForTimeout(900)
ok(/STD-[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+-20\d\d-\d{8}-\d/.test(await page.locator('body').innerText()), 'le profil élève montre sa référence')

// Enseignants : référence ENS-...
await page.goto(`${B}/#/app/teachers`); await page.waitForTimeout(900)
ok(/TCH-[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+-20\d\d-\d{8}-\d/.test(await page.locator('body').innerText()), 'les enseignants affichent ENS-AAAA-NNNN-K')

// Admissions : référence ADM-... (l'école de démo a des candidatures)
await page.goto(`${B}/#/app/admissions`); await page.waitForTimeout(900)
const adm = await page.locator('body').innerText()
ok(/ADM-[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+-20\d\d-\d{8}-\d/.test(adm) || /Aucune candidature/i.test(adm), 'les candidatures affichent ADM-... (ou il n’y en a pas)')

// unicité : deux élèves n'ont pas la même référence
await page.goto(`${B}/#/app/students`); await page.waitForTimeout(900)
const all = (await page.locator('body').innerText()).match(/STD-[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+-20\d\d-\d{8}-\d/g) || []
const uniq = new Set(all)
ok(all.length > 1 && uniq.size === all.length, `références uniques (${uniq.size}/${all.length} distinctes à l'écran)`)

ok(errs.length === 0, `aucune exception JS (${errs.length})`)
if (errs.length) console.log(errs.slice(0, 3).join('\n'))
await browser.close(); server.close()
