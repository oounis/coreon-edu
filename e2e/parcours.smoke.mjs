// LE SMOKE : 60 pages × 5 rôles sur le vrai bundle — erreurs JS, pages vides,
// « NaN »/« undefined » visibles. C'est ce parcours qui a trouvé l'écran blanc
// de /app/attendance (clé d'appel coupée au mauvais underscore, 2026-07-15).
import { scenario } from './lib.mjs'
const ROLES = {
  'direction@alnour.tn/admin': ['/app','/app/accounts','/app/admissions','/app/students','/app/teachers','/app/staff','/app/hr','/app/accounting','/app/academic','/app/facilities','/app/child','/app/journal','/app/results','/app/timetable','/app/attendance','/app/finance','/app/events','/app/security','/app/social','/app/incidents','/app/accidents','/app/requests','/app/messages','/app/notices','/app/interop','/app/settings','/app/notifications'],
  // L'Administration ne gère PLUS la RH ni la comptabilité (CR-016/020) : son
  // périmètre est le quotidien — admissions, élèves, documents, journal, présence.
  'admin@alnour.tn/office': ['/app','/app/admissions','/app/students','/app/pointage','/app/documents','/app/journal','/app/attendance','/app/requests'],
  'enseignant@alnour.tn/teacher': ['/app','/app/evaluate','/app/attendance','/app/journal','/app/child','/app/timetable','/app/academic','/app/social','/app/accidents','/app/requests','/app/pointage'],
  'parent@alnour.tn/parent': ['/app','/app/live','/app/journal','/app/payments','/app/timetable','/app/events','/app/social','/app/accidents','/app/notices','/app/notifications'],
  'securite@alnour.tn/secu': ['/app','/app/security','/app/incidents','/app/pointage','/app/events','/app/social'],
}
await scenario(8971, async ({ page, ok, login, base }) => {
  const issues = []
  for (const [cred, routes] of Object.entries(ROLES)) {
    const [email, pw] = cred.split('/')
    await page.evaluate(() => sessionStorage.clear()).catch(()=>{})
    await page.goto(`${base}/#/login`); await page.reload(); await page.waitForSelector('input', { timeout: 15000 })
    await page.locator('input').first().fill(email)
    await page.locator('input[type=password]').fill(pw)
    await page.keyboard.press('Enter'); await page.waitForTimeout(900)
    if (!page.url().includes('#/app')) { issues.push(`${email}: LOGIN FAILED`); continue }
    for (const r of routes) {
      const errs = []
      const h = e => errs.push(e.message.slice(0, 90))
      page.on('pageerror', h)
      // ⚠️ LEÇON DU 2026-07-29 — `pageerror` NE SUFFIT PLUS.
      // Depuis que l'App porte une frontière d'erreur qui se réarme à chaque
      // route (174b068), un plantage de rendu est ATTRAPÉ par React : il ne
      // remonte jamais comme erreur non capturée, et l'écran de repli est un
      // texte LONG qui passe le seuil « page quasi vide ». Deux pages sont
      // ainsi parties en production complètement cassées (/app/accidents et
      // /app/journal appelaient `t()` sans l'importer) sans qu'aucune barrière
      // ne bronche. La frontière journalise `[boundary]` : on l'écoute.
      const boundary = []
      const c = m => { if (m.type() === 'error' && /\[boundary\]|is not defined|ReferenceError/.test(m.text())) boundary.push(m.text().slice(0, 90)) }
      page.on('console', c)
      await page.goto(`${base}/#${r.slice(4) ? r : r}`.replace('/#/app','/#/app'))
      await page.goto(`${base}/#${r}`)
      // On ATTEND le contenu (jusqu'à 3 s) au lieu d'un sommeil fixe : le smoke
      // détecte une page CASSÉE/vide, pas une page lente (la perf a son parcours).
      // Sur une école pleine (120 élèves), une page riche peut peindre en ~1–2 s.
      let txt = ''
      for (let w = 0; w < 30; w++) {
        await page.waitForTimeout(100)
        txt = await page.locator('body').innerText().catch(() => '')
        if (txt.trim().length >= 40) break
      }
      page.off('pageerror', h)
      page.off('console', c)
      const flags = []
      if (errs.length) flags.push('JS:' + errs[0])
      if (boundary.length) flags.push('ÉCRAN D’ERREUR (frontière) : ' + boundary[0])
      // le repli de la frontière porte role=alert : une page de l'app ne doit
      // jamais s'ouvrir dessus.
      if (await page.locator('[role=alert]').count() > 0
          && /n’a pas pu se charger|n'a pas pu se charger/.test(txt)) flags.push('ÉCRAN D’ERREUR affiché')
      if (txt.trim().length < 40) flags.push('PAGE QUASI VIDE')
      if (/\bundefined\b/.test(txt)) flags.push('« undefined » visible')
      if (/\bNaN\b/.test(txt)) flags.push('« NaN » visible')
      if (flags.length) issues.push(`${email.split('@')[0]} ${r} → ${flags.join(' | ')}`)
    }
  }
  console.log('ISSUES:', issues.length ? '\n' + issues.join('\n') : 'aucun')
  ok(issues.length === 0, `parcouru ${Object.values(ROLES).flat().length} pages × rôles — ${issues.length} anomalie(s)`)
})
