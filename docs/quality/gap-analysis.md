# Coreon EDU — Gap Analysis vs professional education ERPs

> **Ce que les ERP éducatifs professionnels ont, et que Coreon EDU n'a pas encore.**
> Recherche 2026-07-23 sur trois axes : (a) ERP d'entreprise (SAP, Oracle NetSuite,
> Microsoft Dynamics 365) ; (b) ERP/SIS scolaires du commerce (PowerSchool, Infinite
> Campus, Focus Softnet, Classe365, Fedena, openSIS) avec focus **Golfe/MENA** ;
> (c) modèles ERPNext/Odoo Education.
>
> Objectif : découvrir les manques, les classer par valeur pour **vendre à Bahreïn /
> Qatar ce mois-ci**, et distinguer un vrai bloqueur d'un simple confort. Les priorités
> haut de tableau sont reportées dans [ARCHITECTURE-BIBLE.md](ARCHITECTURE-BIBLE.md) §11/§13.
>
> Légende : ✅ on l'a · ◻︎ partiel · ⛔ manquant · 🌙 critique pour le marché du Golfe.

---

## 0. L'atout à DÉFENDRE dans la vente (ne pas le sous-vendre)

Plusieurs fonctions de Coreon EDU manquent chez des concurrents du Golfe. À mettre en
avant pendant qu'on comble les manques :

- **Évaluation quotidienne** de toute une classe + grille de notes ★
- **Suivi en direct** de la journée de l'enfant ★
- **Journal petite enfance** (repas, sieste, jalons) ★
- **Location d'installations au public** (piscine, stade) — 2e ligne de revenus ★
- **Sécurité** : rondes, main courante, registre visiteurs
- **Référence ERP** structurée + identité humaine séparée
- **Bilingue FR/AR RTL** natif · **certificats numérotés** · **export OneRoster**

★ = différenciateurs. Ils existent déjà. On vend AVEC eux, on comble les Tier-1 à côté.

---

## 1. TIER 1 — Bloqueurs de vente au Golfe (obligatoires en appel d'offres)

Sans ça, la finance ou les parents refusent. Presque tous 🌙.

| # | Manque | Pourquoi c'est bloquant |
|---|---|---|
| 1 | **Passerelle de paiement en ligne + rails régionaux** 🌙 ⛔ | Benefit (Bahreïn), Fatora/QPay/Skiply (Qatar), mada/SADAD, Apple Pay. On émet factures et reçus mais **on n'encaisse pas en ligne**. Le parent du Golfe paie depuis son app bancaire — c'est le 1er déclencheur d'achat. |
| 2 | **Transport : bus + GPS live + RFID montée/descente + alertes parent** 🌙 ⛔ | Presque chaque école privée du Golfe a des bus ; les parents exigent le suivi en direct. On n'a **aucun** module transport. |
| 3 | **Facturation conforme TVA / e-invoicing** 🌙 ⛔ | Bahreïn : TVA 10 %, e-invoicing NBR en route ; Qatar : e-invoicing ~2027. Une finance ne signe pas un système qui ne produit pas de facture fiscale conforme. |
| 4 | **Calendrier Hijri ⇄ Grégorien** 🌙 ⛔ | Trimestres, fêtes, dates de naissance, présence, rapports doivent s'afficher dans les deux. Attendu sur chaque écran au Golfe ; son absence signale « pas fait pour notre marché ». |
| 5 | **Reporting Ministère de l'Éducation** 🌙 ⛔ | Bahreïn (MOE eServices) et Qatar (MOEHE) exigent des remontées périodiques élèves/personnel. Notre export OneRoster est un standard ed-tech générique, **pas** un flux ministériel. |

---

## 2. TIER 2 — Fortement attendus (reviennent sur les appels d'offres)

| # | Manque | Note |
|---|---|---|
| 6 | **Présence biométrique / RFID / QR** (élèves + personnel, portail + classe) ⛔ | intégration matérielle. 🌙 |
| 7 | **Export paie WPS (fichier SIF)** 🌙 ⛔ | Bahreïn LMRA, Qatar WPS l'exigent ; une paie qui n'émet pas de SIF échoue la conformité. On a la paie, pas l'export SIF. |
| 8 | **Moteur d'emploi du temps** (détection de conflits + génération) + remplaçants ⛔ | notre « suivi en direct » n'est pas un moteur de planification. |
| 9 | **Cartes / badges avec QR/code-barres** ◻︎ | élèves & personnel ; lié au portail, au bus, à la bibliothèque. **Peu coûteux, forte valeur perçue** — `qrPayload()` existe déjà. |
| 10 | **Prise de rendez-vous parent-enseignant (PTM)** ⛔ | créneaux réservables + rappels. |
| 11 | **Dossier santé / infirmerie** ◻︎ | vaccins, allergies, consentement médicament, journal de visite. On a accidents/incidents, pas le module clinique. |
| 12 | **Bulletins & documents officiels en arabe** ◻︎ | pas seulement l'UI bilingue : gabarits de bulletin au format MOE arabe. |
| 13 | **Canal WhatsApp** 🌙 ⛔ | canal parent par défaut au MENA ; SMS/email seuls sous-performent. |

