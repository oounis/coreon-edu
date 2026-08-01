# Coreon EDU — Norme d'acceptation produit v1
_Kogia Group · établie le 2026-07-26, à la veille du premier client de production (école du Bahreïn)._

> **À quoi sert ce document.** Il dit ce que « acceptable pour une école qui paie »
> veut dire — par domaine, avec un critère MESURABLE, la commande qui le mesure,
> et l'état du produit AUJOURD'HUI. Il remplace les opinions par des chiffres.
> Toute livraison client se prononce contre cette norme : ✅ conforme · 🟡 partiel ·
> ❌ non conforme. Rien d'autre ne vaut « prêt ».

---

## 1. Les niveaux de gravité (le langage commun)

| Niveau | Nom | Définition | Conséquence |
|---|---|---|---|
| **A** | Bloquant | Le produit ment, perd de l'argent, expose une donnée, ou empêche un métier de travailler | **Livraison interdite** |
| **B** | Majeur | Un métier peut travailler mais avec un contournement, une gêne quotidienne, ou une incohérence visible | Livraison possible seulement avec date de correction écrite |
| **C** | Mineur | Défaut de finition, confort, cohérence | Backlog daté |
| **D** | Finition | Esthétique, micro-copie | Au fil de l'eau |

---

## 2. Les dix domaines de la norme

Chaque domaine porte : le critère, **comment on le mesure** (commande exécutable),
et l'état au 2026-07-26 (après les 5 rapports FAT exploratoires et 6 vagues de correction).

### D1 · Intégrité fonctionnelle
**Critère.** Aucun écran ne casse ; aucune action irréversible sans confirmation ; aucune donnée inventée par le système.
**Mesure.** `cd core && npm test` (108 tests) · `cd e2e && npm run all` (20 parcours) · `node e2e/fat.mjs` · `cd app && npx oxlint` (`no-undef` bloquant)
**État : ✅ conforme.** 108/108 · 20/20 · oxlint 0 erreur. Corrigés en vagues QA : crash de /app/finance à la première inscription réelle, envoi accident/journal sans confirmation, groupe sanguin « O+ » inventé et enregistré.
**⚠️ RÉGRESSION GRAVE DU 2026-07-29 — deux pages MORTES en production.**
`/app/accidents` et `/app/journal` appelaient `t()` sans l'importer ; la seconde
portait en plus sa fenêtre de confirmation d'envoi dans la MAUVAISE vue
(`ParentJournal` lisait `confirmSend` de `TeacherJournal`). Donc : la page du
parent plantait, **et l'éducatrice ne pouvait plus envoyer la journée** — la
boucle quotidienne de la crèche était morte, silencieusement.
**Pourquoi rien ne l'a vu :** la frontière d'erreur qui se réarme par route
ATTRAPE le plantage — il ne remonte donc jamais comme erreur non capturée — et
son écran de repli est un texte long qui passe le seuil « page quasi vide ». Le
smoke a parcouru les deux pages mortes et les a déclarées saines.
**Les trois barrières posées :** `no-undef` en erreur (oxlint tournait déjà mais
la règle est éteinte par défaut — elle rattrape les DEUX défauts sans navigateur) ;
le smoke écoute `[boundary]` et refuse un `role=alert` d'erreur ;
`parcours.journal.mjs` vérifie que le métier se BOUCLE (l'éducatrice envoie, le
parent reçoit). **Règle : une page qui CHARGE n'est pas une page qui MARCHE.**

### D2 · Vérité de l'interface (le produit ne ment pas)
**Critère.** Ce que l'écran affirme est vrai : un bouton qui dit « suspendre » suspend ; un identifiant affiché existe ; un état affiché est mesuré.
**Mesure.** Revue FAT exploratoire, par rôle, sur le bundle réel.
**État : ✅ conforme (depuis v1.4.x).** Corrigés : « Suspendre l'école » ne coupait aucun accès · le provisionnement affichait un mot de passe sans créer le compte · le registre visiteurs affichait « CPR » et enregistrait « CIN » · « Joignable : Oui » sans aucune sonde.

