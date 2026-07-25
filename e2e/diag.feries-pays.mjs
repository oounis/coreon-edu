// DIAGNOSTIC — CR-032 : le coin des fêtes suit le PAYS de l'école,
// et les pays du Golfe affichent la date hégirienne (Umm al-Qura, natif Intl).
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'

const PORT = 8997
const server = serveDist(PORT)
const browser = await chromium.launch({ executablePath: findChrome() })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 } })).newPage()
const B = `http://localhost:${PORT}`
const fails = []
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails.push(m) }
page.on('pageerror', e => fails.push('pageerror: ' + e.message))

console.log('\n══ FÉRIÉS PAR PAYS + DATE HÉGIRIENNE (CR-032) ══\n')

const login = async () => {
  await page.goto(`${B}/#/login`); await page.evaluate(() => sessionStorage.clear())
  await page.goto(`${B}/#/login`); await page.waitForSelector('input')
  await page.locator('input').first().fill('direction@alnour.tn')
  await page.locator('input[type=password]').fill('admin')
  await page.keyboard.press('Enter'); await page.waitForTimeout(1600)
}
await login()

// ── Tunisie (défaut) : le coin parle, mais SANS date hégirienne ──────────────
const coin = () => page.locator('[title="Fêtes et journées à venir"]')
ok(await coin().count() > 0, 'le coin des fêtes est dans la barre du haut')
await coin().click(); await page.waitForTimeout(400)
let panneau = await page.locator('[role="menu"]').last().innerText().catch(() => '')
ok(!/1447|1448|هـ/.test(panneau), 'Tunisie : pas de date hégirienne affichée')

// ── Passer l'école au Bahreïn (Réglages → Localisation) ─────────────────────
await page.goto(`${B}/#/app/settings`); await page.waitForTimeout(900)
await page.locator('button:has-text("Localisation")').first().click(); await page.waitForTimeout(500)
const paysSel = page.locator('select').filter({ hasText: /Tunisie|Bahreïn|Qatar|Libye/ }).first()
await paysSel.selectOption({ label: 'Bahreïn' }); await page.waitForTimeout(400)
await page.locator('button:has-text("Enregistrer")').first().click(); await page.waitForTimeout(1200)

// Le pack se lit au chargement (main.jsx) → on recharge.
await page.reload(); await page.waitForTimeout(1500)
await page.goto(`${B}/#/app`); await page.waitForTimeout(1200)

ok(await coin().count() > 0, 'Bahreïn : le coin des fêtes est toujours là')
await coin().click(); await page.waitForTimeout(400)
panneau = await page.locator('[role="menu"]').last().innerText().catch(() => '')
ok(/1447|1448/.test(panneau), 'Bahreïn : la date hégirienne (1447/1448) est affichée')
ok(/Mouled|Fête nationale|Achoura|Aïd/.test(panneau), "Bahreïn : l'agenda porte les fêtes bahreïnies")
ok(!/République|Évacuation/.test(panneau), 'Bahreïn : plus aucun férié purement tunisien')

await browser.close(); server.close()
console.log(fails.length ? `\n✗ ${fails.length} échec(s)` : '\n✓ diagnostic fériés/pays complet')
process.exit(fails.length ? 1 : 0)
