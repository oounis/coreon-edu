// PRÉSENCE : chaque chiffre du tableau de bord s'ouvre d'un clic — derrière
// « 3 absents » il y a trois enfants, la direction les voit sans les chercher.
import { scenario } from './lib.mjs'
await scenario(8955, async ({ page, ok, login, base }) => {
  await login('direction@alnour.tn', 'admin')
  await page.goto(`${base}/#/app/attendance`); await page.waitForTimeout(700)
  const body = await page.locator('body').innerText()
  ok(body.includes('Taux de présence'), 'le tableau de bord présence s\'affiche (direction)')

  const modal = () => page.locator('.fixed').last()
  const closeModal = async () => { await page.getByRole('button', { name: 'Fermer' }).click(); await page.waitForTimeout(300) }

  // 1. La tuile « Absents » ouvre la liste des absents du jour
  await page.locator('button:has-text("Absents")').first().click(); await page.waitForTimeout(400)
  let txt = await modal().innerText()
  ok(txt.includes('Absents ·'), 'la tuile Absents ouvre sa fenêtre')
  ok((await modal().locator('[title="Prévenir le parent"]').count()) >= 1, 'chaque absent porte « Prévenir le parent »')
  await closeModal()

  // 2. La tuile « Taux de présence » ouvre le détail par classe du jour
  await page.locator('button:has-text("Taux de présence")').first().click(); await page.waitForTimeout(400)
  txt = await modal().innerText()
  ok(/par classe, ce jour-là/i.test(txt), 'la tuile Taux ouvre la présence par classe du jour')
  ok(/présents/.test(txt) && /%/.test(txt), 'le détail donne les comptes et les taux')
  await closeModal()

  // 3. La tuile « Retards » s'ouvre aussi (même vide : l'état honnête)
  await page.locator('button:has-text("Retards")').first().click(); await page.waitForTimeout(400)
  txt = await modal().innerText()
  ok(txt.includes('Retards ·'), 'la tuile Retards ouvre sa fenêtre')
  await closeModal()

  // 4. « Absences répétées » : la liste à suivre, et le parent se prévient DEPUIS la fenêtre
  await page.locator('button:has-text("Absences répétées")').first().click(); await page.waitForTimeout(400)
  txt = await modal().innerText()
  ok(txt.includes('30 derniers jours'), 'la tuile Absences répétées ouvre sa fenêtre')
  const bells = modal().locator('[title="Prévenir le parent"]')
  if (await bells.count()) {
    await bells.first().click(); await page.waitForTimeout(800)
    ok(/prévenu|compte parent/.test(await page.locator('body').innerText()), 'le parent se prévient depuis la fenêtre (ou l\'absence de compte est dite honnêtement)')
  }
  await closeModal()

  // 5. Une demande s'ouvre d'un clic sur sa ligne (déjà le cas — on le verrouille)
  await page.goto(`${base}/#/app/requests`); await page.waitForTimeout(600)
  const row = page.locator('button:has-text("Détails")').first()
  if (await row.count()) {
    await row.click(); await page.waitForTimeout(400)
    ok((await modal().innerText()).includes('Détail de la demande'), 'une demande s\'ouvre en fenêtre d\'un clic')
  }
})