### D3 · Conformité pays (BH · QA · TN · LY)
**Critère.** Semaine, devise, pièce d'identité, cadre légal, urgences, fériés, calendrier : tout vient du pack pays, rien n'est écrit en dur.
**Mesure.** `node e2e/diag.feries-pays.mjs` · `node e2e/fat.mjs` (détecteur de fuites tunisiennes)
**État : ✅ conforme pour le socle.** Semaine dim–jeu, week-end ven-sam, 999, CPR, PDPL, hégirien, fériés BH (Aïd 3 jours), documents sans « Tunisie »/« INPDP », décimales BHD (fils).
**🟡 Réserve B :** TVA 10 % / facture NBR absente ; GOSI/EOSB absents de la paie ; reporting MOE absent.

### D4 · Langue (FR · EN · AR)
**Critère.** Aucune phrase d'une autre langue sur un écran. Mesuré, pas jugé.
**Mesure.** `python3 docs/quality/i18n-audit.py` (barrière CI `--gate N`) · `node e2e/parcours.langues.mjs` (on LIT l'écran) · `python3 docs/quality/i18n-audit.py --dates`
**État : ✅ conforme — EN 100 % · AR 100 %** (823/823, le 2026-07-29). Le reliquat était CONCENTRÉ : 86 % des clés manquantes vivaient dans deux fichiers (`site/shared.jsx` la vitrine, `Security.jsx` le poste de sécurité) — traduits en un lot, plus le reliquat de 44/36 clés.
**Règle posée :** la barrière CI ne redescend jamais (40 → 60 → **95 %**, le seuil d'acceptation client).
**⚠️ LEÇON DU 2026-07-29 — un compteur à 100 % ne prouve pas un écran monolingue.**
L'audit ne mesure que les clés `t()` ; **une date n'en est pas une**. Le produit
affichait alors 62 % d'anglais et **100 % de dates françaises** : 51 appels
`{ locale: fr }` (date-fns) et 12 `toLocaleDateString('fr-FR')` répartis dans
28 fichiers, invisibles à la mesure. Un seul endroit décide désormais —
`app/src/datefns.js` (`df()`) et `dateLocale()` du cœur — et la langue donne la
famille tandis que le **pays** départage l'arabe (« جويلية » à Tunis,
« يوليو » à Manama). Deux barrières neuves : `--dates` (avec son test négatif)
et `parcours.langues.mjs`, qui ouvre les deux pages les plus verbeuses dans les
deux langues et refuse toute phrase — ou date — française résiduelle.
**⚠️ Leçon du 2026-07-28 — traduire ne doit RIEN peser aux autres langues.** Le lot 2
a fait échouer la livraison v1.5.0 sur la barrière de poids (452 KB gzip pour 450 de
budget) : les dictionnaires vivaient dans `i18n.js`, que tout le produit importe pour
`t()`, donc une visiteuse **française** téléchargeait l'arabe ET l'anglais. Chaque
langue est désormais un morceau à part (`i18n.ar.js`, `i18n.en.js`) chargé
dynamiquement, et seulement celle que l'appareil lit — première visite 452 → 426 KB.
La marche vers 95 % (≈310 clés) ne peut donc plus rebloquer une livraison.

### D5 · Intégrité de l'argent
**Critère.** Aucun encaissement ne disparaît ; arrondi au fils ; un montant s'affiche dans la langue du lecteur ; toute écriture d'argent est confirmée et tracée.
**Mesure.** Tests cœur comptabilité/paie + revue FAT « argent ».
**État : 🟡 partiel.** Corrigés : l'encaissé se compte sur LES REÇUS (annuler une facture payée ne fait plus disparaître l'argent), arrondi au fils (les remises % volaient 234 fils), format par langue, confirmations sur facturation de masse / paie payée / dé-encaissement.
**Réserve A→B :** deux modèles d'argent coexistent (factures vs grille mensuelle) — ils peuvent se contredire ; location et activités encaissent sans reçu numéroté.

