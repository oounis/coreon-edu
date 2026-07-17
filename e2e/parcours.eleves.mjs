// ÉLÈVES : la table d'ERP (tri, recherche, CSV, sélection groupée) et la
// FICHE ÉLÈVE 360° — les deux écrans qui font passer le produit d'« app »
// à « ERP ». On conduit, on ne suppose pas.
import { scenario } from './lib.mjs'
await scenario(8986, async ({ page, ok, login, base }) => {
  await login('direction@alnour.tn', 'admin')
  await page.goto(`${base}/#/app/students`); await page.waitForTimeout(800)

  // 1. La table existe : en-têtes, lignes, pagination
  const headers = await page.locator('thead th').allInnerTexts()
  ok(headers.some(h => /Élève/i.test(h)) && headers.some(h => /Présence/i.test(h)) && headers.some(h => /Impayés/i.test(h)),
    'la table porte les colonnes du métier (élève, présence, impayés)')
  ok((await page.locator('tbody tr').count()) >= 10, 'le répertoire liste les élèves (pagination)')

  // 2. Le TRI fonctionne : cliquer « Élève » inverse l'ordre
  const first = await page.locator('tbody tr').first().innerText()
  await page.locator('thead th', { hasText: 'Élève' }).click(); await page.waitForTimeout(300)
  await page.locator('thead th', { hasText: 'Élève' }).click(); await page.waitForTimeout(300)
  const firstDesc = await page.locator('tbody tr').first().innerText()
  ok(first !== firstDesc, 'le tri par colonne inverse réellement l\'ordre')

  // 3. La RECHERCHE filtre
  await page.getByPlaceholder(/Rechercher un élève/).fill('Amira'); await page.waitForTimeout(400)
  ok((await page.locator('tbody tr').count()) < 5 && (await page.locator('tbody').innerText()).includes('Amira'),
    'la recherche réduit la table au bon résultat')
  await page.getByPlaceholder(/Rechercher un élève/).fill(''); await page.waitForTimeout(300)

  // 4. L'export CSV télécharge un vrai fichier
  const dl = page.waitForEvent('download', { timeout: 10000 })
  await page.getByRole('button', { name: /CSV/ }).click()
  const file = await dl
  ok((file.suggestedFilename() || '').includes('eleves'), 'l\'export CSV part avec le bon nom')

  // 5. Le filtre par cycle réduit la liste
  await page.locator('select[aria-label="Filtrer par cycle"]').selectOption('Petite enfance'); await page.waitForTimeout(400)
  const petits = await page.locator('tbody tr').count()
  ok(petits > 0 && petits < 15, `le filtre cycle réduit la table (${petits} lignes petite enfance)`)
  await page.locator('select[aria-label="Filtrer par cycle"]').selectOption('all'); await page.waitForTimeout(300)

  // 6. Une ligne mène à la FICHE ÉLÈVE 360°
  await page.getByPlaceholder(/Rechercher un élève/).fill('Amira'); await page.waitForTimeout(400)
  await page.locator('tbody tr').first().click(); await page.waitForTimeout(900)
  const t = await page.locator('body').innerText()
  ok(t.includes('Amira Ben Salah'), 'la fiche porte le nom de l\'élève')
  for (const sec of ['Famille & contact', 'Présence', 'Résultats', 'Paiements', 'Santé & sécurité', 'Comportement'])
    ok(t.includes(sec), `la fiche a sa section « ${sec} »`)
  ok(t.includes('Allergie'), 'l\'allergie est affichée en bandeau — la sécurité d\'abord')
  ok(t.includes('Prévenir le parent'), 'les actions de la fiche sont là')

  // 7. Le bouton « Prévenir le parent » agit vraiment
  await page.getByRole('button', { name: /Prévenir le parent/ }).click(); await page.waitForTimeout(500)
  ok((await page.locator('body').innerText()).includes('prévenu'), 'le parent est prévenu depuis la fiche')
})
