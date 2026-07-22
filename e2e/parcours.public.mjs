// LE PARCOURS PUBLIC : un parent dépose une candidature avec une photo lourde →
// la photo est compressée, le dossier PERSISTE, le reçu dit vrai — et la
// direction la retrouve dans Inscriptions ET dans « À décider ».
// (C'est le parcours qui a perdu deux vraies candidatures le 2026-07-14.)
//
// Mis à jour le 2026-07-22 : le formulaire est passé EN PLUSIEURS ÉTAPES,
// guidées par le niveau (CR-008/009/010). Ce que ce parcours prouve n'a pas
// changé d'un pouce — compression, persistance, reçu honnête, arrivée chez la
// direction — seule la façon de le remplir a changé.
import { scenario } from './lib.mjs'

await scenario(8981, async ({ page, ok, login, base }) => {
  // Libellé EXACT : has-text() est partiel et insensible à la casse, donc
  // « Nom de l'enfant » matcherait aussi « PréNOM de l'enfant ».
  const champ = label => page.locator(`label:has(span:text-is(${JSON.stringify(label)}))`).first().locator('input, textarea').first()
  const suivant = async () => { await page.getByRole('button', { name: 'Continuer' }).click(); await page.waitForTimeout(500) }

  await page.goto(`${base}/#/inscription`)
  await page.waitForTimeout(600)

  // ── 1. l'enfant (le niveau décide de la suite)
  await champ('Prénom de l’enfant *').fill('Hammouda')
  await champ('Nom de l’enfant *').fill('Test')
  await champ('Date de naissance *').fill('2021-03-10')
  await page.getByRole('button', { name: 'Maternelle 1', exact: true }).click()
  await suivant()

  // ── 2. la famille (un contact suffit)
  await champ('Téléphone de la mère').fill('30359449')
  await suivant()

  // ── 3. la santé
  await page.getByRole('button', { name: 'Non', exact: true }).first().click()
  await champ('Personne à prévenir en urgence *').fill('Othman Ounis')
  await champ('Téléphone d’urgence *').fill('30359449')
  await suivant()

  // ── 4. le rythme (la maternelle a AUSSI une étape « parcours » : on avance
  //       jusqu'à l'étape des pièces au lieu de compter les étapes, pour que ce
  //       parcours survive à l'ajout d'une étape)
  await page.getByRole('button', { name: '3 jours par semaine', exact: true }).click()
  await suivant()
  for (let i = 0; i < 4 && await page.locator('input[type=file]').count() === 0; i++) await suivant()
  ok(await page.locator('input[type=file]').count() > 0, 'l’étape des pièces est atteinte')

  // ── 5. les pièces : LA « photo de téléphone » de ~2 Mo
  await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 3000; c.height = 2000
    const g = c.getContext('2d')
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgb(${Math.random()*255|0},${Math.random()*255|0},${Math.random()*255|0})`; g.fillRect(Math.random()*3000, Math.random()*2000, 60, 60) }
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.99))
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'acte.jpg', { type: 'image/jpeg' }))
    const input = document.querySelectorAll('input[type=file]')[0]
    input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.waitForTimeout(1400)
  await suivant()

  // ── 6. l'engagement : les conditions sont OBLIGATOIRES (CR-009)
  await champ('Nom du parent ou tuteur qui dépose *').fill('Othman Ounis')
  await champ('Téléphone joignable *').fill('30359449')
  await page.getByRole('button', { name: /Envoyer ma candidature/ }).click()
  await page.waitForTimeout(500)
  ok(await page.getByText('Candidature reçue.').count() === 0, 'sans accepter les conditions, rien ne part')

  await page.getByRole('button', { name: 'Tout accepter' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Envoyer ma candidature/ }).click()
  await page.waitForTimeout(900)

  ok(await page.getByText('Candidature reçue.').count() === 1, 'reçu affiché')
  const p = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('coreon_db'))
    const a = d?.applications?.find(x => x.childName === 'Hammouda Test')
    return a ? { stage: a.stage, files: a.files.length, size: (a.files[0]?.data || '').length,
                 terms: (a.acceptedTerms || []).length, at: !!a.acceptedAt,
                 urgence: a.emergencyPhone, rythme: a.rythme } : null
  })
  ok(p && p.stage === 'nouvelle' && p.files === 1, `candidature persistée avec sa pièce (${JSON.stringify(p)})`)
  ok(p && p.size > 0 && p.size < 1_200_000, 'photo compressée avant stockage')
  ok(p && p.terms >= 5 && p.at, 'les engagements acceptés sont conservés, avec leur date')
  ok(p && p.urgence && p.rythme, 'le dossier détaillé (urgence, rythme) est arrivé complet')

  await login('direction@alnour.tn', 'admin')
  ok(page.url().includes('#/app'), 'connexion direction')
  ok(await page.getByText('À décider').count() >= 1, 'l’atelier est là')
  ok(await page.getByText(/candidature(s)? reçue(s)? à ouvrir/).count() >= 1, 'la décision « à ouvrir » est allumée')
  await page.goto(`${base}/#/app/admissions`); await page.waitForTimeout(600)
  ok(await page.getByText('Hammouda Test').count() >= 1, 'la candidature est chez la direction')
})
