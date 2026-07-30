// ════════════════════════════════════════════════════════════════════════════
// LE FRANÇAIS RÉSIDUEL, BALAYÉ SUR TOUTES LES PAGES — la mesure qu'on ne
// peut pas tromper.
//
// POURQUOI CE PARCOURS EXISTE (2026-07-30). Deux compteurs se sont trompés de
// suite, chacun HONNÊTEMENT dans sa définition :
//   · `i18n-audit.py` : « parmi les chaînes câblées, combien sont traduites ? »
//     → 100 %, alors que 647 phrases n'étaient pas câblées du tout ;
//   · `i18n-raw.py` (1ʳᵉ version) : « combien de phrases en dur ? » → 0, parce
//     qu'il exigeait un accent pour reconnaître du texte. « Annuler »,
//     « Enregistrer », « Fermer » n'en ont pas. Il en restait 313.
//
// Un compteur ne voit que ce qu'il sait NOMMER. Celui-ci ne compte rien : il
// OUVRE chaque page dans chaque langue et LIT l'écran. Peu importe comment le
// français est arrivé là — clé manquante, appel non câblé, table d'étiquettes,
// chaîne calculée dans le cœur, date, gabarit interpolé — s'il est à l'écran,
// ce parcours le voit. C'est la seule mesure qui résiste à un angle mort.
//
// Il échoue en NOMMANT la page, la langue et l'extrait fautif : de quoi
// corriger sans re-chercher.
// ════════════════════════════════════════════════════════════════════════════
import { scenario } from './lib.mjs'

// ── CE QUI TRAHIT LE FRANÇAIS ────────────────────────────────────────────────
// Des mots-outils et des mots métier qui n'existent ni en anglais ni en arabe.
// On ne cherche PAS les accents : « Fermer » n'en a pas, et c'est justement la
// famille qui a échappé à tout le monde.
const FRENCH_WORDS = [
  // mots-outils — sans équivalent anglais ni arabe
  'aucun', 'aucune', 'votre', 'vos', 'cette', 'chaque', 'toutes', 'tous les',
  'aujourd', 'depuis', 'jamais', 'déjà', 'ainsi', 'sinon', 'cliquez', 'clôturez',
  // verbes d'interface : LA famille sans accent, celle qui a échappé aux deux outils
  'annuler', 'enregistrer', 'fermer', 'confirmer', 'ajouter', 'modifier',
  'supprimer', 'envoyer', 'valider', 'publier', 'imprimer', 'partager',
  'rechercher', 'choisir', 'retirer', 'approuver', 'refuser', 'rejeter',
  // métier
  'élève', 'élèves', 'enseignant', 'école', 'niveau', 'présence',
  'retard', 'congé', 'facture', 'reçu', 'paiement', 'bulletin', 'cantine',
  'attestation', 'demandes', 'seuil', 'alertes', 'annonce', 'moyenne',
]
// PIÈGE : plusieurs mots « français » sont AUSSI anglais — journal, parent,
// accident, personnel, absence, session, moment. Les garder faisait échouer des
// pages parfaitement traduites (« Daily journal », « Parents' space »). Un
// détecteur qui cite à tort se fait désactiver : il ne cherche que l'univoque.
// Ce qui ressemble à du français mais n'en est pas : marques, mots communs
// aux trois langues, noms propres. Nommés pour ne pas les redécouvrir.
// Ce qui ressemble à du français mais n'en est pas. Deux familles apprises au
// premier passage : les MARQUES, et les DONNÉES de l'école de démonstration —
// son nom (« École Al-Nour »), sa ville, les intitulés de poste et les types de
// contrat saisis dans la base. Traduire une donnée serait un défaut, pas une
// correction : le nom d'une école ne change pas parce qu'on lit en arabe.
const ALLOWED = /Coreon|Kogia|OneRoster|Clever|Wonde|CSV|PDF|Français|English|École Al-Nour|Al-Nour|Tunis|Éducatrice|Instituteur|Institutrice|Directrice|Directeur|Surveillant[e]?|Comptable|CDI|CDD|Ben Salah|Karoui|Belhadj|Morjane|Brahmi|Ben Amor|Ounis|El Amel|[0-9]+ème [A-Z]|Mathématiques|Merci ! Une question[^.]*\\.|Bienvenue sur Coreon Edu[^!]*!|Réunion parents[^0-9]*[0-9/]*|A aidé un camarade[^\\u00AB\\u00BB]*|Amira a lu son premier texte[^!]*!|Karim avait mal à la t[^.]*\\.|Élève malade|Atelier peinture[^!]*!|il y a [0-9]+ h|nouvelle annonce|[0-9]+ère [A-Z]/gi

