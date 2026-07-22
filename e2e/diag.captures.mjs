// PREUVES VISUELLES des correctifs QA du 2026-07-22.
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'
import { mkdirSync } from 'node:fs'

const PORT = 8979, OUT = '/tmp/qa-shots'
mkdirSync(OUT, { recursive: true })
const server = serveDist(PORT)
const browser = await chromium.launch({ executablePath: findChrome() })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const B = `http://localhost:${PORT}`

// 1. Landing — état actif du menu (on défile jusqu'à « Modules »)
await page.goto(`${B}/#/`); await page.waitForTimeout(800)
await page.locator('nav button:has-text("Modules")').first().click()
await page.waitForTimeout(1400)
await page.screenshot({ path: `${OUT}/1-landing-menu-actif.png`, clip: { x: 0, y: 0, width: 1440, height: 130 } })

// 2. Login sur téléphone — plus de débordement
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(`${B}/#/login`); await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/2-login-telephone.png` })

// 3. Pré-inscription en grand — formulaire élargi
await page.setViewportSize({ width: 1440, height: 900 })
await page.goto(`${B}/#/inscription`); await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/3-inscription-large.png` })

// 4 + 5. Tableau de bord admin — titre Coreon Intelligence + chip météo
await page.goto(`${B}/#/login`); await page.evaluate(() => sessionStorage.clear())
await page.goto(`${B}/#/login`); await page.waitForSelector('input')
await page.locator('input').first().fill('admin@alnour.tn')
await page.locator('input[type=password]').fill('office')
await page.keyboard.press('Enter'); await page.waitForTimeout(1600)
await page.screenshot({ path: `${OUT}/4-header-meteo.png`, clip: { x: 0, y: 0, width: 1440, height: 96 } })

const intel = page.locator('h2:has-text("Coreon Intelligence")').first()
if (await intel.count()) {
  await intel.scrollIntoViewIfNeeded(); await page.waitForTimeout(600)
  const box = await intel.boundingBox()
  await page.screenshot({ path: `${OUT}/5-intelligence-aligne.png`,
    clip: { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 16), width: 700, height: 60 } })
  console.log('titre Coreon Intelligence capturé')
} else console.log('titre Coreon Intelligence ABSENT de ce tableau de bord')

console.log('captures →', OUT)
await browser.close(); server.close()
