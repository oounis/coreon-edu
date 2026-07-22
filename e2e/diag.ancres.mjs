// DIAGNOSTIC — DEF-003 : la navigation par ancres de la page d'accueil.
// On clique chaque entrée et on mesure : l'URL change-t-elle ? le scroll bouge-t-il ?
// reste-t-on sur la page d'accueil ? y a-t-il un état actif visible ?
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'

const PORT = 8978
const server = serveDist(PORT)
const browser = await chromium.launch({ executablePath: findChrome() })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage()

await page.goto(`http://localhost:${PORT}/#/`)
await page.waitForTimeout(700)

const ITEMS = ['Deux mondes', 'Modules', 'Vos données', 'Tarifs', 'FAQ']
console.log('\n══ NAVIGATION PAR ANCRES — PAGE D\'ACCUEIL ══\n')

for (const label of ITEMS) {
  await page.goto(`http://localhost:${PORT}/#/`)
  await page.waitForTimeout(400)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)

  const before = await page.evaluate(() => ({ y: window.scrollY, url: location.hash }))
  const link = page.locator(`nav a:has-text("${label}"), nav button:has-text("${label}")`).first()
  const n = await link.count()
  if (!n) { console.log(`${label.padEnd(14)} ✗ lien introuvable`); continue }

  await link.click()
  await page.waitForTimeout(300)
  const mid = await page.evaluate(() => ({ y: window.scrollY, url: location.hash }))
  await page.waitForTimeout(1200)          // laisser ScrollToTop / le routeur agir
  const after = await page.evaluate(() => ({ y: window.scrollY, url: location.hash,
    stillLanding: !!document.querySelector("nav") }))

  const moved = after.y > 40
  const bounced = mid.y > 40 && after.y <= 40
  console.log(
    `${label.padEnd(14)} url:${before.url} → ${after.url.padEnd(16)} ` +
    `scrollY ${String(before.y).padStart(4)} → ${String(mid.y).padStart(5)} (immédiat) → ${String(after.y).padStart(5)} (après 1,5s)  ` +
    (bounced ? '⟵ REVIENT EN HAUT (ScrollToTop annule l\'ancre)' : moved ? 'défile et reste' : '⟵ NE BOUGE PAS') +
    (after.stillLanding ? '' : '  ⟵ A QUITTÉ LA PAGE D\'ACCUEIL')
  )
}

// état actif : y a-t-il une différence visuelle sur l'entrée courante ?
const activeStyling = await page.evaluate(() => {
  const links = [...document.querySelectorAll("nav a, nav button")]
  return links.map(a => ({ txt: a.textContent.trim(), cls: a.className,
    color: getComputedStyle(a).color, weight: getComputedStyle(a).fontWeight }))
})
console.log('\n── état visuel des entrées (toutes identiques = aucun état actif) ──')
activeStyling.forEach(l => console.log(`   ${l.txt.padEnd(14)} color:${l.color}  weight:${l.weight}`))
const distinct = new Set(activeStyling.map(l => l.color + l.weight)).size
console.log(`\nRÉSULTAT : ${distinct === 1 ? 'AUCUN état actif — toutes les entrées sont identiques.' : distinct + ' styles distincts.'}\n`)

await browser.close(); server.close()
