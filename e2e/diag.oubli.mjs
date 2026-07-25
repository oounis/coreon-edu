// DIAGNOSTIC — CR-013 : le parcours « mot de passe oublié » côté navigateur.
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'

const PORT = 8984
const server = serveDist(PORT)
const browser = await chromium.launch({ executablePath: findChrome() })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
const B = `http://localhost:${PORT}`
const errs = []
page.on('pageerror', e => errs.push(e.message))
const ok = (c, m) => console.log((c ? 'PASS' : 'FAIL') + ' — ' + m)

// 1. le lien existe sur la page de connexion
await page.goto(`${B}/#/login`); await page.waitForTimeout(700)
const lien = page.locator('a:has-text("Mot de passe oublié")')
ok(await lien.count() > 0, 'le lien « Mot de passe oublié ? » est présent sur /login')

// 2. il mène à l'écran de demande
await lien.first().click(); await page.waitForTimeout(900)
ok(page.url().includes('mot-de-passe-oublie'), 'il mène à #/mot-de-passe-oublie')
ok(await page.locator('h1:has-text("Mot de passe oublié")').count() > 0, 'l\'écran de demande s\'affiche')

// 3. une adresse invalide est refusée
await page.locator('input[type=email]').fill('pas-une-adresse')
await page.locator('button:has-text("Envoyer le lien")').click(); await page.waitForTimeout(400)
ok(await page.locator('[role=alert]').count() > 0, 'une adresse invalide est refusée avec un message')

// 4. une adresse valide → confirmation NEUTRE (mode démo : pas de serveur)
await page.locator('input[type=email]').fill('direction@alnour.tn')
await page.locator('button:has-text("Envoyer le lien")').click(); await page.waitForTimeout(2500)
const txt = await page.locator('body').innerText()
ok(/Demande enregistrée/i.test(txt), 'confirmation affichée')
ok(/Si un compte existe/i.test(txt), 'la confirmation ne révèle PAS si le compte existe')

// 5. même réponse pour une adresse inconnue
await page.goto(`${B}/#/mot-de-passe-oublie`); await page.reload(); await page.waitForTimeout(900)
await page.locator('input[type=email]').fill('inconnu@nulle-part.tn')
await page.locator('button:has-text("Envoyer le lien")').click(); await page.waitForTimeout(2500)
const txt2 = await page.locator('body').innerText()
ok(/Si un compte existe/i.test(txt2), 'adresse inconnue : réponse identique — aucune fuite')

// 6. l'écran de réinitialisation sans jeton se déclare inutilisable
await page.goto(`${B}/#/reinitialiser`); await page.reload(); await page.waitForTimeout(900)
const t3 = await page.locator('body').innerText()
ok(/Lien inutilisable/i.test(t3), 'sans jeton, l\'écran le dit franchement au lieu d\'un faux formulaire')

// 7. avec un jeton mais en mode démo : idem, honnête
await page.goto(`${B}/#/reinitialiser?token=faux123`); await page.reload(); await page.waitForTimeout(900)
const t4 = await page.locator('body').innerText()
ok(/Lien inutilisable|sans serveur/i.test(t4), 'sans serveur, aucun formulaire trompeur')

// 8. pas d'écran blanc, pas d'exception
ok(errs.length === 0, `aucune exception JS (${errs.length})`)
if (errs.length) console.log(errs.join('\n'))

await browser.close(); server.close()
