import { chromium } from 'playwright-core'
import { findChrome } from './lib.mjs'
const BASE = 'https://edu.kogiagroup.com'
const browser = await chromium.launch({ executablePath: findChrome() })
const p = await (await browser.newContext()).newPage()
await p.goto(BASE + '/#/login', { waitUntil: 'networkidle' })
await p.evaluate(() => sessionStorage.clear())
await p.goto(BASE + '/#/login'); await p.waitForTimeout(700)
await p.locator('input').first().fill('rh@alnour.tn')
await p.locator('input[type=password]').fill('rh')
await p.keyboard.press('Enter'); await p.waitForTimeout(2200)
await p.goto(BASE + '/#/app/hr'); await p.waitForTimeout(1800)
console.log('URL:', p.url())
const t = await p.evaluate(() => document.body.innerText)
console.log('PAGE TEXT (700 chars):\n', t.slice(0, 700))
const tabs = await p.locator('[role=tab], button').allInnerTexts()
console.log('\nBUTTONS/TABS:', tabs.filter(x=>x.trim()).slice(0,20).join(' | '))