---

## 3. TIER 3 — Complétude concurrentielle (à mesure qu'on monte vers le K-12)

- **LMS / e-learning** (contenu, classe vidéo, quiz, forum) + **devoirs en ligne** + **banque de questions** ⛔
- **Gestion des examens** (planning, plan de salle, convocations, surveillance, barèmes, examens en ligne) ⛔
- **Bibliothèque / circulation** (catalogue, prêt/retour, amendes, code-barres) ⛔ (l'inventaire ≠ bibliothèque)
- **Planification pédagogique + plans de cours** (progressions, cahier de l'enseignant) ⛔
- **Constructeur de rapports / requêtes ad-hoc + tableaux de bord BI** ⛔
- **API REST publique / webhooks** au-delà d'OneRoster ; **SSO** (Google/Microsoft + BH eKey / QA NAS) ◻︎
- **Constructeur de barème de frais** (postes, échéances, logique fratrie/bourse) + **rapports d'impayés/âge** ◻︎
- **RH** : entretien d'évaluation ⛔ ; **suivi d'expiration visa/iqama/permis** 🌙 ⛔ (essentiel au Golfe)
- Sondages/feedback ⛔ · cantine porte-monnaie prépayé/POS ◻︎ · maîtrise par compétences ◻︎ · relevés cumulés (transcripts) ◻︎ · helpdesk maintenance ⛔

---

## 4. Manques d'ARCHITECTURE d'entreprise (SAP / NetSuite / D365)

Pas des fonctionnalités visibles, mais ce qu'un acheteur sérieux et sa procédure d'achat
exigent. Classés par la recherche entreprise (valeur ÷ effort) :

| Rang | Manque | Pourquoi | État réel Coreon |
|---|---|---|---|
| 1 | **Journal d'audit immuable** | « qui a changé cette note ? » — 1re question de tout district / jury d'examen / RGPD. Un intercepteur sur les écritures (qui/quand/rôle/avant→après), non éditable. | ⛔ confirmé absent |
| 2 | **Isolation par tenant (ligne)** | tampon `tenant/école` sur chaque ligne, refus par défaut des lectures inter-tenant. Précondition de toute vente multi-écoles. | ◻︎ contexte prêt (refContext), isolation serveur ⛔ |
| 3 | **Sécurité niveau ligne/champ** | masquer les colonnes sensibles (santé, discipline, finance) ; imposer « déposant ≠ approbateur ». | ◻︎ RBAC oui, ligne/champ non |
| 4 | **Moteur de workflow / approbation configurable** | remplacer les chaînes en dur par une table de règles + machine à états (remises, dérogation de note, admissions). | ⛔ approbations en dur |
| 5 | **Contrôles de clôture de période** | statut ouvert/restreint/clos par trimestre/année, gèle notes/présence/écritures. | ◻︎ promotion d'année oui, clôture non |
| 6 | **Moteur de reporting à dimensions** | dimensions (école, cohorte, matière, enseignant, poste de frais) + vues sauvegardées + drill-down, au lieu de N rapports figés. | ◻︎ insights statiques |
| 7 | **API REST + webhooks** | au-delà d'OneRoster CSV — SIS/LMS/paiement/gouvernement. | ◻︎ export OneRoster seul |
| 8 | **MDM gouvernée + séries de numéros** | données de référence gouvernées (matières, barèmes, postes de frais) + séries par tenant/type. | ◻︎ générateur central existe (refs.js) — extension, pas manque |

**Règle de séquencement de la recherche entreprise :** #1 et #2 vont ENSEMBLE — un journal
d'audit ne vaut rien si un tenant peut lire les lignes d'un autre, et l'isolation ne vaut
rien si on ne peut pas prouver qui a changé quoi. Les livrer en paire, puis la sécurité (#3),
le process (#4/#5), enfin l'analytique/intégration (#6/#7).

---

## 5. Manques de MODÈLE ACADÉMIQUE (ERPNext / Odoo)

ERPNext et OpenEduCat (Odoo) séparent partout **(a) le gabarit réutilisable** (Fee
Structure, Assessment Plan, Grading Scale, Program) de **(b) l'instance par élève** (Fees,
Assessment Result, Program Enrollment), et font de **l'Année/Trimestre un objet de première
classe qui cadre tout le reste** (frais, inscription, évaluation, emploi du temps y font
référence). Coreon modélise plus léger. À bâtir quand on fera la **couche curriculum par
pays** (CR-024).

**Les 4 dorsales à poser en premier** (tout le reste s'y accroche) :
1. **Barème de notation (Grading Scale)** en entité — table d'intervalles seuil % → code
   (A/B/C ou IB 1–7 ou mentions), sélectionnable par évaluation/programme, par pays. Rend
   les notes cohérentes et lettrées/par compétences, pas des chiffres bruts.
2. **Programme › Cours › Chapitre** — la colonne vertébrale du curriculum : des matières
   groupées sous un programme nommé, avec obligatoire/optionnel. Vs notre liste de matières
   plate. Débloque cartographie du curriculum, relevés, écoles multi-niveaux.
3. **Plan d'évaluation (Assessment Plan) + critères pondérés** — une évaluation planifiée
   qui définit critères, score max par critère, pondération, examinateur/surveillant ;
   le résultat calcule une note pondérée automatiquement. Plus structuré que nos
   évaluations quotidiennes.
4. **Gabarit de barème de frais (Fee Structure)** — clé par *catégorie d'élève* (boursier,
   enfant-du-personnel, fratrie) + année/trimestre → génère les factures d'un groupe
   entier d'un coup. Vs nos factures directes.

**Autres objets à considérer :** Trimestre (Academic Term) de première classe (pas juste
`settings.year`) · Groupe d'élèves distinct de la Classe (options, clubs, groupes de langue)
· Relevés cumulés (Transcripts) multi-années · Tuteur (Guardian) en entité liée avec portail
parent · inscription par trimestre (Program Enrollment) · liste de mérite en admission ·
workflow de réclamation (Grievance) distinct de nos incidents · devoirs avec dépôt + rubrique.

Ces concepts ne sont PAS urgents pour la vente ; ils structurent la couche curriculum,
à bâtir marché par marché.

---

## 6. Ce que je recommande, dans l'ordre, vers la vente

**Avant la vente (cette semaine) — aucun nouveau gros chantier :**
1. **Passe de demo-readiness** : école de démo au pays du prospect (BH ou QA), vérifier
   devise/villes/pièces/AR sur chaque écran, répéter le parcours.
2. **Cartes/badges QR (#9)** — petit, `qrPayload()` existe, effet « waouh » immédiat.
3. **Journal d'audit (§4 #1)** — un intercepteur ; le meilleur argument de confiance
   enterprise, et une vue « Historique » par dossier.

**Juste après signature (par marché) :**
4. **Passerelle de paiement régionale (Tier-1 #1)** — le plus gros déclencheur d'achat.
5. **Calendrier Hijri (Tier-1 #4)** — attendu partout au Golfe, effort moyen.
6. **Facturation TVA (Tier-1 #3)** + **export WPS (Tier-2 #7)** — conformité finance.
7. **Transport + GPS (Tier-1 #2)** — gros module, mais très demandé ; planifier tôt.
8. **Reporting ministère (Tier-1 #5)** — par pays, avec le vrai format MOE.

**Fondations (dès qu'on vend à >1 école) :** isolation tenant (§4 #2) + sécurité
ligne/champ (§4 #3), puis moteur de workflow (§4 #4) et clôture de période (§4 #5).

**Franchise honnête pour la vente BH/QA :** les 5 bloqueurs Tier-1 + WPS + biométrie sont
les colonnes « must-have » récurrentes des appels d'offres du Golfe. On ne les aura pas
tous pour ce mois-ci — donc on **vend sur les différenciateurs** (petite enfance, direct,
bilingue, sécurité), on **montre la référence ERP + le journal d'audit** comme sérieux
d'entreprise, et on **s'engage sur une feuille de route datée** pour paiement/Hijri/TVA/
transport. Un acheteur avisé achète une trajectoire crédible, pas une case cochée.

---

## 7. Sources

Entreprise : SAP MDG · D365 cross-company data sharing · NetSuite OneWorld / System Notes /
SuiteTalk · SAP/D365 workflow & posting periods (liens complets dans le journal de recherche).
Scolaire/Golfe : Fedena, Classe365, Focus Softnet Education ERP, openSIS, PowerSchool SIS,
guide SIS NOOR/SADAD/PDPL, Benefit (BH), e-invoicing Qatar, transport RFID/GPS.
