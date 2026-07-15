// GESTION : les quatre modules du guichet — documents officiels, budget,
// inventaire, recrutement. On conduit chaque parcours de bout en bout.
import { scenario } from './lib.mjs'
await scenario(8959, async ({ page, ok, login, base }) => {
  await login('direction@alnour.tn', 'admin')
  const modal = () => page.locator('.fixed').last()

  // 1. DOCUMENTS : délivrer un certificat → numéro de série + registre
  await page.goto(`${base}/#/app/documents`); await page.waitForTimeout(700)
  ok((await page.locator('body').innerText()).includes('Documents officiels'), 'le guichet des documents s\'ouvre')
  await page.locator('select').first().selectOption({ index: 1 }); await page.waitForTimeout(200)
  await page.getByRole('button', { name: /Délivrer & inscrire/ }).click(); await page.waitForTimeout(600)
  let txt = await modal().innerText()
  ok(/CS-\d{4}-\d{4}/.test(txt), 'le certificat porte un numéro de série CS-année-0001')
  ok(txt.includes('Cachet & signature'), 'l\'aperçu est un document officiel')
  await page.getByRole('button', { name: 'Fermer' }).click(); await page.waitForTimeout(300)
  txt = await page.locator('body').innerText()
  ok(/CS-\d{4}-\d{4}/.test(txt), 'le registre garde la trace')

  // 2. BUDGET : inscrire une dépense → le rapport bouge, les tuiles s'ouvrent
  await page.goto(`${base}/#/app/budget`); await page.waitForTimeout(700)
  ok((await page.locator('body').innerText()).includes('Budget & rapports'), 'le budget s\'ouvre')
  await page.getByRole('button', { name: /Dépense/ }).first().click(); await page.waitForTimeout(400)
  await page.getByPlaceholder(/Ramettes/).fill('Peinture atelier')
  await page.locator('.fixed input[type=number]').fill('75')
  await page.getByRole('button', { name: 'Inscrire' }).click(); await page.waitForTimeout(500)
  ok((await page.locator('body').innerText()).includes('75'), 'la dépense entre dans le mois')
  await page.locator('button.card.k-press').nth(2).click(); await page.waitForTimeout(400)
  txt = await modal().innerText()
  ok(txt.includes('Peinture atelier'), 'la tuile Dépenses ouvre la liste — la dépense y est')
  await page.getByRole('button', { name: 'Fermer' }).click(); await page.waitForTimeout(300)

  // 3. INVENTAIRE : un article sous le seuil → l'alerte, et le stock jamais négatif
  await page.goto(`${base}/#/app/inventory`); await page.waitForTimeout(700)
  await page.getByRole('button', { name: /Ajouter un article/ }).click(); await page.waitForTimeout(400)
  await page.getByPlaceholder(/Feutres, couches/).fill('Couches T4')
  const nums = page.locator('.fixed input[type=number]')
  await nums.nth(0).fill('2'); await nums.nth(1).fill('5')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click(); await page.waitForTimeout(500)
  txt = await page.locator('body').innerText()
  ok(txt.includes('Couches T4'), 'l\'article est inscrit')
  ok(/sous le seuil|à racheter/i.test(txt), 'le stock bas déclenche l\'alerte')

  // 4. RECRUTEMENT : poste → candidature → l'offre est IMPOSSIBLE sans entretien
  await page.goto(`${base}/#/app/recruit`); await page.waitForTimeout(700)
  await page.getByRole('button', { name: /Ouvrir un poste/ }).click(); await page.waitForTimeout(400)
  await page.getByPlaceholder(/Éducatrice petite enfance/).fill('Éducatrice crèche')
  await page.getByRole('button', { name: 'Ouvrir', exact: true }).click(); await page.waitForTimeout(500)
  await page.getByRole('button', { name: /Candidature/ }).first().click(); await page.waitForTimeout(400)
  await page.locator('.fixed input').first().fill('Mariem Testeuse')
  await page.getByRole('button', { name: 'Enregistrer' }).click(); await page.waitForTimeout(500)
  await page.getByRole('button', { name: /Mariem/ }).click(); await page.waitForTimeout(400)
  txt = await modal().innerText()
  ok(txt.includes('Reçue'), 'la candidature est au stade Reçue')
  ok(!(await modal().getByRole('button', { name: 'Offre faite' }).count()), 'PAS de bouton Offre sans entretien')
  await modal().getByRole('button', { name: 'Entretien' }).click(); await page.waitForTimeout(500)
  ok((await page.locator('body').innerText()).includes('Entretien'), 'la candidature avance à l\'entretien')
})
