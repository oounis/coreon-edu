import { scenario } from './lib.mjs'
await scenario(8979, async ({ page, ok, base }) => {
  const errs=[]
  page.on('console', m=>{ if(m.type()==='error') errs.push(m.text()) })
  page.on('pageerror', e=>errs.push('PAGEERROR '+e.stack))
  await page.goto(`${base}/#/login`); await page.evaluate(()=>sessionStorage.clear())
  await page.goto(`${base}/#/login`); await page.waitForSelector('input',{timeout:15000})
  await page.locator('input').first().fill('admin@alnour.tn')
  await page.locator('input[type=password]').fill('office')
  await page.keyboard.press('Enter'); await page.waitForTimeout(1500)
  await page.goto(`${base}/#/app/documents`); await page.waitForTimeout(3000)
  console.log('--- ERREURS ---'); errs.slice(0,3).forEach(e=>console.log(e.slice(0,700)))
  ok(true,'debug')
})
