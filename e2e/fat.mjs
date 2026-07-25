// ════════════════════════════════════════════════════════════════════════════
// FAT — Factory Acceptance Test (ordre d'Othman, 2026-07-26).
// « Clique toi-même sur tout » : l'école passée au BAHREÏN, puis CHAQUE rôle ×
// CHAQUE page autorisée × CHAQUE langue (FR · EN · AR). On relève :
//   · les erreurs JavaScript (pageerror + console.error)
//   · les pages vides / cassées (contenu quasi nul)
//   · les FUITES TUNISIENNES en mode Bahreïn (DT, CIN, gouvernorat, lois,
//     numéros d'urgence, « République Tunisienne »…) avec leur contexte
// Sortie : un rapport JSON (fat-report.json) + un résumé lisible. Code de
// sortie 0 même avec des constats : le FAT constate, le tri décide.
// ════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'
import { ROUTE_ROLES } from '../core/src/access.js'
import { writeFileSync } from 'node:fs'

const PORT = 8990
const server = serveDist(PORT)
const browser = await chromium.launch({ executablePath: findChrome() })
const B = `http://localhost:${PORT}`

const ACCOUNTS = {
  owner: ['owner@kogia.tn', 'owner'],
  schooladmin: ['direction@alnour.tn', 'admin'],
  admin: ['admin@alnour.tn', 'office'],
  hr: ['rh@alnour.tn', 'rh'],
  accountant: ['comptable@alnour.tn', 'compta'],
  teacher: ['enseignant@alnour.tn', 'teacher'],
  supervisor: ['surveillant@alnour.tn', 'super'],
  security: ['securite@alnour.tn', 'secu'],
  parent: ['parent@alnour.tn', 'parent'],
}
const OFF_MODULES = ['/app/homework', '/app/exams', '/app/library', '/app/transport']
const LOCALES = ['fr', 'en', 'ar']

// Fuites produit tunisiennes en configuration Bahreïn. Les DONNÉES de la démo
// (élèves tunisiens, adresse de l'école) sont du contenu, pas du produit — le
// tri se fait au contexte capturé.
const TN_LEAKS = [
  [/\bDT\b/, 'devise DT'],
  [/[0-9]\s?DT\b/, 'montant en DT'],
  [/Gouvernorat/i, 'label Gouvernorat'],
  [/\bCIN\b/, 'label CIN'],
  [/2004-63/, 'loi tunisienne 2004-63'],
  [/République Tunisienne/i, 'en-tête tunisien'],
  [/Protection civile \(198|SAMU \(190|Police secours \(197/, 'urgences tunisiennes'],
  [/selon le cadre tunisien|loi 2009-11/i, 'cadre légal tunisien'],
  [/Tunisienne\b/, 'nationalité par défaut'],
]

const findings = []
const note = (sev, role, loc, route, kind, detail) => {
  findings.push({ sev, role, loc, route, kind, detail: String(detail).slice(0, 220) })
  console.log(`${sev} · ${role}/${loc} ${route} — ${kind}${detail ? ' : ' + String(detail).slice(0, 120).replace(/\n/g, ' ') : ''}`)
}

const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
const page = await ctx.newPage()
let jsErrors = []
page.on('pageerror', e => jsErrors.push(e.message))
page.on('console', m => { if (m.type() === 'error' && !/favicon|net::|404/.test(m.text())) jsErrors.push('console: ' + m.text()) })

// ── 0. L'école passe au BAHREÏN (comme l'a fait Othman) ─────────────────────
// ⚠️ Le pack pays, la devise et la langue se lisent AU DÉMARRAGE (main.jsx) :
// après chaque changement d'état, on RECHARGE — sinon on teste l'ancien boot.
await page.goto(`${B}/#/login`); await page.waitForTimeout(800)
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('coreon_db'))
  d.settings = { ...(d.settings || {}), country: 'BH', currency: 'BHD' }
  localStorage.setItem('coreon_db', JSON.stringify(d))
})

const login = async (email, pw) => {
  await page.goto(`${B}/#/login`); await page.evaluate(() => sessionStorage.clear())
  await page.reload(); await page.waitForSelector('input', { timeout: 8000 })
  await page.locator('input').first().fill(email)
  await page.locator('input[type=password]').fill(pw)
  await page.keyboard.press('Enter'); await page.waitForTimeout(1400)
}

for (const loc of LOCALES) {
  await page.evaluate(l => localStorage.setItem('coreon_locale', l), loc)
  await page.reload(); await page.waitForTimeout(600)   // le boot relit langue + pack
  for (const [role, [email, pw]] of Object.entries(ACCOUNTS)) {
    const routes = Object.entries(ROUTE_ROLES)
      .filter(([r, roles]) => r.startsWith('/app') && roles.includes(role) && !OFF_MODULES.includes(r))
      .map(([r]) => r.replace('/:id', '/s1'))
    await login(email, pw)
    if (!(await page.url()).includes('/app')) { note('BLOQUANT', role, loc, '/login', 'connexion impossible', await page.url()); continue }
    for (const route of routes) {
      jsErrors = []
      await page.goto(`${B}/#${route}`); await page.waitForTimeout(1200)
      const body = await page.locator('body').innerText().catch(() => '')
      for (const err of jsErrors) note('BLOQUANT', role, loc, route, 'erreur JS', err)
      if (body.replace(/\s+/g, ' ').length < 120 && !jsErrors.length)
        note('BLOQUANT', role, loc, route, 'page quasi vide', `${body.length} caractères`)
      if (loc === 'fr') {           // les fuites TN se relèvent une fois (indépendantes de la langue d'UI)
        for (const [re, label] of TN_LEAKS) {
          const m = body.match(re)
          if (m) {
            const i = body.indexOf(m[0])
            note('PAYS', role, loc, route, label, body.slice(Math.max(0, i - 40), i + 60).replace(/\n/g, ' '))
          }
        }
      }
      if (loc === 'en') {           // en anglais : l'écorce doit être anglaise
        if (/Tableau de bord|Se connecter|Rechercher…/.test(body) && route === '/app')
          note('I18N', role, loc, route, 'écorce encore française en EN', '')
      }
    }
  }
}

writeFileSync(new URL('./fat-report.json', import.meta.url), JSON.stringify(findings, null, 1))
const bySev = s => findings.filter(f => f.sev === s).length
console.log(`\n══ FAT terminé : ${findings.length} constats — BLOQUANT ${bySev('BLOQUANT')} · PAYS ${bySev('PAYS')} · I18N ${bySev('I18N')} ══`)
console.log('Rapport : e2e/fat-report.json')
await browser.close(); server.close()
process.exit(0)