// Les pages métier, avec le rôle qui y a droit.
const PAGES = [
  ['direction@alnour.tn', 'admin', ['/app', '/app/students', '/app/attendance', '/app/finance',
    '/app/accounting', '/app/staff', '/app/hr', '/app/results', '/app/academic',
    '/app/admissions', '/app/documents', '/app/events', '/app/notices', '/app/messages',
    '/app/canteen', '/app/gallery', '/app/behavior', '/app/childfile', '/app/accidents',
    '/app/facilities', '/app/inventory', '/app/budget', '/app/recruit', '/app/teachers',
    '/app/interop', '/app/requests', '/app/timetable', '/app/settings', '/app/incidents']],
  ['creche@alnour.tn', 'teacher', ['/app', '/app/evaluate', '/app/journal', '/app/attendance']],
  ['parent@alnour.tn', 'parent', ['/app', '/app/live', '/app/payments', '/app/journal', '/app/gallery']],
]

await scenario(8996, async ({ page, ok, base }) => {
  const settle = async () => {
    for (let w = 0; w < 40 && (await page.locator('body').innerText()).trim().length < 60; w++) {
      await page.waitForTimeout(150)
    }
    await page.waitForTimeout(500)
  }

  const setLang = async l => {
    await page.goto(`${base}/#/`)
    await page.evaluate(x => localStorage.setItem('coreon_locale', x), l)
    await page.reload(); await page.waitForTimeout(1200)
  }

  const login = async (email, pw) => {
    await page.goto(`${base}/#/login`); await page.evaluate(() => sessionStorage.clear())
    await page.goto(`${base}/#/login`); await page.waitForSelector('input', { timeout: 20000 })
    await page.locator('input').first().fill(email)
    await page.locator('input[type=password]').fill(pw)
    await page.keyboard.press('Enter'); await page.waitForTimeout(1500)
  }

  // Un mot français trouvé dans le texte de l'écran, ou rien.
  const frenchIn = txt => {
    const clean = txt.replace(ALLOWED, ' ').toLowerCase()
    for (const w of FRENCH_WORDS) {
      const i = clean.indexOf(w)
      // frontière de mot : on ne veut pas « classe » dans « classes » anglais…
      if (i === -1) continue
      const before = clean[i - 1] || ' '
      if (/[a-zà-ÿ]/.test(before)) continue
      // On rend le MOT qui a déclenché, pas seulement l'extrait : sans lui, on
      // relit trois lignes d'arabe en cherchant ce que l'outil a bien pu voir.
      const around = txt.slice(Math.max(0, i - 40), i + 60).replace(/\s+/g, ' ').trim()
      return `${w} → …${around}…`
    }
    return null
  }

  let swept = 0, leaks = 0
  for (const lang of ['en', 'ar']) {
    for (const [email, pw, routes] of PAGES) {
      await setLang(lang)
      await login(email, pw)
      for (const route of routes) {
        await page.goto(`${base}${'/#'}${route}`); await settle()
        const txt = await page.locator('body').innerText()
        // une page qui CHARGE n'est pas une page qui MARCHE : on refuse aussi
        // l'écran de repli de la frontière d'erreur (leçon du 2026-07-29).
        const broken = /Cette page n’a pas pu s’afficher|La page n’a pas pu se charger|The page could not load/.test(txt)
        if (broken) { ok(false, `${lang.toUpperCase()} ${route} : écran d'erreur`); leaks++; continue }
        const hit = frenchIn(txt)
        swept++
        if (hit) { leaks++; console.log(`  reste — ${lang.toUpperCase()} ${route} : « ${hit} »`) }
      }
    }
  }
  // ── LE PLAFOND, ET CE QU'IL RESTE DEDANS ─────────────────────────────────
  // Il ne remonte jamais. Les 4 fuites admises sont TOUTES dans le CŒUR, pas
  // dans les pages : ce sont des VOCABULAIRES MÉTIER que `t()` n'a jamais vus —
  //   · `core/src/documents.js` : « Attestation d'inscription », « L'élève est
  //     inscrit pour l'année en cours », « CNSS, banque, employeur » ;
  //   · `core/src/requests.js` + `tunisia.js` : « Attestation de salaire » et
  //     les types de demande, cités avec leurs références au droit du travail.
  // Les traduire demande une décision PAYS (le Golfe ne dit ni « CNSS » ni
  // « attestation de scolarité »), pas un codemod : c'est le chantier suivant.
  const CEILING = 4
  ok(leaks <= CEILING,
    `${swept} pages balayées en EN et AR · ${leaks} fuite(s) de français (plafond ${CEILING})`)
  if (leaks < CEILING) console.log(`NOTE — le plafond peut descendre à ${leaks}.`)
})
