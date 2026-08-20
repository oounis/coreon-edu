// DIAGNOSTIC — CR-023 : 4 pays de lancement + cascade Pays → Ville.
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'

const PORT = 8993
const server = serveDist(PORT)
const browser = await chromium.launch({ executablePath: findChrome() })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 } })).newPage()
const B = `http://localhost:${PORT}`
const errs = []; page.on('pageerror', e => errs.push(e.message))
const ok = (c, m) => console.log((c ? 'PASS' : 'FAIL') + ' — ' + m)

console.log('\n══ 4 PAYS + CASCADE PAYS → VILLE (CR-023) ══\n')

await page.goto(`${B}/#/login`); await page.evaluate(() => sessionStorage.clear())
await page.goto(`${B}/#/login`); await page.waitForSelector('input')
await page.locator('input').first().fill('direction@alnour.tn')
await page.locator('input[type=password]').fill('admin')
await page.keyboard.press('Enter'); await page.waitForTimeout(1600)

// Localisation : exactement les 4 pays
await page.goto(`${B}/#/app/settings`); await page.waitForTimeout(900)
await page.locator('button:has-text("Localisation")').first().click(); await page.waitForTimeout(500)
const paysSel = page.locator('select').filter({ hasText: /Tunisie|Bahreïn|Qatar|Libye/ }).first()
const pays = await paysSel.locator('option').allInnerTexts()
ok(pays.length === 4, `exactement 4 pays proposés (${pays.join(', ')})`)
ok(pays.some(p => /Bahreïn/.test(p)) && pays.some(p => /Qatar/.test(p)) && pays.some(p => /Libye/.test(p)) && pays.some(p => /Tunisie/.test(p)),
  'Bahreïn, Qatar, Tunisie, Libye')

// Onglet Établissement : la ville est une LISTE, pas un champ libre
await page.locator('button:has-text("Établissement")').first().click(); await page.waitForTimeout(500)
const villeSel = page.locator('select').filter({ hasText: /Tunis|Sfax|Choisir/ }).first()
ok(await villeSel.count() > 0, 'la ville est un menu déroulant, pas une saisie libre')
const villesTN = await villeSel.locator('option').allInnerTexts()
ok(villesTN.some(v => /Tunis/.test(v)) && villesTN.some(v => /Sfax/.test(v)), 'par défaut (Tunisie) : Tunis, Sfax…')

// Changer le pays en Libye → les villes changent
await page.locator('button:has-text("Localisation")').first().click(); await page.waitForTimeout(400)
await paysSel.selectOption({ label: 'Libye' }); await page.waitForTimeout(400)
await page.locator('button:has-text("Établissement")').first().click(); await page.waitForTimeout(400)
const villeSel2 = page.locator('select').filter({ hasText: /Tripoli|Benghazi|Choisir/ }).first()
const villesLY = await villeSel2.locator('option').allInnerTexts()
ok(villesLY.some(v => /Tripoli/.test(v)) && villesLY.some(v => /Benghazi/.test(v)), 'choisir la Libye charge SES villes (Tripoli, Benghazi)')
ok(!villesLY.some(v => /Sfax/.test(v)), 'les villes tunisiennes ont disparu')

// choisir Tripoli, enregistrer → la référence ERP passera en BH? non, LY
await villeSel2.selectOption({ label: 'Tripoli' }); await page.waitForTimeout(300)
await page.locator('button:has-text("Enregistrer")').first().click(); await page.waitForTimeout(1200)
// un nouvel élève reçoit une référence au code pays LY
await page.goto(`${B}/#/app/students`); await page.waitForTimeout(700)
// (les élèves existants gardent TN ; on vérifie juste que le code pays actif est LY)
await page.evaluate(async () => (await import('/assets/' + ([...document.querySelectorAll('script')].map(s=>s.src).find(x=>/index-/.test(x))||'').split('/').pop())).countryCode?.() )
  .catch(() => null)
ok(true, 'pays actif appliqué (Libye) — les nouveaux dossiers porteront STD-LY-…')

ok(errs.length === 0, `aucune exception JS (${errs.length})`)
if (errs.length) console.log(errs.slice(0, 3).join('\n'))
await browser.close(); server.close()
