# Coreon EDU — Le carnet de bord

**Le plan vivant du produit.** Chaque décision, chaque priorité, chaque dette.
Si le code et ce carnet divergent, le carnet a raison — ou il faut le corriger.

**v1 — 2026-07-14.** Tenu par Claude, pour Othman.

---

## 0. Ce que nous construisons, et pourquoi c'est différent

Coreon EDU est le **premier produit de KogiaGroup**. C'est donc aussi la première
impression que le marché aura de l'entreprise. Othman l'a dit et c'est la règle qui
gouverne ce carnet :

> « Je préfère reconstruire une partie du système maintenant plutôt que de garder
> des fonctionnalités mal conçues. »

**Notre position sur le marché** (recherche vérifiée 3-0, `kogia-research`) :
les ERP scolaires (PowerSchool, iSAMS, Classter) **ne savent pas faire la petite
enfance**. Les plateformes petite enfance (Famly, Procare) **ne savent pas faire
l'école**. Un parent avec un enfant de 3 ans et un de 8 ans dans le même
établissement a besoin de **deux applications** aujourd'hui.

**Coreon EDU fait les deux, sous un seul toit, avec un seul compte parent.**
Ce n'est pas une fonctionnalité : c'est la raison d'exister du produit.

**La règle d'effort qui en découle :**
> Les modules de base (RH, paie, comptabilité, bulletins) doivent être **complets
> et ennuyeux**. Nos idées (évaluation quotidienne, suivi parent, chaîne
> d'accident, journal du jour) doivent être **exceptionnelles**.
> On ne gagne pas un client avec la paie. On le **perd** sans elle.

---

## 1. État réel du produit — au 2026-07-14

### ✅ Construit, testé, poussé

| Module | Ce qu'il tient |
|---|---|
| **Niveaux** (`levels.js`) | Crèche→MS2 + 1ère→6ème. Modèle de **capacités** : un module déclare les niveaux qu'il sert, une école déclare les siens, l'intersection existe |
| **Écran d'accueil** (`/setup`) | « Quelle école êtes-vous ? » — pilote tout le reste |
| **Pré-inscription** (`/inscription`) | Publique, sans compte. Le **parent** dépose |
| **Inscriptions** | Pièces → étude → décision → capacité → liste d'attente → élève, **sans ressaisie** |
| **Journal du jour** | Repas, sieste, change, humeur. Un geste, pas un formulaire |
| **Dossier de l'enfant** | **Personnes autorisées** (la règle la plus grave du métier) · vaccins · jalons |
| **Chaîne d'accident** | Schéma corporel → **2 paires d'yeux** → accusé de réception du parent → relance |
| **RH & Paie** | Contrats, congés, paie calculée sur les faits. Personne ne valide sa propre demande |
| **Comptabilité** | Barème, remises, factures, reçus, **avoirs**. Une facture émise ne se modifie pas |
| **Bulletins & passage** | Notes /20 **et** acquis observés. Passage = processus daté, capacité, effet sur les frais |
| **Installations** | Piscine, terrain, gymnase. **Jamais deux fois le même créneau.** La pédagogie passe avant l'argent |
| **Interopérabilité** | Export **OneRoster v1.2** (8 CSV + manifest) |

*Existants avant :* évaluation quotidienne · suivi en direct · présence · poste de
sécurité · incidents · événements · messages · emploi du temps · demandes · espaces.

### 🟡 Codé mais **éteint** (`features.js`)
`homework` · `exams` · `library` · `transport` — une ligne pour les rallumer.

### ❌ Manquant

| Manque | Pourquoi ça compte |
|---|---|
| **Arabe / RTL** | **Bloque tout le Golfe.** Othman vit à Bahreïn : c'est son meilleur marché, et le produit ne peut être montré à aucune école là-bas |
| Portail élève | Les élèves n'ont aucun compte |
| Curriculum, plans de cours | Un enseignant ne peut pas préparer |
| Certificats, attestations | Rien d'imprimable |
| Gestion documentaire | Aucun stockage de fichiers |
| Recrutement, évaluations du personnel | La RH s'arrête aux contrats/congés/paie |
| Budget, rapports financiers | La compta n'a pas de budget |
| Partage photo/vidéo | Une crèche l'attend (Famly l'a) |
| Analytique / KPI | Le tableau de bord est basique |

