# Modèle de rôles Coreon EDU — Direction, Administration, HR, Comptabilité, Surveillant, Sécurité, Enseignant, Parent

> Livrable des demandes **CR-016** (différence Direction / Administration) et **CR-020**
> (relations entre tous les rôles, à tous les niveaux). Sert de **spécification** au
> découpage en départements réels (**CR-019**) et au repositionnement ERP (**CR-021**).
>
> Établi le 2026-07-23, à partir de sources d'organisation scolaire, de contrôle
> interne (séparation des tâches) et de documentation ERP éducative (voir §8).

---

## 1. Les deux principes qui gouvernent tout

**a) Séparation des tâches (SoD).** Aucune personne ne doit pouvoir à elle seule
**initier, autoriser, enregistrer ET rapprocher** la même transaction. C'est le
cœur du contrôle financier scolaire. Les quatre fonctions incompatibles à répartir
sur au moins deux personnes (idéalement trois) : **autorisation**, **exécution du
paiement (garde)**, **enregistrement (saisie)**, **rapprochement (revue)**.

**b) Contrôle d'accès par rôle (RBAC) + portée par ligne.** Chaque rôle ne voit que
les données nécessaires à sa fonction. Les **données sensibles** (santé, discipline,
salaire) sont murées vis-à-vis des rôles qui n'en ont aucun besoin légitime. Un
enseignant est de plus limité à **ses propres classes** (portée par ligne, pas
seulement par rôle).

Ces deux principes tirent dans le même sens et donnent le plan de découpage en
départements.

---

## 2. Les 8 rôles — POSSÈDE / DÉCIDE / APPROUVE / NE DOIT PAS

### Direction (chef d'établissement)
- **Possède :** la stratégie, l'organigramme lui-même, la responsabilité finale,
  l'évaluation du personnel, le calendrier et les politiques.
- **Décide :** recrutement/licenciement (recommandation finale), priorités
  budgétaires, cas limites d'admission, sanctions disciplinaires finales.
- **Approuve :** budgets, achats au-dessus du seuil bureau, congés du personnel,
  bulletins publiés, exclusions, changements de salaire (propose au propriétaire).
- **NE DOIT PAS :** saisir les factures ni exécuter les paiements (cela fusionnerait
  autorisation + garde). La Direction autorise, elle ne touche pas la mécanique de
  décaissement. Elle n'approuve pas sa propre rémunération.
- **ERP :** seul rôle à visibilité inter-départements — mais visibilité ≠ droit
  d'exécution.

### Administration (secrétariat / bureau)
- **Possède :** la couche de données opérationnelles — dossiers élèves, contacts,
  registres de présence, réception des pièces, planification, **réception des demandes**.
- **Décide :** logistique quotidienne, routage d'une demande.
- **Approuve :** uniquement le routinier à faible enjeu (délivrer un certificat,
  fournitures sous seuil). Elle **prépare et soumet**, elle ne donne pas le feu vert
  stratégique.
- **NE DOIT PAS :** approuver budgets ou dépenses élevées ; modifier notes ou
  décisions disciplinaires ; accéder à la paie ou aux dossiers RH ; signer un paiement.
- **ERP :** forts droits de création/édition sur les données opérationnelles élèves ;
  **aucune** autorité sur l'argent ; **aucun** accès RH/paie/santé détaillée.

> **CR-016 — la différence Direction / Administration, en une règle :**
> *L'Administration produit la demande et l'enregistrement ; la Direction produit la
> décision.* Jamais le même compte ne fait les deux sur l'argent ou sur une action RH.

### HR (ressources humaines)
- **Possède :** le dossier maître du personnel — contrats, qualifications (critiques
  en crèche, cf. §5), soldes de congés, dossiers de performance/discipline,
  vérifications de casier.
- **Décide :** mécanique RH (embauche, accrual des congés, conformité).
- **Approuve :** traite embauches, congés, étapes disciplinaires ; **HR administre,
  Direction autorise** la décision d'emploi.
- **NE DOIT PAS :** exécuter le paiement de sa propre paie (le *calcul* peut être RH,
  la *mise en paiement* est Comptabilité). Aucun accès aux dossiers scolaires/finances
  des élèves.
