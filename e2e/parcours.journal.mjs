// ════════════════════════════════════════════════════════════════════════════
// LE JOURNAL DU JOUR — la boucle quotidienne de la crèche, verrouillée.
//
// POURQUOI CE PARCOURS EXISTE (2026-07-29). Deux pannes sont parties EN
// PRODUCTION dans la même page sans qu'aucune barrière ne bronche :
//   1. `t()` appelé sans être importé → la page du parent ET celle de
//      l'éducatrice s'ouvraient sur l'écran d'erreur. Invisible au smoke :
//      la frontière d'erreur ATTRAPE le plantage (pas d'erreur non capturée)
//      et son écran de repli est un texte long (pas de « page vide »).
//   2. La fenêtre de confirmation d'envoi avait été posée dans ParentJournal
//      alors qu'elle lit `confirmSend`/`send` de TeacherJournal. Conséquence
//      SILENCIEUSE : l'éducatrice cliquait « Envoyer la journée », l'état se
//      posait, aucune fenêtre ne s'ouvrait — la journée ne partait JAMAIS.
//
// La leçon : une page qui CHARGE n'est pas une page qui MARCHE. Le smoke
// vérifie qu'elle s'ouvre ; ce parcours vérifie que la boucle métier se boucle
// — l'éducatrice envoie, le parent reçoit.
// ════════════════════════════════════════════════════════════════════════════
import { scenario } from './lib.mjs'

const settle = async page => {
  for (let w = 0; w < 30 && (await page.locator('body').innerText()).trim().length < 60; w++)
    await page.waitForTimeout(150)
  await page.waitForTimeout(700)
}
const login = async (page, base, email, pw) => {
  await page.goto(`${base}/#/login`); await page.evaluate(() => sessionStorage.clear())
  await page.goto(`${base}/#/login`); await page.waitForSelector('input', { timeout: 15000 })
  await page.locator('input').first().fill(email)
  await page.locator('input[type=password]').fill(pw)
  await page.keyboard.press('Enter'); await page.waitForTimeout(1200)
  return page.url().includes('#/app')
}
const noErrorScreen = async page => {
  const txt = await page.locator('body').innerText()
  return !/n’a pas pu se charger|n'a pas pu se charger/.test(txt)
}

await scenario(8974, async ({ page, ok, base }) => {
  // ── L'ÉDUCATRICE ──────────────────────────────────────────────────────────
  ok(await login(page, base, 'creche@alnour.tn', 'teacher'), 'l’éducatrice de crèche se connecte')
  await page.goto(`${base}/#/app/journal`); await settle(page)
  ok(await noErrorScreen(page), 'le journal de l’éducatrice s’ouvre (pas l’écran d’erreur)')

  const btn = page.getByRole('button', { name: /Envoyer la journée/i }).first()
  ok(await btn.count() > 0, 'le bouton « Envoyer la journée » est proposé')

  await btn.click(); await page.waitForTimeout(800)
  ok(/Envoyer la journée \?|Les parents recevront la journée/.test(await page.locator('body').innerText()),
     'la fenêtre de confirmation S’OUVRE (règle QA : l’envoi se confirme)')

  await page.getByRole('button', { name: /^Envoyer$/ }).first().click()
  await page.waitForTimeout(1000)
  ok(/Envoyé à|Journée envoyée aux parents/.test(await page.locator('body').innerText()),
     'la journée est effectivement ENVOYÉE — la boucle se boucle')

  // ── LE PARENT ─────────────────────────────────────────────────────────────
  ok(await login(page, base, 'parent@alnour.tn', 'parent'), 'le parent se connecte')
  await page.goto(`${base}/#/app/journal`); await settle(page)
  ok(await noErrorScreen(page), 'la journée de mon enfant s’ouvre chez le parent (pas l’écran d’erreur)')
  const ptxt = await page.locator('body').innerText()
  ok(/journée est en cours|Repas|Sieste|Change|Envoyé à/.test(ptxt),
     'le parent voit un contenu de journée réel')
})