### D6 · Sécurité & données personnelles
**Critère.** Pas de secret dans le dépôt ; pas d'élévation de privilège ; pas d'accès hors rôle ; consentement du pays ; journal d'audit pour les données sensibles.
**Mesure.** `.github/workflows/securite.yml` (CodeQL + motifs de secrets, à chaque poussée + hebdo) · tests ACL du serveur · **9 tests cœur du journal d'audit** · `node e2e/parcours.audit.mjs` (la consultation d'un dossier de santé doit APPARAÎTRE au journal).
**État : 🟡 partiel.** Corrigés : élévation de privilège par POST /api/db, traversée de chemin du serveur statique, XSS stocké par nom de fichier, jeton du worker mail révoqué et sorti du dépôt, limites de débit connexion/réinitialisation, sauvegarde du registre d'auth, lecture Administration alignée sur ses droits d'écriture.
**2026-08-01 · CR-039 LIVRÉ — le journal d'audit existe.** `core/src/audit.js` : 9 natures de donnée sensible, chacune avec le motif juridique qui l'y met ; consultations (dossier de santé, personnes autorisées, fiche élève 360°, contrats & paie, journal lui-même) ET modifications (santé, autorisations de départ, accidents, comptes, contrats, paie, documents officiels) ; connexions et **connexions REFUSÉES**. Clé de stockage séparée du blob de l'école, chaîne d'empreintes qui NOMME la première ligne altérée, **aucun chemin de suppression**, export CSV daté (lui-même journalisé). Lisible par la Direction et la plateforme UNIQUEMENT — pas par ceux qu'il surveille.

**Réserve A (ce qui reste, et qui dépend de D9) :** l'immuabilité est *tamper-évidente*, pas *tamper-proof* — le journal vit dans le navigateur de l'école, qui sait ouvrir la console peut recalculer la chaîne. La garantie devient réelle avec une table serveur en AJOUT SEUL. Même dépendance pour le reste : **mode démo = mots de passe en clair côté navigateur** tant que l'hébergement serveur n'est pas fait.

### D7 · Données du client (entrée et sortie)
**Critère.** Une école apporte ses données sans ressaisie et peut les reprendre.
**Mesure.** `node e2e/diag.import.mjs` (11 contrôles) · export OneRoster.
**État : ✅ conforme v1.** Import CSV guidé : correspondance de colonnes (FR/EN/AR/OneRoster), répétition générale ligne par ligne, doublons = mise à jour, annulation par photographie, journal des imports, identifiants provisoires. Export OneRoster v1.2 en un clic.
**Réserve C :** l'export sort 8 fichiers séparés (un ZIP serait attendu).

### D8 · Expérience & accessibilité
**Critère.** Aucun écran blanc ; états vide/erreur/chargement présents ; RTL correct ; navigation clavier ; contraste.
**Mesure.** `node e2e/parcours.qualite.mjs` (axe-core) · `node e2e/parcours.uiux.mjs` (25 pages à 390 px)
**État : ✅ conforme.** 0 violation grave axe-core · 0 débordement mobile · error boundary global qui se réarme à chaque page · bidi RTL corrigé (les téléphones s'affichaient à l'envers en arabe) · repli hors-ligne honnête.

### D9 · Exploitation (déploiement, sauvegarde, supervision)
**Critère.** Trois environnements, tests bloquants, retour arrière possible, sauvegardes restaurées, supervision.
**Mesure.** Chaîne CI `deploy.yml` (4 étages) + `envs.yml` (dev/int).
**État : 🟡 partiel.** ✅ dev → int → main, `main` protégée, tags de version, smoke de production, CodeQL, Dependabot, barrière de traduction, barrière de poids du bundle.
**Réserve A :** **l'hébergement du serveur n'existe pas** — les données d'une école vivent dans son navigateur (≈5 Mo, un appareil, mots de passe en clair). **Aucune supervision** (ni Sentry, ni sonde de disponibilité). **Aucune restauration répétée.**

### D10 · Preuve et documentation
**Critère.** Tout ce qui est affirmé est mesurable et daté ; l'inventaire produit est à jour.
**Mesure.** `docs/quality/Coreon-EDU_Product-Inventory.xlsx` (régénérable) · workbook QA (CR) · ce document.
**État : ✅ conforme.** Inventaire 10 feuilles, générateur versionné, 5 rapports FAT archivés, registre des CR à jour.

---

## 3. Verdict au 2026-07-26

