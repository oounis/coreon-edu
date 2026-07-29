// ════════════════════════════════════════════════════════════════════════════
// LES LANGUES, LUES À L'ÉCRAN — pas comptées dans un tableur.
//
// `i18n-audit.py` mesure les clés `t()` couvertes. C'est nécessaire et
// insuffisant : le 2026-07-29 le produit affichait 62 % d'anglais et 100 % de
// dates FRANÇAISES, parce qu'une date n'est pas une clé. Un compteur à 100 %
// peut donc coexister avec un écran bilingue involontaire.
//
// Ce parcours ouvre les DEUX pages les plus lourdes en texte — la vitrine
// publique et le poste de sécurité — dans les deux langues, et exige :
//   1. un marqueur traduit réellement présent ;
//   2. AUCUNE phrase française résiduelle ;
//   3. AUCUNE date en français (mois ni jour) ;
//   4. la direction RTL en arabe.
// ════════════════════════════════════════════════════════════════════════════
import { scenario } from './lib.mjs'

// Les phrases françaises qui ne doivent JAMAIS survivre à un changement de langue.
// Les trois dernières sont des motifs CALCULÉS par le cœur (`securityNeeds`) :
// ils s'affichaient en français au milieu d'un écran arabe, et seule une CAPTURE
// D'ÉCRAN l'a révélé — ni l'audit (ce n'étaient pas des clés `t()`), ni la
// première version de ce parcours ne les regardaient.
// Les phrases françaises qui ne doivent JAMAIS survivre à un changement de langue.
// Trois familles, toutes trouvées LE MÊME SOIR et toutes invisibles à l'audit :
//  · les motifs CALCULÉS par le cœur (`securityNeeds`) — pas des clés `t()` ;
//  · les libellés passés à `t()` PAR VARIABLE (la nav de la vitrine : « Accueil »)
//    — l'audit ne voit que `t('littéral')`, donc ils n'ont jamais été comptés ;
//  · les étiquettes de la MAQUETTE du héros (« 5ème A », « Insuffisant »).
const FRENCH = /Poste de sécurité|Registre des visiteurs|Main courante|Prise de service|De la crèche|Vos données sont à vous|Questions fréquentes|Les modules d’un vrai ERP|Un portail par rôle|Événement en soirée|personnes attendues|Accueil|Activité hors de l’école|5ème A|Mathématiques|Insuffisant/

await scenario(8975, async ({ page, ok, base }) => {
  const setLang = async l => {
    await page.goto(`${base}/#/`)
    await page.evaluate(x => localStorage.setItem('coreon_locale', x), l)
    await page.goto(`${base}/#/`); await page.reload(); await page.waitForTimeout(1500)
  }
  const settle = async () => {
    for (let w = 0; w < 30 && (await page.locator('body').innerText()).trim().length < 60; w++) await page.waitForTimeout(150)
    await page.waitForTimeout(700)
  }

  // ── LA VITRINE ────────────────────────────────────────────────────────────
  for (const [l, marker] of [['en', /under one roof|Try Coreon|Your data belongs to you/], ['ar', /تحت سقف واحد|جرّب كوريون|بياناتك ملكك/]]) {
    await setLang(l)
    await page.goto(`${base}/#/`); await settle()
    const txt = await page.locator('body').innerText()
    ok(marker.test(txt), `vitrine ${l.toUpperCase()} : traduite (marqueur présent)`)
    ok(!FRENCH.test(txt), `vitrine ${l.toUpperCase()} : aucune phrase française résiduelle`)
    if (l === 'ar') ok(await page.evaluate(() => document.documentElement.dir) === 'rtl', 'vitrine AR : direction RTL')
  }

  // ── LE POSTE DE SÉCURITÉ ──────────────────────────────────────────────────
  for (const [l, marker] of [['en', /Visitor register|Day book|Standing orders|Patrols/], ['ar', /سجلّ الزوّار|دفتر المناوبة|التعليمات|الجولات/]]) {
    await setLang(l)
    await page.goto(`${base}/#/login`); await page.evaluate(() => sessionStorage.clear())
    await page.goto(`${base}/#/login`); await page.waitForSelector('input', { timeout: 15000 })
    await page.locator('input').first().fill('securite@alnour.tn')
    await page.locator('input[type=password]').fill('secu')
    await page.keyboard.press('Enter'); await page.waitForTimeout(1500)
    await page.goto(`${base}/#/app/security`); await settle()
    const txt = await page.locator('body').innerText()
    ok(marker.test(txt), `poste de sécurité ${l.toUpperCase()} : traduit`)
    ok(!FRENCH.test(txt), `poste de sécurité ${l.toUpperCase()} : aucune phrase française résiduelle`)
    // la DATE doit suivre le lecteur (le vrai défaut de la soirée)
    ok(!/janvier|février|mars|avril|juin|juillet|août|septembre|octobre|novembre|décembre|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/i.test(txt),
       `poste de sécurité ${l.toUpperCase()} : aucune date en français`)
  }
})