### 🔴 Dette — trouvée, pas encore corrigée

| Dette | Gravité |
|---|---|
| ~~Les pièces jointes sont du théâtre~~ → **réglé** (§2.1, y compris le quota silencieux) | — |
| ~~Le menu de gauche est plat~~ → **réglé** (§2.5, étages + Ctrl+K) | — |
| ~~Les tableaux de bord affichent des statistiques~~ → **réglé** (§2.2, l'atelier) | — |
| ~~Aucun test d'intégration UI dans le dépôt~~ → **réglé** (2026-07-15) : `e2e/` — trois parcours pilotés au navigateur sur le vrai bundle (public+quota, demandes+bilan, arabe+RTL). `cd e2e && npm i && npm run all` | — |

---

## 2. Les demandes d'Othman — 2026-07-14

Numérotées comme lui. Chacune a un état et une décision.

### 2.1 — Pré-inscription : les pièces jointes ✅ → FAIT (deux fois)
**Le constat d'Othman est juste, et le défaut était TRIPLE.**
① Le formulaire public n'avait aucun upload ; ② `Attach` ne gardait que le **nom**
du fichier ; ③ — découvert le 14 au soir sur **deux vraies pré-inscriptions
d'Othman** — le stockage du navigateur (~5 Mo) débordait avec les photos en
base64, l'écriture échouait **en silence** (`catch {}` dans storage.js), et le
parent repartait avec un reçu et une référence… d'un dossier **jamais enregistré**.
Un faux reçu viole la règle n°7 : le produit inventait un fait.

**Corrigé, et verrouillé par test d'exécution :** `setItem` répond (true/false) ;
`apply()` **vérifie** que le dossier est écrit, réessaie **sans** les pièces si
elles ne tiennent pas (et le DIT : `filesDropped`), sinon rend une **erreur
franche** ; les photos sont **compressées** avant stockage (1400 px JPEG — une
photo de 2 Mo devient ~370 Ko, vérifié au navigateur) ; toute sauvegarde échouée
déclenche une alerte visible (`onSaveFailure`).

### 2.2 — Tableaux de bord par rôle ✅ → **FAIT**
Vérifié 3-0 : l'accueil administrateur de **PowerSchool est un CHAMP DE RECHERCHE** ;
les KPI sont relégués **sous Reports**. Un tableau de bord d'ERP est un **atelier**, pas
une vitrine.

**Livré :** `core/src/workbench.js` — la liste « **À décider** » se calcule des
**FAITS** (étapes des candidatures, chaîne d'accident, congés, circuits de
demandes, versements signalés, paie), jamais des statistiques. Deux paires d'yeux
respectées : personne ne voit ses propres dossiers dans sa liste. Tri par gravité :
l'enfant avant l'argent. L'accueil direction = recherche (ouvre la palette Ctrl+K)
+ À décider + Aujourd'hui + raccourcis du métier ; **les chiffres en second rang**
sous leur propre titre. Le parent a sa liste aussi (accident à signer, retards).
Vide, la liste **dit** que l'école est à jour. Verrouillé par 4 tests d'exécution.

### 2.3 — Ticketing interne ✅ → **FAIT — en tant qu'extension, pas en produit**
**Othman a eu raison d'exiger une vérification avant de construire.**
Résultat (vérifié 3-0) : **aucun MIS grand public n'embarque de ticketing.** La
catégorie séparée (Incident IQ, Brightly) vise les districts américains, pas une
crèche de 40 enfants sans informaticien.

**Livré (2026-07-14 soir) : `core/src/requests.js`** — une demande **approuvée**
devient un travail : *catégorie (= le groupe du type, jamais une saisie) → assigné
(notifié) → échéance → clôture avec un mot*. Chaque geste s'ajoute à une **trace**
datée et signée ; le retard se **constate à la clôture** et reste écrit. Le
« **Bilan du mois** » (la demande d'origine : *évaluer le travail accompli*) compte
depuis les faits : déposées, clôturées, en retard, par catégorie, par personne.
Le bureau (workbench) montre « à assigner » et « en retard » à la direction, et
« le travail qui m'est confié » à chaque membre du personnel. Verrouillé par test
d'exécution ; circuit complet vérifié au navigateur (approbation à deux niveaux →
assignation → clôture → bilan).

### 2.4 — Recherche approfondie ERP ⏳ → **LANCÉE**
La plus importante. Fonctionnalités, rôles, permissions, workflows, tableaux de
bord, UX, erreurs courantes, tendances. **Sommes-nous compétitifs ?**

### 2.5 — Menu de gauche ✅ → **FAIT** (et la recherche a corrigé mon plan)
**Mon plan initial (« regrouper ») était insuffisant, et la recherche l'a montré.**
Arbor n'a **aucun module** dans sa barre latérale : sept icônes utilitaires, les modules
en haut en **quatre groupes**, et une sous-navigation **contextuelle**. Il faut des
**étages**, pas seulement des paquets.

**Livré :** ① **Épinglé** — les 2 à 4 choses que CE rôle fait tous les jours, en haut,
sans titre. ② **Sections** rangées par **fréquence** (Au quotidien · Élèves & familles ·
Pédagogie · Vie de l'école · Équipe · Finances · Administration). ③ **Ctrl+K** —
la vraie navigation d'un ERP : chez PowerSchool, l'accueil administrateur **EST** un
champ de recherche.

### 2.6 — Pages d'accueil (Coreon EDU + KogiaGroup) ❌ → À FAIRE
Doivent dire « entreprise technologique moderne », pas « logiciel scolaire de plus ».

---

## 3. Ce qu'Othman n'a pas demandé, et que je mets quand même sur la table

**Je le dis parce que c'est mon rôle de le dire, pas pour ajouter du travail.**

1. **L'arabe et le RTL passent avant tout le reste.**
   Un ERP à 60 % en arabe vaut mieux qu'un ERP à 90 % qu'aucune école du Golfe ne
   peut lire. C'est le seul point qui **bloque un marché entier**.

2. **Deux trous de recherche béants** (`kogia-research/…/LANDSCAPE_v1.md` §7) :
   - **Zéro preuve** sur ce dont les acheteurs se **plaignent** — alors que « gagner
     sur les manques » est toute notre stratégie.
   - **Zéro donnée sur le Golfe** : réglementation, conformité ministérielle,
     bulletins bilingues. C'est le marché principal.

3. **Personne ne vend.** Un produit sans vendeur est un passe-temps. La première
   embauche n'est pas un ingénieur.

---

## 4. Ordre d'exécution proposé

| # | Chantier | Pourquoi maintenant |
|---|---|---|
| ~~1~~ | ~~**Pièces jointes** (2.1)~~ ✅ | Fait — y compris le faux reçu du stockage plein |
| ~~2~~ | ~~**Recherche ERP + ticketing** (2.4, 2.3)~~ ✅ | Fait — COMPETITIVE_v2.md |
| ~~3~~ | ~~**Menu** (2.5)~~ ✅ | Fait — étages + Ctrl+K |
| ~~4~~ | ~~**Tableaux de bord** (2.2)~~ ✅ | Fait — l'atelier (workbench.js) |
| ~~5~~ | ~~**Pages d'accueil** (2.6)~~ ✅ | Fait — le positionnement, l'arme OneRoster, zéro invention |
| ~~7~~ | ~~Extension des « Demandes » (2.3)~~ ✅ | Fait — requests.js + bilan du mois |
| → | **Arabe / RTL** | Débloque le Golfe — **le premier chantier de la page suivante** |

---

## ∎ Carnet v1 — CLOS le 2026-07-14, tard dans la nuit

Les six demandes d'Othman du 2026-07-14 sont livrées, testées par exécution,
vérifiées au navigateur, déployées. En chemin, un défaut réel trouvé par Othman
sur deux vraies pré-inscriptions (le faux reçu du stockage plein) a été corrigé
le soir même, plus deux retours d'usage (dossier cliquable, texte trop clair).

**La page suivante s'ouvre sur :** l'arabe/RTL (bloque le Golfe), le portail
élève, les permissions en matrice module × action, le partage photo/vidéo
(Famly l'a), et un vrai backend avant la première vraie école.

---

## 5. Les règles du produit — elles ne se négocient pas

Elles sont dans le **cœur**, pas dans l'écran. *Une règle qui ne vit que dans
l'interface n'est pas une règle.*

1. **Un enfant ne part jamais avec quelqu'un qui n'est pas sur la liste.**
2. **Deux paires d'yeux** sur une déclaration d'accident : qui déclare ne valide pas.
3. **Personne ne valide sa propre demande** (congé, dépense).
4. **Une facture émise ne se modifie pas** — on l'annule par un avoir daté et motivé.
5. **On archive, on ne supprime jamais** un dossier scolaire.
6. **La capacité décide** : le produit ne promet jamais une place qui n'existe pas.
7. **On n'invente rien** — ni un chiffre, ni un client, ni une donnée pour remplir
   une norme.
8. **La pédagogie passe avant l'argent** : un cours ne se fait pas déloger par un
   club qui paie.
9. **On observe un enfant, on ne le note pas** — et on ne le compare à personne.

---

## 6. Journal des décisions

| Date | Décision | Raison |
|---|---|---|
| 2026-07-13 | Le produit s'ouvre à la **petite enfance** | La recherche a montré que c'est **le** trou du marché |
| 2026-07-13 | Le niveau devient un **modèle de capacités**, pas un réglage | Tout niveau futur (collège, lycée) passera par là sans réécriture |
| 2026-07-14 | **OneRoster maintenant**, pas plus tard | « La chose la plus coûteuse à rater, et presque gratuite à faire aujourd'hui » |
| 2026-07-14 | Le site KogiaGroup ne montre **qu'un** produit | Un site ne montre que ce qui est prêt |
| 2026-07-14 | **Rechercher avant de construire** le ticketing | Demande d'Othman, et c'est la bonne méthode |
| 2026-07-14 | **Une écriture de stockage qui échoue doit répondre, jamais s'avaler** | Deux vraies pré-inscriptions perdues avec un faux reçu — règle n°7 violée par le produit lui-même |
| 2026-07-14 | Les photos sont **compressées avant stockage** (1400 px JPEG) | Une pièce sert à être lue à l'écran, pas imprimée — et quatre pièces doivent tenir dans un navigateur |
| 2026-07-14 | Le tableau de bord se calcule des **faits**, pas des statistiques | `workbench.js` : chaque ligne est une décision, avec son écran. PowerSchool a raison : l'accueil est une recherche |
| 2026-07-14 | **La règle n°7 s'applique au marketing** : témoignages inventés supprimés de la page d'accueil | La confiance se gagne par les principes (les 9 règles), pas par des clients imaginaires |
| 2026-07-14 | La **catégorie** d'une demande = le groupe de son type, jamais une saisie | Une taxonomie de plus serait une case de plus à remplir faux |
| 2026-07-14 | L'ardoise passe à `#485868` (7.31:1, AAA) et graisse 600 aux petites tailles | Retour d'Othman « texte très clair » — calculé, pas estimé, changé à la source |

---

# CARNET v2 — ouvert le 2026-07-15

## Chantier 1 · L'arabe et le RTL — LA TRANCHE 1 EST LIVRÉE

**Pourquoi en premier :** bloque tout le Golfe — la Vague 2 annoncée publiquement
sur kogiagroup.com (« en préparation — ouverte par le chantier arabe/RTL »).

**Livré (tranche 1) :** `core/src/i18n.js` — le français est la CLÉ (façon
gettext) : `t('Tableau de bord')` → « لوحة المتابعة » ; une traduction absente
retombe sur le français, jamais sur un trou, et **un test de couverture interdit
à la dégradation de grandir** (navigation, sections, rôles, niveaux : 100 %).
La langue est un choix d'appareil ; `dir()` l'accompagne toujours — l'arabe est
une DIRECTION, pas une traduction. Tajawal (le Nunito de l'arabe), interlettrage
zéro (les ligatures), `<html lang dir>` posés avant le premier rendu, sélecteur
FR/ع sur la connexion, la pré-inscription et la barre du haut. Traduits : l'écorce
(navigation, rôles, palette, notifications) + le parcours public du parent
(pré-inscription, pièces, reçu) + la connexion. Vérifié au navigateur : un parent
dépose une candidature entièrement en arabe, la barre latérale passe à droite,
la direction la voit.

**Tranches suivantes :** les pages métier une à une (tableau de bord/atelier,
inscriptions, journal, accidents…) ; les classes Tailwind physiques restantes
(ml-/pl-/text-left) vers des logiques (ms-/ps-/text-start) ; les dates et
nombres localisés ; les documents officiels bilingues (le Golfe exige des
bulletins bilingues) ; le barème et la réglementation par pays (Vague 2).

## Les chantiers suivants de ce carnet
2. Portail élève · 3. Permissions en matrice module × action (groupes, façon
« Tool Rights ») · 4. Partage photo/vidéo (Famly l'a, une crèche l'attend) ·
5. Un vrai backend avant la première vraie école.

## Chantier 2 · Enrichir l'ERP (la liste des 30 catégories d'Othman)

L'objectif : le TOP 1 des ERP écoles — sans jamais trahir l'âge (0–12 ans) ni
la sauce (évaluation, suivi, activités, location). Filtre : « est-ce juste pour
l'école d'un enfant de 3 à 11 ans ? »

**Livré (2026-07-15) :**
- ✅ **Suivi du comportement** (`behavior.js`) — encourager d'abord, jamais
  classer (règle n°9). L'idée maîtresse d'Othman, enfin outillée.
- ✅ **Moments** (`gallery.js`) — partage photo/vidéo, l'attente n°1 d'une
  crèche. Vie privée des enfants tenue par le cœur.
- ✅ **Cantine** (`canteen.js`) — le menu de la semaine ET l'ALERTE ALLERGIE :
  le menu du jour est croisé avec le dossier de chaque enfant inscrit, l'école
  voit « à ne pas servir à » AVANT le service, le parent lit l'alerte en clair
  sur le menu de SON enfant. L'alerte est calculée, jamais saisie — et on
  ratisse large (« cacahuète » attrape l'allergie aux arachides) : un faux
  positif fait vérifier, un faux négatif envoie un enfant à l'hôpital.
  3 tests d'exécution + parcours navigateur `e2e/parcours.cantine.mjs` (14 vérifications).

**Décision de périmètre (2026-07-15) :** ❌ **PAS de portail élève.** Le produit
sert la crèche et le primaire (0–12 ans) : les enfants ne se connectent pas. Le
portail PARENT est le portail de l'enfant à cet âge. (Les listes ERB génériques
visent aussi le lycée ; Coreon est plus jeune.)

**Livré (2026-07-15, suite) — les quatre derniers candidats du chantier :**
- ✅ **Documents officiels** (`documents.js`) — le guichet : certificat de
  scolarité, attestations, radiation. Numéro de SÉRIE par type et par année,
  registre append-only (une série qui saute est une remarque d'audit),
  radiation seulement sur dossier archivé (règle n°5), aperçu + PDF.
- ✅ **Budget & rapports** (`budget.js`) — encaissé (reçus + locations payées),
  versé (paie), dépensé (carnet de dépenses) : QUE des chiffres réels (règle
  n°7). Une dépense s'annule motivée, jamais ne s'efface (règle n°4). Courbe
  annuelle, export CSV, chaque tuile s'ouvre.
- ✅ **Inventaire léger** (`inventory.js`) — quantités, seuils, ALERTE « à
  racheter », chaque mouvement journalisé (qui, quand, combien), jamais sous zéro.
- ✅ **Recrutement** (`recruit.js`) — reçue → entretien → offre → embauchée,
  SANS saut d'étape (on n'embauche pas un CV sans entretien), refus motivé,
  parcours écrit. L'embauche renvoie vers RH & Paie + Comptes.
39 tests d'exécution · parcours navigateur `e2e/parcours.gestion.mjs` (12 vérifications).

**Le chantier 2 est CLOS.** À l'écart tant qu'il n'y a pas de backend :
les intégrations (Google/MS/paiement) et l'IA.
