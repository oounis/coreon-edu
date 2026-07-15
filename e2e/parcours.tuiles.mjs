// TUILES : sur TOUT le produit, chaque chiffre d'un tableau de bord s'ouvre.
// On balaie chaque module, on clique chaque tuile, on exige une fenêtre.
import { scenario } from './lib.mjs'
await scenario(8956, async ({ page, ok, login, base }) => {
  // [connexion, page, libellé, action préalable éventuelle]
  const SWEEP = [
    { user: ['direction@alnour.tn', 'admin'], path: '/app/attendance', label: 'Présence' },
    { user: ['direction@alnour.tn', 'admin'], path: '/app/finance', label: 'Frais & Finances' },
    { user: ['direction@alnour.tn', 'admin'], path: '/app/staff', label: 'Personnel' },
    { user: ['direction@alnour.tn', 'admin'], path: '/app/results', label: 'Suivi élèves',
      pre: async () => { await page.getByRole('tab', { name: 'Année' }).click(); await page.waitForTimeout(400) } },
    { user: ['direction@alnour.tn', 'admin'], path: '/app/social', label: 'Espaces' },
    { user: ['direction@alnour.tn', 'admin'], path: '/app/budget', label: 'Budget & rapports' },
    { user: ['securite@alnour.tn', 'secu'], path: '/app/security', label: 'Poste de sécurité' },
    { user: ['enseignant@alnour.tn', 'teacher'], path: '/app/pointage', label: 'Mon pointage' },
    { user: ['owner@kogia.tn', 'owner'], path: '/app/schools', label: 'Écoles clientes' },
  ]
  let logged = ''
  for (const step of SWEEP) {
    if (logged !== step.user[0]) { await login(...step.user); logged = step.user[0] }
    await page.goto(`${base}/#${step.path}`); await page.waitForTimeout(700)
    if (step.pre) await step.pre()
    const tiles = page.locator('button.card.k-press')
    const n = await tiles.count()
    let opened = 0
    for (let i = 0; i < n; i++) {
      await tiles.nth(i).click(); await page.waitForTimeout(400)
      if (await page.locator('[role=dialog]').count()) {
        opened++
        await page.keyboard.press('Escape'); await page.waitForTimeout(300)
      }
    }
    ok(n > 0 && opened === n, `${step.label} : ${opened}/${n} tuiles ouvrent leur fenêtre`)
  }
})
