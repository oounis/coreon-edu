// DIAGNOSTIC — CR-008/009/010 : le formulaire de pré-inscription à étapes.
// On le REMPLIT vraiment, pour une crèche puis pour un primaire, et l'on
// vérifie que les questions diffèrent et que le dossier arrive complet.
import { chromium } from 'playwright-core'
import { findChrome, serveDist } from './lib.mjs'

const PORT = 8985
const server = serveDist(PORT)
const browser = await chromium.launch({ executablePath: findChrome() })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } })
const page = await ctx.newPage()
const B = `http://localhost:${PORT}`
const errs = []
page.on('pageerror', e => errs.push(e.message))
const ok = (c, m) => console.log((c ? 'PASS' : 'FAIL') + ' — ' + m)

const open = async () => { await page.goto(`${B}/#/inscription`); await page.reload(); await page.waitForTimeout(900) }
// Field rend <label><span>libellé</span><div><input/></div></label>.
// ATTENTION : has-text() est une correspondance PARTIELLE et insensible à la
// casse — « Nom de l'enfant » matche aussi « PréNOM DE L'ENFANT ». On exige
// donc le libellé EXACT (astérisque comprise pour les champs obligatoires).
const fill = async (label, val) => {
  const l = page.locator(`label:has(span:text-is(${JSON.stringify(label)}))`).first()
  if (!await l.count()) { console.log(`   (libellé introuvable : ${label})`); return false }
  await l.locator('input, textarea').first().fill(val)
  return true
}
// Le titre de l'ÉTAPE COURANTE — pas la barre d'étapes, qui contient tous les
// titres et faisait passer les vérifications à tort.
const stepTitle = async () => (await page.locator('h2').first().innerText()).trim()
const stepBody = async () => (await page.locator('h2').first().locator('xpath=ancestor::*[contains(@class,"card")][1]').innerText())
const chip = async txt => { const b = page.locator(`button:has-text("${txt}")`).first(); if (await b.count()) { await b.click(); return true } return false }
const cont = async () => { await page.locator('button:has-text("Continuer")').first().click(); await page.waitForTimeout(600) }
const bodyText = () => page.locator('body').innerText()

console.log('\n══ PRÉ-INSCRIPTION À ÉTAPES ══\n')

// ── 1. la première étape et la barre d'étapes existent
await open()
let txt = await bodyText()
ok(/enfant/i.test(await stepTitle()), `étape 1 affichée (${await stepTitle()})`)
ok(/Étape 1 \/ \d/.test(txt), 'le compteur d’étapes est affiché')

// ── 2. on ne passe pas sans les champs obligatoires
await cont()
ok((await page.locator('[role=alert]').count()) > 0 || /nécessaire/i.test(await bodyText()), 'étape 1 vide : on est bloqué avec un message')

// ── 3. parcours CRÈCHE
await open()
await fill('Prénom de l’enfant *', 'Yasmine')
await fill('Nom de l’enfant *', 'Ben Salah')
await fill('Date de naissance *', '2024-03-15')
const creche = await chip('Crèche')
ok(creche, 'le niveau « Crèche » est proposé')
await cont()
ok(/famille/i.test(await stepTitle()), `étape 2 atteinte (${await stepTitle()})`)

await fill('Téléphone de la mère', '+216 20 111 222')
await cont()
ok(/santé/i.test(await stepTitle()), `étape 3 atteinte (${await stepTitle()})`)

// le détail n'apparaît QUE si on répond oui
await chip('Oui')
await page.waitForTimeout(400)
ok(/décrivez/i.test(await bodyText()), 'répondre « Oui » fait apparaître le champ de description')
await chip('Non'); await page.waitForTimeout(400)
ok(!/décrivez/i.test(await bodyText()), 'répondre « Non » le fait disparaître')

await fill('Personne à prévenir en urgence *', 'Leïla Ben Salah')
await fill('Téléphone d’urgence *', '+216 20 333 444')
await cont()
ok(/rythme/i.test(await stepTitle()), `étape « Le rythme » atteinte (${await stepTitle()})`)
txt = await stepBody()
ok(/sieste/i.test(txt), 'la crèche voit bien les questions de SIESTE')
ok(!/précédente/i.test(txt), 'la crèche ne voit PAS « école précédente »')

// ── 4. parcours PRIMAIRE : les questions changent
await open()
await fill('Prénom de l’enfant *', 'Adam')
await fill('Nom de l’enfant *', 'Trabelsi')
await fill('Date de naissance *', '2016-09-01')
const prim = await chip('5ème année')
ok(prim, 'le niveau « 5ème année » est proposé')
await cont()
await fill('Téléphone du père', '+216 20 555 666')
await cont()
await fill('Personne à prévenir en urgence *', 'Sonia Trabelsi')
await fill('Téléphone d’urgence *', '+216 20 777 888')
await chip('Non')
await cont()
ok(/parcours/i.test(await stepTitle()), `étape « Le parcours » atteinte (${await stepTitle()})`)
txt = await stepBody()
ok(/précédente/i.test(txt), 'le primaire voit bien « école précédente »')
ok(!/sieste/i.test(txt), 'le primaire ne voit PAS la sieste')

// ── 5. engagements obligatoires
await cont()                       // pièces
await cont()                       // engagement
ok(/engagement/i.test(await stepTitle()), `étape « Engagement » atteinte (${await stepTitle()})`)
const cases = await page.locator('input[type=checkbox]').count()
ok(cases >= 5, `${cases} engagements présentés (frais, préavis, santé, changements, données)`)

await fill('Nom du parent ou tuteur qui dépose *', 'Sonia Trabelsi')
await fill('Téléphone joignable *', '+216 20 777 888')
await page.locator('button:has-text("Envoyer ma candidature")').first().click()
await page.waitForTimeout(800)
ok(/conditions/i.test(await bodyText()), 'envoyer sans accepter les conditions : refusé')

await page.locator('button:has-text("Tout accepter")').first().click()
await page.waitForTimeout(400)
await page.locator('button:has-text("Envoyer ma candidature")').first().click()
await page.waitForTimeout(2000)
txt = await bodyText()
ok(/Candidature reçue/i.test(txt), 'candidature acceptée')
ok(/référence/i.test(txt), 'une référence est rendue au parent')

// ── 6. le dossier détaillé est bien PERSISTÉ
const stored = await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('coreon_db') || '{}')
  const a = (d.applications || [])[0]
  return a ? { childName: a.childName, fatherPhone: a.fatherPhone, emergencyPhone: a.emergencyPhone,
               prevSchoolKey: 'prevSchool' in a, terms: (a.acceptedTerms || []).length, at: !!a.acceptedAt } : null
})
ok(!!stored, 'la candidature est enregistrée')
ok(stored?.childName === 'Adam Trabelsi', `nom complet reconstruit (${stored?.childName})`)
ok(!!stored?.fatherPhone, 'le téléphone du père est conservé')
ok(!!stored?.emergencyPhone, 'le contact d’urgence est conservé')
ok((stored?.terms || 0) >= 5, `les ${stored?.terms} engagements acceptés sont conservés`)
ok(stored?.at, 'avec leur date')

ok(errs.length === 0, `aucune exception JS (${errs.length})`)
if (errs.length) console.log(errs.slice(0, 3).join('\n'))
await browser.close(); server.close()