| Domaine | État | Ce qui manque pour ✅ |
|---|---|---|
| D1 Fonctionnel | ✅ | — |
| D2 Vérité de l'interface | ✅ | — |
| D3 Pays | 🟡 | TVA/NBR · GOSI/EOSB · reporting MOE |
| D4 Langue | ✅ | — (EN 100 % · AR 100 %, barrière CI à 95 %) |
| D5 Argent | 🟡 | unifier les deux modèles · reçus location/activités |
| D6 Sécurité | 🟡 | ~~journal d'audit~~ ✅ 2026-08-01 · immuabilité serveur · sortir du mode démo |
| D7 Données client | ✅ | (ZIP d'export : confort) |
| D8 UX & accessibilité | ✅ | — |
| D9 Exploitation | 🟡 | **hébergement serveur** · supervision · restauration testée |
| D10 Preuve | ✅ | — |

### Prononcé
> **Coreon EDU v1.5 est ACCEPTABLE POUR UN PILOTE ACCOMPAGNÉ, pas encore pour une
> livraison autonome.** Un pilote accompagné = l'école utilise le produit avec
> Kogia à côté, sur des données réelles mais non critiques, sans dépendance
> juridique (factures fiscales, paie légale) tant que D3/D5/D6/D9 portent des
> réserves.

**Les portes d'entrée vers « livraison autonome » (dans cet ordre) :**
1. **D9 — hébergement du serveur** (≈1 h avec Othman) : c'est la porte qui ferme
   aussi la moitié de D6 (mots de passe hachés, sessions, sauvegardes).
2. ~~**D4 — langue à 95 %**~~ ✅ **FERMÉE le 2026-07-29** : EN et AR à 100 %.
3. **D5/D3 — argent et conformité** : modèle unique + TVA/NBR.
4. ~~**D6 — journal d'audit**~~ ✅ **FERMÉE le 2026-08-01** (CR-039) : qui a lu et qui a
   modifié un dossier sensible se lit en une minute, s'exporte, et une ligne réécrite
   se détecte. Ce qui en reste — l'immuabilité vraie — est un sous-produit de D9.

---

## 4. Comment on prononce une livraison (procédure)

```bash
cd core && npm test                       # D1 : règles métier
cd ../e2e && npm run all                  # D1/D8 : 18 parcours navigateur
node fat.mjs                              # D2/D3 : FAT automatisé (rôles × langues × BH)
cd .. && python3 docs/quality/i18n-audit.py   # D4 : couverture des langues
node --test server/test/                  # D6 : ACL, verrou de révision, sauvegarde
```
Puis : `dev` → `int` (chaîne complète) → `main` (production) → **vérifier le bundle
SERVI** (`curl` sur un marqueur de la livraison). « Fusionné » n'est pas « en ligne ».

---

## 5. Journal des prononcés

| Date | Version | Prononcé | Par |
|---|---|---|---|
| 2026-07-26 | v1.5.0 | Pilote accompagné ✅ · livraison autonome ❌ (D3/D4/D5/D6/D9 en réserve) | Kogia Group |
| 2026-07-29 | v1.6.0 | **D4 FERMÉ — EN et AR à 100 %** (823/823) : la vitrine et le poste de sécurité traduits, barrière CI portée à 95 %. Mais la soirée a d'abord trouvé **deux pages MORTES en production** (`/app/accidents`, `/app/journal`) qu'aucune barrière ne voyait, la frontière d'erreur les rendant invisibles au smoke. Trois barrières posées (`no-undef`, détection de l'écran d'erreur, parcours métier du journal) + deux sur les dates. **Leçon : une page qui CHARGE n'est pas une page qui MARCHE ; un compteur de traduction à 100 % ne prouve pas un écran monolingue.** | Kogia Group |
| 2026-07-28 | v1.5.1 | **v1.5.0 n'était jamais montée en ligne** — sa chaîne `main` avait échoué sur la barrière de poids et le déploiement fut *sauté*, la production restant à v1.4.1 pendant deux jours. Rappel de la règle §4 : « fusionné » n'est pas « en ligne », et un tag n'est pas une preuve — **seul le bundle SERVI l'est.** | Kogia Group |
