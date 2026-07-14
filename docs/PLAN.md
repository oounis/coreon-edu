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
| Aucun test d'intégration UI automatisé dans le dépôt (le cœur est testé par exécution ; l'UI est vérifiée en pilotant le navigateur à la main de session en session — le script mérite d'entrer dans le dépôt) | Moyenne |

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

### 2.3 — Ticketing interne ✅ → **TRANCHÉ PAR LA RECHERCHE : NE PAS LE CONSTRUIRE**
**Othman a eu raison d'exiger une vérification avant de construire.**
Résultat (vérifié 3-0) : **aucun MIS grand public n'embarque de ticketing.** La
taxonomie complète de Bromcom (24 modules) n'en a aucun. Une catégorie SÉPARÉE existe
et se vend (Incident IQ, Brightly/SchoolDude) — mais elle vise les **districts
américains** et leurs **programmes 1:1 de milliers d'appareils**, pas une crèche de
40 enfants sans informaticien.

**Décision : NE PAS construire un produit de tickets. ÉTENDRE « Demandes »** en un flux
*demande → catégorie → assigné → échéance → clôture*, avec la trace de qui a fait quoi.
Othman obtient exactement ce qu'il voulait (« évaluer le travail accompli sur le mois »)
sans une usine à gaz. Le **besoin** était réel ; la **forme** ne l'était pas.

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
| 5 | **Pages d'accueil** (2.6) | La première impression de KogiaGroup — **SUIVANT** |
| 6 | **Arabe / RTL** | Débloque le Golfe |
| 7 | Extension des « Demandes » (2.3) | demande → catégorie → assigné → échéance → clôture |

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
