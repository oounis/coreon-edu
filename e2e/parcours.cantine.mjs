// CANTINE : l'alerte allergie protège l'enfant — la direction la voit AVANT le
// service, le parent la lit en clair sur le menu de SON enfant.
import { scenario } from './lib.mjs'
await scenario(8954, async ({ page, ok, login, base }) => {
  // 1. Direction : le menu de la semaine + l'ALERTE ALLERGIE calculée
  await login('direction@alnour.tn', 'admin')
  await page.goto(`${base}/#/app/canteen`); await page.waitForTimeout(600)
  let txt = await page.locator('body').innerText()
  ok(txt.includes('Cantine'), 'page Cantine (direction)')
  ok(/\d+ alertes? allergie cette semaine/.test(txt), 'la bannière annonce les alertes de la semaine')
  ok(txt.includes('À NE PAS SERVIR À'), 'l\'alerte « À NE PAS SERVIR À » est affichée')
  ok(txt.includes('Amira') && txt.includes('Arachides'), 'Amira (arachides) est signalée — le plat aux cacahuètes du lundi')
  ok(txt.includes('Adam'), 'Adam (lait de vache) est signalé — le yaourt du lundi')

  // 2. Modifier un jour : ajouter un plat avec allergène, il apparaît sur la carte
  await page.locator('button:has-text("Modifier")').first().click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Ajouter un plat/ }).click()
  await page.getByPlaceholder('Nom du plat').last().fill('Gâteau aux noisettes')
  await page.locator('.fixed button:has-text("Fruits à coque")').last().click()
  await page.getByRole('button', { name: 'Enregistrer' }).click(); await page.waitForTimeout(500)
  txt = await page.locator('body').innerText()
  ok(txt.includes('Gâteau aux noisettes'), 'le plat ajouté apparaît sur la carte du jour')

  // 3. Les inscrits : la pastille ⚠ marque les enfants à allergie connue
  await page.locator('button:has-text("Inscrits")').first().click(); await page.waitForTimeout(400)
  txt = await page.locator('.fixed').last().innerText()
  ok(txt.includes('Enfants inscrits à la cantine'), 'la gestion des inscrits s\'ouvre')
  ok(txt.includes('Amira'), 'les enfants sont listés par classe')
  await page.getByRole('button', { name: 'Terminé' }).click(); await page.waitForTimeout(300)

  // 4. Parent d'Amira ET d'Adam (le cas d'affaires : deux cycles, un toit) :
  //    le menu de chaque enfant porte SES alertes, en clair.
  await login('parent@alnour.tn', 'parent')
  await page.goto(`${base}/#/app/canteen`); await page.waitForTimeout(600)
  txt = await page.locator('body').innerText()
  ok(txt.includes('Le menu de la semaine de Amira'), 'le parent voit le menu de son enfant')
  ok(txt.includes('Attention') && txt.includes('Arachides'), 'l\'alerte arachides d\'Amira est écrite en clair')
  ok(txt.includes('L\'école le sait.'), 'le parent est rassuré : l\'école le sait')
  // passer à Adam — ses alertes à lui (lait), pas celles d'Amira
  await page.locator('select').selectOption('s29'); await page.waitForTimeout(500)
  txt = await page.locator('body').innerText()
  ok(txt.includes('Le menu de la semaine de Adam'), 'le parent bascule sur son second enfant')
  ok(txt.includes('Lait'), 'les alertes d\'Adam (lait) sont affichées')
  ok(!txt.includes('Arachides ('), 'les alertes d\'Amira ne fuient pas sur le menu d\'Adam')
})
