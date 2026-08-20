// ════════════════════════════════════════════════════════════════════════════
// LE HARNAIS — « on vérifie en pilotant l'application, pas en la regardant ».
//
// Plusieurs vrais défauts (déduction de paie, numérotation d'avoirs, faux reçu
// du stockage plein, page RH blanche) n'ont été attrapés QU'EN CONDUISANT le
// navigateur. Ces scripts sont cette conduite, écrite : chaque parcours est un
// scénario de bout en bout sur le VRAI bundle (app/dist), pas sur un mock.
//
// Usage :  cd e2e && npm i   (une fois)
//          npm run build --prefix ../app   (le harnais teste dist/, pas src/)
//          node parcours.public.mjs        (ou .demandes / .arabe)
// ════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core'
import http from 'node:http'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../app/dist', import.meta.url))
// CodeQL js/path-injection (2026-08-14) : req.url pilotait directement le chemin
// lu sur disque. Serveur local, usage E2E seulement — mais confiner au dossier
// servi coûte trois lignes et ferme le traversal (`..%2f..`, etc.) proprement.
const dansDist = p => { const r = resolve(p); return r === DIST || r.startsWith(DIST + sep) }
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }

/** Trouver un Chromium : $CHROME_PATH, sinon le cache Playwright, sinon le système. */
export function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH
  const cache = join(process.env.HOME || '', '.cache/ms-playwright')
  if (existsSync(cache)) {
    for (const d of readdirSync(cache).sort().reverse()) {
      for (const rel of ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/chrome']) {
        const p = join(cache, d, rel)
        if (existsSync(p)) return p
      }
    }
  }
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) if (existsSync(p)) return p
  throw new Error('Aucun Chromium trouvé. Installez-en un :  npx playwright@1.61 install chromium-headless-shell  — ou exportez CHROME_PATH.')
}

/** Servir app/dist en local. Toute route inconnue retombe sur index.html (SPA). */
export function serveDist(port) {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('app/dist est vide — lancez d’abord :  npm run build --prefix ../app')
  return http.createServer((req, res) => {
    let p = join(DIST, req.url.split('?')[0])
    if (req.url === '/' || !dansDist(p) || !existsSync(p)) p = join(DIST, 'index.html')
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'text/html' })
    res.end(readFileSync(p))
  }).listen(port)
}

/** Un scénario : navigateur + serveur + compteur d'échecs + sortie propre. */
export async function scenario(port, run) {
  const server = serveDist(port)
  const browser = await chromium.launch({ executablePath: findChrome() })
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
  const fails = []
  const ok = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + msg); if (!cond) fails.push(msg) }
  page.on('pageerror', e => fails.push('pageerror: ' + e.message))
  const login = async (email, pw) => {
    await page.goto(`http://localhost:${port}/#/login`)
    await page.evaluate(() => sessionStorage.clear())
    await page.goto(`http://localhost:${port}/#/login`)
    await page.locator('input').first().fill(email)
    await page.locator('input[type=password]').fill(pw)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(900)
  }
  try { await run({ page, ok, login, base: `http://localhost:${port}` }) }
  finally { await browser.close(); server.close() }
  console.log(fails.length ? `\n${fails.length} ÉCHEC(S)` : '\nTOUT PASSE')
  process.exit(fails.length ? 1 : 0)
}