- **ERP :** propriétaire exclusif des données personnelles et sensibles du personnel.
  Invisible pour Administration, Enseignant, Surveillant, Sécurité, Parent.

### Comptabilité / Finance
- **Possède :** le grand livre, la facturation (frais parents), les comptes
  fournisseurs, l'exécution de la paie, le rapprochement bancaire, le reporting.
- **Décide :** imputation, calendrier de décaissement dans le budget approuvé.
- **Approuve :** confirme les fonds ; **maker-checker** — qui approuve un paiement ≠
  qui a saisi la facture ≠ qui rapproche. Ne s'auto-autorise pas la dépense.
- **NE DOIT PAS :** autoriser les achats qu'elle paie ; approuver ses propres factures ;
  rapprocher un compte qu'elle décaisse ; fixer les salaires. Une seule personne qui
  saisit + paie + rapproche = le signal de fraude à empêcher dans la matrice.
- **ERP :** voit les données financières de tous les élèves et les totaux de paie, mais
  **pas** la santé/discipline/scolarité détaillée ni les dossiers RH. Séparation
  *saisie / approbation / rapprochement* en droits distincts.

### Surveillant (vie scolaire)
- **Possède :** la conduite des élèves, le suivi des absences au quotidien, la
  surveillance, le journal des incidents disciplinaires, le bien-être « sur le terrain ».
- **Décide :** interventions immédiates, sanctions mineures, escalade.
- **Approuve :** rien de financier ; consigne et escalade vers la Direction.
- **NE DOIT PAS :** accéder à finance/paie/RH ni créer des notes ; décider seul d'une
  exclusion (escalade) ; voir les données RH du personnel.
- **ERP :** écriture sur présence + incidents ; lecture du répertoire élèves et contacts ;
  **ni argent, ni RH, ni notes**.

### Sécurité
- **Possède :** la sécurité physique, le registre des visiteurs, le contrôle d'accès,
  la réponse aux incidents physiques, le périmètre de sauvegarde.
- **Décide :** qui entre, réponse d'urgence physique.
- **Approuve :** l'entrée des visiteurs ; rien d'académique ou financier.
- **NE DOIT PAS :** accéder aux dossiers scolaires, financiers, RH, santé, discipline.
  A besoin de l'**autorisation de récupération** (qui peut venir chercher l'enfant —
  crucial en crèche) mais **pas** du dossier de l'enfant.
- **ERP :** le rôle le plus étroit — journaux visiteurs/accès, liste des personnes
  autorisées, contacts d'urgence.

### Enseignant
- **Possède :** les dossiers académiques de **sa** classe — notes, contenu, présence,
  évaluation, communication d'apprentissage aux parents.
- **Décide :** notes de ses élèves, gestion de classe, devoirs.
- **Approuve :** rien de financier/RH ; *initie* des demandes (fournitures) et *demande*
  ses congés — qui remontent la chaîne.
