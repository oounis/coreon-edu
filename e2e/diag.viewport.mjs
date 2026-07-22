// DIAGNOSTIC — reproduire DEF-001 : « la page ne rentre pas dans le navigateur ».
// On mesure le débordement HORIZONTAL et VERTICAL des pages publiques à
// plusieurs tailles d'écran réelles, et on nomme l'élément fautif.
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'

const PORT = 8977
const VIEWPORTS = [
  ['ordinateur portable 13"', 1280, 720],
  ['ordinateur 15"', 1440, 810],
  ['grand écran', 1920, 1080],
  ['petit portable', 1366, 640],
  ['tablette', 820, 1180],
  ['téléphone', 390, 844],
]
const PAGES = [['/', 'Landing'], ['/login', 'Login'], ['/inscription', 'Pré-inscription']]

const server = serveDist(PORT)
const browser = await chromium.launch({ executablePath: findChrome() })
const ctx = await browser.newContext()
const page = await ctx.newPage()

const rows = []
for (const [route, name] of PAGES) {
  for (const [label, w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h })
    await page.goto(`http://localhost:${PORT}/#${route}`)
    await page.waitForTimeout(500)
    const m = await page.evaluate(() => {
      const de = document.documentElement
      const hOver = de.scrollWidth - de.clientWidth
      const vOver = de.scrollHeight - de.clientHeight
      // qui dépasse à droite ?
      const culprits = []
      const limit = de.clientWidth
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) return
        if (r.right > limit + 2 || r.left < -2) {
          culprits.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.getAttribute('class') || '').slice(0, 70),
            left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
          })
        }
      })
      return { hOver, vOver, culprits: culprits.slice(0, 6) }
    })
    rows.push({ name, label, w, h, ...m })
  }
}

console.log('\n══ DÉBORDEMENT DES PAGES PUBLIQUES ══\n')
let bad = 0
for (const r of rows) {
  const flagH = r.hOver > 2 ? `⟵ DÉBORDE de ${r.hOver}px` : ''
  const flagV = r.vOver > 2 ? `(hauteur : +${r.vOver}px de scroll)` : ''
  if (r.hOver > 2) bad++
  console.log(`${r.name.padEnd(16)} ${r.label.padEnd(24)} ${String(r.w).padStart(4)}×${r.h}  H:${String(r.hOver).padStart(5)}  V:${String(r.vOver).padStart(5)}  ${flagH} ${flagV}`)
  if (r.hOver > 2) for (const c of r.culprits) console.log(`      ↳ <${c.tag} class="${c.cls}"> left=${c.left} right=${c.right} w=${c.w}`)
}
console.log(`\nRÉSULTAT : ${bad} configuration(s) débordent horizontalement sur ${rows.length} testées.\n`)

await browser.close(); server.close()
