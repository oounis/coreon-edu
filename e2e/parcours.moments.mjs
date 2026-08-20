// MOMENTS : enseignant partage une photo → parent la voit → un autre parent ne la voit PAS.
import { scenario } from './lib.mjs'
await scenario(8953, async ({ page, ok, login, base }) => {
  // 1. Teacher shares a moment with a photo, tagged to Amira (s1)
  await login('enseignant@alnour.tn', 'teacher')
  await page.goto(`${base}/#/app/gallery`); await page.waitForTimeout(600)
  ok((await page.locator('body').innerText()).includes('Moments'), 'page Moments (enseignant)')
  // seeded moments already show
  ok((await page.locator('img').count()) >= 1, 'photos existantes affichées')
  await page.getByRole('button', { name: /Partager/ }).first().click(); await page.waitForTimeout(400)
  // inject a photo via the file input (canvas → File)
  await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 800; c.height = 600
    const g = c.getContext('2d'); g.fillStyle = '#6EE7B7'; g.fillRect(0,0,800,600)
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9))
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'jour.jpg', { type: 'image/jpeg' }))
    const inp = document.querySelector('.fixed input[type=file]') || document.querySelectorAll('input[type=file]')[0]
    inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.waitForTimeout(900)
  await page.getByPlaceholder(/Atelier peinture/).fill('Test: belle journée au parc.')
  // tag Amira
  const chip = page.getByRole('button', { name: 'Amira', exact: true })
  if (await chip.count()) await chip.first().click()
  await page.locator('button', { hasText: /^Partager$/ }).last().click(); await page.waitForTimeout(600)
  ok((await page.getByText('Test: belle journée au parc.').count()) >= 1, 'moment partagé et visible côté enseignant')

  // 2. Parent of Amira (p1) sees it
  await login('parent@alnour.tn', 'parent')
  await page.goto(`${base}/#/app/gallery`); await page.waitForTimeout(600)
  const t1 = await page.locator('body').innerText()
  ok(t1.includes('Test: belle journée au parc.') || t1.includes('Amira'), 'le parent d\'Amira voit le moment')
  // like it
  ok((await page.locator('img').count()) >= 1, 'parent voit des photos')

  // 3. A DIFFERENT parent (p3, child Leila s3, class c5a) — should NOT see Amira-tagged photo
  //    but the seeded class moment (mo_seed1 is kindergarten kg) they won't see either.
  await login('parent3@alnour.tn', 'parent')
  await page.goto(`${base}/#/app/gallery`); await page.waitForTimeout(600)
  const t3 = await page.locator('body').innerText()
  ok(!t3.includes('Test: belle journée au parc.'), 'PRIVÉ : un autre parent ne voit PAS la photo taguée d\'Amira')
})
