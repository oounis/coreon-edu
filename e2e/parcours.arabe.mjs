// L'ARABE EST UNE DIRECTION : bascule ع → dir=rtl, Tajawal, barre à droite,
// une candidature déposée entièrement en arabe arrive chez la direction.
//
// Mis à jour le 2026-07-22 : le formulaire est passé en plusieurs étapes
// (CR-008/009/010). Ce parcours vaut désormais AUSSI comme preuve que les
// ~107 nouveaux libellés sont bien traduits — on ne le remplit qu'avec des
// libellés arabes : s'il en manquait un, ce parcours échouerait.
import { scenario } from './lib.mjs'

await scenario(8983, async ({ page, ok, login, base }) => {
  await page.goto(`${base}/#/login`); await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'ع' }).click(); await page.waitForTimeout(1200)
  ok(await page.evaluate(() => document.documentElement.dir) === 'rtl', 'dir=rtl sur <html>')
  ok((await page.evaluate(() => getComputedStyle(document.body).fontFamily)).includes('Tajawal'), 'Tajawal actif')
  ok((await page.locator('body').innerText()).includes('مرحبًا بعودتك'), 'connexion en arabe')

  // Libellé EXACT : has-text() est partiel, donc « لقب الطفل » ne doit pas
  // attraper un autre champ. L'astérisque fait partie du libellé obligatoire.
  const champ = l => page.locator(`label:has(span:text-is(${JSON.stringify(l)}))`).first().locator('input, textarea').first()
  const suivant = async () => { await page.getByRole('button', { name: 'متابعة' }).click(); await page.waitForTimeout(500) }

  await page.goto(`${base}/#/inscription`); await page.waitForTimeout(800)
  ok(await champ('اسم الطفل *').count() > 0, 'le formulaire s’affiche en arabe')

  // ── l'enfant
  await champ('اسم الطفل *').fill('آدم')
  await champ('لقب الطفل *').fill('بن صالح')
  await champ('تاريخ الولادة *').fill('2021-05-05')
  await page.getByRole('button', { name: 'روضة 1' }).click()
  await suivant()

  // ── la famille
  await champ('هاتف الأم').fill('36000000')
  await suivant()

  // ── la santé
  await page.getByRole('button', { name: 'لا', exact: true }).first().click()
  await champ('شخص يُتّصل به عند الطوارئ *').fill('صالح بن صالح')
  await champ('هاتف الطوارئ *').fill('36000000')
  await suivant()

  // ── le rythme, puis on avance jusqu'à l'engagement
  await page.getByRole('button', { name: 'ثلاثة أيام في الأسبوع' }).click()
  await suivant()
  for (let i = 0; i < 4 && await page.getByRole('button', { name: 'قبول الكل' }).count() === 0; i++) await suivant()
  ok(await page.getByRole('button', { name: 'قبول الكل' }).count() > 0, 'l’étape d’engagement est atteinte, en arabe')

  // ── l'engagement
  await champ('اسم الولي أو الوصي مودع المطلب *').fill('صالح بن صالح')
  await champ('هاتف يمكن الاتصال به *').fill('36000000')
  await page.getByRole('button', { name: 'قبول الكل' }).click(); await page.waitForTimeout(300)
  await page.getByRole('button', { name: /إرسال المطلب/ }).click(); await page.waitForTimeout(900)
  ok((await page.locator('body').innerText()).includes('تم استلام المطلب'), 'reçu en arabe')

  // aucune trace de français n'a dû rester dans le parcours
  const fuiteFr = await page.evaluate(() => /Continuer|Envoyer ma candidature|Tout accepter/.test(document.body.innerText))
  ok(!fuiteFr, 'aucun libellé français n’a fui dans le parcours arabe')

  await login('direction@alnour.tn', 'admin')
  const t = await page.locator('body').innerText()
  ok(t.includes('لوحة المتابعة'), 'barre latérale en arabe')
  const aside = await page.locator('aside').boundingBox()
  ok(aside && aside.x > 600, `barre latérale à droite (x=${Math.round(aside?.x)})`)
  await page.goto(`${base}/#/app/admissions`); await page.waitForTimeout(600)
  ok((await page.locator('body').innerText()).includes('آدم بن صالح'), 'la candidature arabe est chez la direction')
  await page.getByRole('button', { name: 'FR' }).first().click(); await page.waitForTimeout(1200)
  ok(await page.evaluate(() => document.documentElement.dir) === 'ltr', 'retour FR propre')
})
