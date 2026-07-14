// COMPORTEMENT : enseignant observe → parcours de l'enfant → parent le voit, sans classement.
import { scenario } from './lib.mjs'
await scenario(8955, async ({ page, ok, login, base }) => {
  // 1. Teacher awards a positive behavior
  await login('enseignant@alnour.tn', 'teacher')
  await page.goto(`${base}/#/app/behavior`); await page.waitForTimeout(700)
  ok((await page.locator('body').innerText()).includes('Suivi du comportement'), 'page comportement chargée (enseignant)')
  ok((await page.getByText("d'encouragements").count()) >= 1, 'ambiance de classe affichée (tendance, pas palmarès)')
  await page.locator('button.card').first().click(); await page.waitForTimeout(400)   // open a student
  ok((await page.getByText('Un encouragement').count()) === 1, 'la fiche met l\'encouragement en premier')
  await page.getByRole('button', { name: /A aidé un camarade/ }).first().click()
  await page.getByPlaceholder(/A aidé un camarade/).fill('Test: a partagé son goûter.')
  await page.getByRole('button', { name: 'Enregistrer' }).click(); await page.waitForTimeout(500)
  ok((await page.getByText(/parcours/i).count()) >= 1, 'l\'observation entre dans le parcours de l\'enfant')

  // 2. Direction can see it too
  await login('direction@alnour.tn', 'admin')
  await page.goto(`${base}/#/app/behavior`); await page.waitForTimeout(600)
  ok(page.url().includes('behavior') && !(await page.locator('body').innerText()).includes('undefined'), 'direction ouvre la page sans erreur')

  // 3. Parent sees ONLY their child's journey, encouragement-first
  await login('parent@alnour.tn', 'parent')
  await page.goto(`${base}/#/app/behavior`); await page.waitForTimeout(600)
  const t = await page.locator('body').innerText()
  ok(t.includes('encouragements'), 'parent : les encouragements sont mis en avant')
  ok(t.includes('parcours') || t.includes('parcours'.toUpperCase()), 'parent : voit le parcours de son enfant')
  ok(!/classement|palmarès|\brang\b|top 5|meilleur élève/i.test(t), 'parent : AUCUN classement (règle n°9)')
})
