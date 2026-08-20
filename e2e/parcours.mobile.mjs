// SMOKE MOBILE — le filet de sécurité qui manquait. On exporte le VRAI bundle
// mobile (react-native-web) et on le conduit comme un téléphone (390×844) pour
// trois rôles : la connexion, les onglets, et chaque écran du menu « Plus ».
// Aucune exception tolérée. Ce parcours entre dans `npm run all` et la CI.
import { chromium } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'
import { findChrome, fichierServi } from './lib.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const MOBILE = join(HERE, '../mobile')
const OUT = mkdtempSync(join(tmpdir(), 'coreon-m-web-'))

// 1) Exporter le bundle web du mobile (échoue le parcours si le mobile ne compile plus)
console.log('Export du bundle mobile (react-native-web)…')
execFileSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', OUT], { cwd: MOBILE, stdio: 'ignore' })

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png' }
// CodeQL js/path-injection : même garde que e2e/lib.mjs (`fichierServi`).
const server = http.createServer((req, res) => {
  const p = fichierServi(OUT, req.url)
  res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' })
  res.end(readFileSync(p))
}).listen(8975)

const browser = await chromium.launch({ executablePath: findChrome() })
const fails = []
const ok = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + msg); if (!cond) fails.push(msg) }

const ROLES = [
  ['parent@alnour.tn', 'parent', 'parent'],
  ['enseignant@alnour.tn', 'teacher', 'enseignant'],
  ['direction@alnour.tn', 'admin', 'direction'],
]

try {
  for (const [email, pw, label] of ROLES) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    const exceptions = []
    page.on('pageerror', e => exceptions.push(e.message.slice(0, 120)))
    await page.goto('http://localhost:8975/'); await page.waitForTimeout(2200)
    // connexion
    const inputs = page.locator('input')
    await inputs.nth(0).fill(email); await inputs.nth(1).fill(pw)
    await page.getByText('Se connecter', { exact: true }).click(); await page.waitForTimeout(1800)
    ok((await page.locator('body').innerText()).includes('Bonjour'), `${label} : la connexion mène au tableau de bord`)

    // le menu « Plus » liste tout le menu du rôle → on visite chaque entrée
    await page.getByText('Plus', { exact: true }).last().click(); await page.waitForTimeout(900)
    const entries = await page.evaluate(() => {
      const t = [...document.querySelectorAll('div,span')].map(e => e.textContent?.trim()).filter(Boolean)
      return [...new Set(t)]
    })
    const MENU = entries.filter(t => t.length > 4 && t.length < 40 && !['Se déconnecter', 'Tableau de bord', 'Suivi en direct'].includes(t)).slice(0, 12)
    let visited = 0
    for (const item of MENU) {
      try {
        const el = page.getByText(item, { exact: true }).first()
        if (!(await el.count())) continue
        await el.click(); await page.waitForTimeout(650); visited++
        // rouvrir le menu si un onglet « Plus » existe encore
        const more = page.getByText('Plus', { exact: true }).last()
        if (await more.count()) { await more.click(); await page.waitForTimeout(450) }
      } catch { /* entrée non navigable */ }
    }
    ok(visited >= 4, `${label} : ${visited} écrans du menu visités`)
    ok(exceptions.length === 0, `${label} : zéro exception (${exceptions[0] || 'RAS'})`)
    await ctx.close()
  }
} finally {
  await browser.close(); server.close(); rmSync(OUT, { recursive: true, force: true })
}
console.log(fails.length ? `\n${fails.length} ÉCHEC(S)` : '\nTOUT PASSE')
process.exit(fails.length ? 1 : 0)
