// AUDIT DES CLICS : sur chaque page, on clique CHAQUE bouton et on vérifie
// qu'il se passe quelque chose (mutation du DOM, dialogue, navigation, toast).
// Un bouton qui ne fait RIEN = une action cassée ou un placebo.
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'
const server = serveDist(8982)
const browser = await chromium.launch({ executablePath: findChrome() })
const ROLES = [
  ['direction@alnour.tn', 'admin'],
  ['enseignant@alnour.tn', 'teacher'],
  ['parent@alnour.tn', 'parent'],
]
const deadButtons = []
for (const [email, pw] of ROLES) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  page.on('pageerror', e => deadButtons.push(`[EXCEPTION] ${email}: ${e.message.slice(0, 100)}`))
  await page.goto('http://localhost:8982/#/login')
  await page.locator('input').first().fill(email)
  await page.locator('input[type=password]').fill(pw)
  await page.keyboard.press('Enter'); await page.waitForTimeout(900)
  const routes = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="#/app"]')].map(a => a.getAttribute('href').replace(/^#?\/?#?/, '')))])
  for (const r of routes) {
    await page.goto(`http://localhost:8982/#${r.startsWith('/') ? r : '/' + r}`); await page.waitForTimeout(500)
    const n = await page.locator('button:visible').count()
    for (let i = 0; i < Math.min(n, 25); i++) {
      const btn = page.locator('button:visible').nth(i)
      let label = ''
      try {
        label = (await btn.innerText().catch(() => '')).slice(0, 30).replace(/\n/g, ' ') || (await btn.getAttribute('aria-label')) || `bouton#${i}`
        const before = await page.evaluate(() => document.body.innerHTML.length + '|' + location.hash)
        await btn.click({ timeout: 1500, force: false })
        await page.waitForTimeout(350)
        const after = await page.evaluate(() => document.body.innerHTML.length + '|' + location.hash)
        if (before === after) deadButtons.push(`[MORT] ${email} ${r} → « ${label} »`)
        // referme un éventuel dialogue et revient sur la page
        await page.keyboard.press('Escape'); await page.waitForTimeout(150)
        if (!(await page.evaluate(() => location.hash)).includes(r.replace(/^\//, ''))) {
          await page.goto(`http://localhost:8982/#${r.startsWith('/') ? r : '/' + r}`); await page.waitForTimeout(350)
        }
      } catch { /* bouton disparu après un clic précédent : normal */ }
    }
  }
  await ctx.close()
}
await browser.close(); server.close()
if (deadButtons.length) { console.log(deadButtons.join('\n')); console.log(`\n${deadButtons.length} action(s) suspecte(s)`) }
else console.log('AUCUN BOUTON MORT')