- **NE DOIT PAS :** voir les autres classes, la paie/RH, la finance, ni le dossier
  santé/discipline complet au-delà des **drapeaux opérationnels** de sécurité de ses
  propres élèves (une allergie, oui ; l'historique médical, non). Ne s'auto-approuve
  ni congé ni achat.
- **ERP :** portée **par ligne** à ses seuls élèves/classes.

### Parent
- **Possède :** rien dans le système ; sujet de données + contrôleur limité pour les
  consentements/contacts de **son** enfant.
- **Décide :** consentements (sorties, image, données), paiement des frais, mise à jour
  de ses propres coordonnées.
- **Approuve :** les formulaires de son enfant ; paie les factures.
- **NE DOIT PAS :** voir les données d'un autre enfant, quoi que ce soit de
  RH/finance-interne, les notes non partagées, ou les infos d'un autre tuteur.
- **ERP :** le rôle externe le plus restreint — lecture auto-limitée à son enfant +
  écriture sur consentements/paiements uniquement.

---

## 3. Les chaînes d'approbation (partie prête à implémenter)

**Congé du personnel :** Enseignant/Personnel *initie* → **HR** valide droits/solde →
**Direction** autorise → HR enregistre ; si congé payé impactant la paie, **Comptabilité**
exécute. *(demandeur ≠ approbateur ≠ payeur.)*

**Achat / approvisionnement :** Enseignant/Département *initie une réquisition* →
**Administration** vérifie/route → **Direction** (ou détenteur du budget) *autorise*
(motif + dans le budget) → **Comptabilité** confirme les fonds, émet le bon, puis *paie*
→ une *autre* personne Comptabilité *rapproche*. *(initiateur ≠ autorisateur ≠ payeur ≠
rapprocheur.)*

**Facturation & encaissement (argent ENTRANT) :** **Comptabilité** émet la facture au
Parent → **Parent** paie → Comptabilité (personne A) enregistre → Comptabilité (personne
B) ou Direction rapproche mensuellement. L'Administration peut *réceptionner*
l'inscription qui déclenche la facturation mais **ne fixe ni ne remet** les frais
(remises → approbation Direction).

**Paiement fournisseur (argent SORTANT) :** facture reçue → **Comptabilité A** saisit →
**Direction/détenteur du budget** approuve → **Comptabilité B** exécute → **Comptabilité
C ou Direction** rapproche mensuellement. *(le découpage canonique en 4.)*

**Discipline :** Surveillant/Enseignant *consigne* → **Surveillant** applique une sanction
mineure / escalade → **Direction** décide la sanction formelle/exclusion. Donnée sensible,
visible seulement de Surveillant + Direction (+ HR si personnel).

**Paie :** **HR** maintient contrat/taux & calcule → **Direction** approuve le cycle →
**Comptabilité** exécute → rapprochement par une main séparée.

---

## 4. La matrice « NE DOIT PAS VOIR »

| Donnée | Visible par | JAMAIS visible par |
|---|---|---|
| Santé / médical / sauvegarde | carer/enseignant (drapeau opérationnel), Surveillant, Direction, référent | Comptabilité, Sécurité (hors récup.), autres enseignants, autres parents |
| Salaire / paie / contrat | HR, Direction, exécution du paiement (Compta) | Administration, Enseignant, Surveillant, Sécurité, Parent |
| Discipline élève | Surveillant, Direction, enseignant de l'élève (limité) | finance, sécurité, autres parents |
| Discipline / évaluation personnel | HR, Direction | tous les autres |
| Académique (notes) | enseignant de la classe (par ligne) | autres classes |
| Tout dossier enfant | ses propres parents | autres parents |

Application : **RBAC + portée par ligne + journal d'audit** (qui a vu quoi, quand) — le
journal est la preuve de conformité RGPD.

---

## 5. Ce qui change entre crèche (0–~3) et primaire (~3–12)

1. **Unité de pilotage.** Crèche = **responsable de crèche** (conformité des ratios,
   sauvegarde, niveaux de qualification). Primaire = **chef d'établissement** (résultats
   académiques). Le rôle « Direction » doit porter un sous-type : *conformité petite
   enfance* vs *leadership académique*.
2. **Ratios encadrant/enfant** = donnée réglementée et dure en crèche (≈1:3 nourrissons,
   1:5 deux ans…). L'ERP doit suivre **ratios + qualifications** côté crèche (HR +
   Direction petite enfance) ; le primaire non.
3. **Données de santé/soin plus lourdes et opérationnelles en crèche** (repas, sieste,
   allergies, médicaments, change). Plus de personnel a besoin des *drapeaux* santé pour
   les tout-petits — le droit « drapeau santé au besoin » est plus large en crèche.
4. **Autorisation de récupération / contrôle de garde** = préoccupation de premier plan
   Sécurité + Administration en crèche (qui récupère un 0–3), bien plus qu'en primaire.
5. **Le Surveillant est surtout une construction primaire/haut de gamme** ; en crèche, la
   « surveillance » se fond dans le modèle carer/ratio.
6. **Sémantique de présence différente :** crèche = sécurité/ratio (comptage temps réel) ;
   primaire = registre de conformité/académique.

---

## 6. Petite école : « une personne, plusieurs casquettes »

