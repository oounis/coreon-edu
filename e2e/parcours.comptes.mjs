// COMPTES : l'« Active Directory » de l'école — la Direction crée, modifie,
// change les rôles ; et l'école ne peut JAMAIS se verrouiller dehors.
import { scenario } from './lib.mjs'
await scenario(8962, async ({ page, ok, login, base }) => {
  await login('direction@alnour.tn', 'admin')
  await page.goto(`${base}/#/app/accounts`); await page.waitForTimeout(700)
  let txt = await page.locator('body').innerText()
  ok(/\d+ comptes/.test(txt), "l'annuaire annonce son total d'un coup d'œil")

  // 1. Créer un compte Sécurité (rôle jusque-là impossible à créer)
  await page.getByRole('button', { name: /Créer un compte/ }).click(); await page.waitForTimeout(400)
  await page.locator('.fixed select').first().selectOption('security')
  const inputs = page.locator('.fixed input')
  await inputs.nth(0).fill('Gardien Test')
  await inputs.nth(1).fill('gardien.test@alnour.tn')
  await page.getByRole('button', { name: 'Créer le compte' }).click(); await page.waitForTimeout(600)
  ok((await page.locator('body').innerText()).includes('Gardien Test'), 'le compte Sécurité est créé et listé')

  // 2. Un e-mail = un compte
  await page.getByRole('button', { name: /Créer un compte/ }).click(); await page.waitForTimeout(400)
  const in2 = page.locator('.fixed input')
  await in2.nth(0).fill('Doublon Test')
  await in2.nth(1).fill('gardien.test@alnour.tn')
  await page.getByRole('button', { name: 'Créer le compte' }).click(); await page.waitForTimeout(500)
  ok((await page.locator('body').innerText()).includes('déjà un compte'), 'e-mail déjà pris → refus dit clairement')
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)

  // 3. Modifier : promouvoir le gardien en surveillant
  await page.getByRole('button', { name: /Gardien Test/ }).click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Modifier/ }).click(); await page.waitForTimeout(400)
  await page.locator('.fixed select').first().selectOption('supervisor')
  await page.getByRole('button', { name: 'Enregistrer' }).click(); await page.waitForTimeout(500)
  ok((await page.locator('body').innerText()).includes('mis à jour'), 'le rôle se change depuis la fiche')
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)

  // 4. L'école ne se verrouille jamais dehors : désactiver la dernière Direction → refus
  await page.getByRole('button', { name: /Lina Aderra/ }).first().click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Désactiver/ }).click(); await page.waitForTimeout(500)
  ok((await page.locator('body').innerText()).includes('verrouillerait'), 'la dernière Direction active est INTOUCHABLE')
})
