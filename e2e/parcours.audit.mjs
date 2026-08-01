// ════════════════════════════════════════════════════════════════════════════
// CR-039 · LE JOURNAL D'AUDIT, PILOTÉ POUR DE VRAI.
//
// Les tests du cœur prouvent que `record()` écrit et que la chaîne détecte une
// falsification. Ils ne prouvent PAS ce qui compte pour l'école : qu'en OUVRANT
// le dossier de santé d'un enfant, la ligne apparaisse ensuite à l'écran de la
// Direction. C'est exactement la leçon du 2026-07-29 (« une page qui CHARGE
// n'est pas une page qui MARCHE ») et du 2026-07-30 (« la seule mesure qui
// résiste : LIRE L'ÉCRAN »).
//
// Le parcours joue donc la scène du contrôleur, de bout en bout :
//   1. la Direction ouvre le dossier de SANTÉ d'un enfant ;
//   2. elle va au journal d'audit ;
//   3. la consultation doit y être, NOMMÉE, avec le nom de l'enfant ;
//   4. le bandeau d'intégrité doit annoncer la chaîne vérifiée ;
//   5. une enseignante ne doit PAS pouvoir ouvrir le journal.
// ════════════════════════════════════════════════════════════════════════════
import { scenario } from './lib.mjs'

await scenario(8997, async ({ page, ok, login, base }) => {
  const text = async () => (await page.locator('body').innerText())
  const settle = async (min = 60) => {
    for (let w = 0; w < 40 && (await text()).trim().length < min; w++) await page.waitForTimeout(150)
    await page.waitForTimeout(400)
  }

  // ── 1. La Direction ouvre le dossier de santé d'un enfant ─────────────────
  await login('direction@alnour.tn', 'admin')
  await page.goto(`${base}/#/app/child`)
  await settle()

  const childName = await page.evaluate(() => {
    const raw = localStorage.getItem('coreon_db')
    if (!raw) return null
    const d = JSON.parse(raw)
    const early = new Set((d.classes || []).filter(c => /nursery|prekg|kg/.test(c.level || '')).map(c => c.id))
    const kid = (d.students || []).find(s => !s.archived && early.has(s.classId))
    return kid ? kid.name : null
  })
  ok(!!childName, `un enfant de petite enfance existe pour la démonstration (${childName})`)

  // L'onglet « Santé & vaccins » : c'est LUI qui doit laisser une trace.
  // Les onglets du produit portent role="tab", pas "button" (ui.jsx/Tabs).
  const santeTab = page.getByRole('tab', { name: /Santé/i }).first()
  ok(await santeTab.count() > 0, 'l’onglet Santé du dossier de l’enfant est là')
  await santeTab.click()
  await page.waitForTimeout(700)

  // ── 2. Le journal d'audit ─────────────────────────────────────────────────
  await page.goto(`${base}/#/app/audit`)
  await settle(120)
  const body = await text()

  ok(!/n’a pas pu se charger|Page introuvable/i.test(body),
    'le journal d’audit s’ouvre (pas d’écran d’erreur, pas de 404)')

  // ── 3. La consultation y EST, avec le nom de l'enfant ─────────────────────
  ok(body.includes(childName),
    `la consultation du dossier de « ${childName} » apparaît au journal`)
  ok(/Consultation/i.test(body), 'la ligne dit qu’il s’agit d’une CONSULTATION')
  ok(/Santé/i.test(body), 'et sur quelle nature de donnée elle portait')

  // La connexion de la Direction elle-même doit s'y trouver : le journal ne
  // commence pas au premier dossier ouvert, il commence à la porte d'entrée.
  await page.locator('select').nth(1).selectOption('compte').catch(() => {})
  await page.waitForTimeout(500)
  ok(/Connexion/i.test(await text()), 'la connexion à l’application est journalisée elle aussi')

  // ── 4. Le bandeau d'intégrité ─────────────────────────────────────────────
  ok(/Cha[îi]ne vérifiée/i.test(body) && !/rompue/i.test(body),
    'le bandeau annonce la chaîne vérifiée — aucune ligne altérée')

  // ── 5. Aucun bouton pour effacer : ce n'est pas un oubli, c'est la règle ──
  const effacer = await page.getByRole('button', { name: /Effacer|Supprimer|Vider|Purger/i }).count()
  ok(effacer === 0, 'le journal n’offre AUCUN moyen d’effacer une ligne')

  // ── 6. Une enseignante ne lit pas le journal qui la surveille ─────────────
  await login('creche@alnour.tn', 'teacher')
  await page.goto(`${base}/#/app/audit`)
  await settle(40)
  const asTeacher = await text()
  ok(!/Cha[îi]ne vérifiée|Nature de la donnée/i.test(asTeacher),
    'une enseignante n’obtient PAS le journal d’audit')
  ok(!asTeacher.includes(childName) || !/Consultation/i.test(asTeacher),
    'et n’en voit aucune ligne')
})