Même quand une seule personne est HR **et** Comptabilité, les **fonctions restent
distinctes dans le système**, et les combinaisons *incompatibles* sont brisées par une
seconde personne (souvent la Direction ou le propriétaire, comme **contrôle
compensatoire**).

- Garder **saisie / approbation / rapprochement** comme trois **droits séparés**, même
  détenus par peu de gens — pour bloquer « qui approuve un paiement ≠ qui l'a saisi ».
- Là où l'effectif force le cumul, insérer un **contrôle compensatoire** : la
  Direction/propriétaire revoit le rapprochement mensuel qu'elle n'a pas préparé.
- Modéliser les rôles comme des **ensembles de permissions composables**, pas des
  personnages monolithiques : un utilisateur peut porter « HR-admin + Paie-calcul » tout
  en étant bloqué sur « Saisie-facture + Exécution-paiement + Rapprochement » sur un même
  compte. Cible raisonnable : **5–10 rôles**.

---

## 7. Conséquences directes pour Coreon EDU (le pont vers CR-017/018/019/021)

1. **CR-019 (départements réels).** Créer des espaces **HR**, **Comptabilité**,
   **Administration** distincts, chacun avec son propre tableau de bord et son propre jeu
   de permissions **composables**. Un utilisateur peut en cumuler plusieurs dans une
   petite école ; le système bloque quand même les combinaisons incompatibles.
2. **Séparation saisie/approbation/rapprochement** à ajouter à la comptabilité existante
   (`core/src/accounting.js`) : aujourd'hui l'émission et l'encaissement existent, mais le
   *maker-checker* n'est pas un droit distinct. C'est le chantier de contrôle interne.
3. **CR-016 tranché** (cf. §2) : Administration = prépare/enregistre ; Direction =
   décide/approuve. À refléter dans `ROUTE_ROLES` et `WRITE_ACL` (`core/src/access.js`,
   `core/src/acl.js`) : retirer à `admin` toute approbation d'argent, la réserver à
   `schooladmin`/`owner`.
4. **Sous-type de Direction** (petite enfance vs académique) et **suivi ratios/
   qualifications** côté crèche — nouveau domaine HR.
5. **Journal d'audit** (qui a vu quoi) : prérequis RGPD, aujourd'hui absent
   (`docs/quality/production-readiness-checklist.md`).

Ces cinq points sont le **backlog concret** des épics ERP. Chacun est maintenant
spécifié ; aucun ne dépend plus d'une supposition.

---

## 8. Sources

1. Séparation des tâches en comptes fournisseurs — Numeric — https://www.numeric.io/blog/segregation-of-duties-accounting
2. Séparation des tâches AP (rôles : saisie/approbation/paiement/rapprochement) — SecurEnds — https://www.securends.com/blog/segregation-of-duties-in-accounts-payable/
3. Segregation of Duties + contrôles compensatoires (petite structure) — Cornell Financial Services — https://finance.cornell.edu/controller/internalcontrols/unitlevelactivities/segregation
4. Structure organisationnelle d'une école (conseil → chef → dépts) — Scholarship Institute — https://scholarshipinstitute.org/blog/what-is-the-typical-organizational-structure-of-a-school/
5. Chef d'établissement : stratégique vs administratif — Wikipedia — https://en.wikipedia.org/wiki/Head_teacher
6. Chaîne de réquisition d'achat (enseignant → principal autorise → finance paie) — PowerSchool ERP / Albuquerque Public Schools — https://pserp.powerschool-docs.com/pserp-sys-admin/latest/requisition-workflow
7. Modèle de rôles de base + 5–10 rôles/district — PowerSchool SIS / Schoology — https://ps.powerschool-docs.com/pssis-admin/latest/admin-access-and-roles
8. Données sensibles élèves, RBAC + audit (FERPA/RGPD) — Secure Privacy / hoop.dev — https://secureprivacy.ai/blog/student-data-privacy-governance
9. Ratios encadrant/enfant, qualification du responsable (crèche vs primaire) — Ofsted early years — https://earlyyears.blog.gov.uk/2023/04/20/how-staff-to-child-ratios-work/
