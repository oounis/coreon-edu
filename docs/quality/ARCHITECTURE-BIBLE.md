# Coreon EDU — Product Architecture Bible

> **La constitution du produit.** Toute évolution future se vérifie contre ce document.
> Avant d'écrire une ligne, poser les 4 questions du §12. Si un changement contredit
> un principe ici, c'est le changement qui a tort — ou alors on amende la Bible
> d'abord, en connaissance de cause.
>
> Produit : **Coreon EDU** · Éditeur : **KogiaGroup** · Établi 2026-07-23, tenu à jour.
> Documents liés : [role-model.md](role-model.md) (rôles & permissions),
> [gap-analysis.md](gap-analysis.md) (manques vs ERP pro + priorités Golfe),
> [Coreon-EDU_QA-Test-Workbook.xlsx](Coreon-EDU_QA-Test-Workbook.xlsx) (défauts & demandes).

---

## 0. Vision en une phrase

Coreon EDU n'est pas un logiciel pour UNE école : c'est une **plateforme ERP éducative
régionale, multi-pays / multi-tenant / multi-école / multi-langue**, vendue par KogiaGroup,
qui démarre sur **Bahreïn 🇧🇭 · Qatar 🇶🇦 · Tunisie 🇹🇳 · Libye 🇱🇾** et peut grandir sans
se dupliquer.

Argument de vente : **« plateforme numérique complète pour l'éducation »**, pas « logiciel
scolaire ». Valeur : meilleur suivi élève, meilleure communication parents, meilleure
gestion, meilleures décisions.

---

## 1. Les principes non négociables

1. **Un seul cœur, des configurations.** JAMAIS « Coreon EDU Libye », « Coreon EDU
   Qatar »… Un moteur unique + une couche de configuration par pays. Le code ne dit
   jamais `if (pays === 'Libye')` : il lit une config.
2. **Configuration plutôt que code.** Toute exigence propre à un pays / une école / une
   période est une DONNÉE, pas une branche `if`. Une exigence temporaire ne se résout
   jamais en dur.
3. **Données de référence (master data) au centre.** Pays, Ville, École, Année, Niveau,
   Classe, Matière, Utilisateur, Rôle, Permission : tout dépend d'elles, rien ne les
   réinvente localement.
4. **Deux identités qui ne se mélangent jamais** : la RÉFÉRENCE ERP (générée, identifie
   le dossier) et l'IDENTITÉ HUMAINE (saisie, identifie la personne). Voir §4.
5. **Séparation des tâches et des données par rôle.** Un rôle ne voit et ne fait que ce
   que sa fonction exige. Voir [role-model.md](role-model.md).
6. **API unique, web ET mobile.** Aucune logique métier dupliquée côté mobile : les deux
   clients parlent au même cœur.
7. **Isolation du tenant.** Chaque donnée importante porte son `tenant / école / pays` :
   une école ne voit jamais les données d'une autre.
8. **Rien en silence.** Une écriture qui échoue le DIT ; un reçu ne ment jamais ; une
   action importante laisse une trace (audit).

---

## 2. La hiérarchie SaaS

```
KogiaGroup (plateforme, propriétaire)
        └── Tenant (organisation cliente ; ex. « ABC Education Group »)
                └── École (ex. ABC Primary School)
                        └── Utilisateurs (Direction, Administration, Enseignant,
                                          Surveillant, Sécurité, Parent)
```

Toute table importante porte, à terme : `tenant_id`, `school_id`, `country_id`.
**État actuel :** le contexte (`country`, `tenantCode`, `schoolCode`) vit dans les
paramètres de l'école et alimente déjà la référence ERP (`refContext()` dans `db.js`).
Le mode serveur (`server/`) est mono-école par processus ; l'isolation multi-tenant
complète est un chantier ouvert (voir §11).

---

## 3. La couche de configuration par pays

`core/src/locales.js` **EST** cette couche. Un pays = un objet, décrivant :

| Dimension | État |
|---|---|
| Langue (primaire / secondaire) | ✅ livré (`languages`) |
| Devise, code ISO | ✅ livré |
| Villes (master data, cascade Pays→Ville) | ✅ livré (`cities`) |
| Pièce d'identité (type + validation) | ✅ livré (`idTypes`, `validId`) |
| Cadre légal (RGPD/PDPL/INPDP…) | ✅ livré (`legal`) |
| Fuseau horaire | ⛔ à ajouter |
| Année académique, structure | ◻︎ partiel (`settings.year`) |
| Niveaux, matières, règles d'évaluation, terminologie | ⛔ **couche curriculum, à phaser** |
| Rapports, documents requis | ◻︎ partiel |

**Règle d'or :** ajouter un 5e pays = un objet de plus dans `locales.js`, zéro autre
fichier touché. Si un ajout de pays oblige à toucher un autre fichier, l'abstraction est
cassée — la réparer, pas la contourner.

**La couche CURRICULUM (niveaux/matières/évaluation/terminologie par pays) est le grand
œuvre restant.** Décision tenue : la construire **marché par marché, à la signature de
chaque client**, contre son vrai système éducatif — jamais en spéculation.

---

## 4. Identification — les trois identifiants

Toute entité porte trois choses, jamais confondues :

1. **Clé technique interne** (`id`) — la clé primaire de base. **Jamais montrée.**
2. **UUID** (`uuid`) — pour API, synchronisation mobile, hors-ligne, intégrations.
   `refs.uuid()`.
3. **Référence ERP** (`ref`) — lisible, citable. Le générateur unique est
   `core/src/refs.js` ; aucun module ne fabrique sa propre logique.

Format de la référence :
```
PRÉFIXE-PAYS-TENANT-ÉCOLE-ANNÉE-SÉQUENCE8-CLÉ
STD-BH-T001-SCH001-2026-00000001-7
```
Préfixes : STD TCH PAR EMP ADM INV PAY REQ ACC INC DOC RES EXP. Séquence 8 chiffres,
sans trou, par (type, école, année). Clé de contrôle Luhn sur tout le corps. Immuable,
jamais réutilisée. **Pays/tenant/école/séquence viennent du contexte de confiance,
JAMAIS du client** (`refContext()`).

**Identité humaine** — champs séparés : `{ idType, cin }` (CIN, CPR, QID, passeport, N°
national, acte de naissance…), pilotés par le pack pays. La référence ERP identifie le
DOSSIER ; le passeport identifie la PERSONNE. Ne jamais fusionner.

QR : la référence est une chaîne QR-compatible ; `qrPayload(ref)` rend l'URL de
vérification qu'un futur module (carte, certificat) encodera.

---

## 5. Onboarding d'une école (l'assistant cible)

```
1. Pays  →  2. Ville  →  3. Infos école  →  4. Système éducatif  →  5. Langues  →  6. Activer
```
À l'activation, l'école charge automatiquement : langue, devise, pièce d'identité, cadre
légal, (à venir) curriculum, terminologie, rapports.

**État actuel :** les Paramètres portent déjà Pays → Ville (cascade) + langue + devise +
pièce d'identité + cadre légal. Un **assistant d'onboarding dédié** en 6 étapes reste à
composer (les briques existent, il faut le parcours).

---

## 6. Modules du cœur

```
Coreon EDU
├── Identité & sécurité      (auth, ACL, refs)               ✅
├── Élèves                    (students, admissions)          ✅
├── Enseignants               (teachers)                      ✅
├── Présence                  (attendance)                    ✅
├── Évaluation ★              (evaluate, academic, bulletins) ✅  ← sauce maison
├── Suivi en direct ★         (live)                          ✅  ← sauce maison
├── Installations (piscine/stade au public) ★                ✅  ← sauce maison
├── Portail parent            (payments, journal, gallery…)   ✅
├── Finance                   (accounting, budget, HR/paie)   ✅
├── Documents                 (documents, registre numéroté)  ✅
├── Notifications             (notify + mailer central)       ◻︎ in-app+email ; SMS/push à venir
└── Rapports                  (insights)                      ◻︎ à faire évoluer en moteur
```
★ = différenciateurs Coreon EDU. Ils EXISTENT déjà — c'est l'atout de vente.

---

## 7. Sécurité (données d'enfants)

Exigé : RBAC ✅ · isolation tenant ◻︎(contexte prêt, isolation serveur à faire) ·
**journal d'audit ⛔ (prérequis, absent)** · authentification (session/scrypt en mode
serveur ✅ ; démo en clair, non destinée aux vraies écoles) · politique de mots de passe
◻︎ · chiffrement des données sensibles ⛔ · surveillance d'activité ⛔.

**Audit — la prochaine brique de sécurité à poser.** Chaque action importante :
`{ qui, quand, quoi, ancienne valeur → nouvelle valeur }`. Ex. « Enseignant a changé une
note : 15 → 18, le 2026-01-15 10:30 ». C'est aussi la preuve de conformité RGPD.

---

## 8. Web + Mobile : API-first

```
App Web ─┐
          ├─→ Couche API ─→ Cœur Coreon EDU ─→ Base
App Mobile┘
```
Le cœur (`core/`) est déjà partagé entre web et mobile (même code, `@core`). Le mode
serveur (`server/`) expose l'API. **Jamais** de logique métier propre au mobile.

Mobile — priorités par rôle : Parent (présence, progrès, annonces, messages, paiements) ·
Enseignant (présence, évaluation rapide, communication) · Sécurité (arrivée/départ élève).

---

## 9. Prêt pour l'IA (couche additionnelle)

L'IA sera une COUCHE au-dessus du cœur, jamais mêlée à la logique métier : analyse de
performance, alerte précoce (risque), génération de rapports, assistant enseignant,
chatbot parent. Rien à construire maintenant ; ne rien coder qui l'empêche.

---

## 10. Références étudiées (patterns, pas interfaces)

À analyser pour les PATTERNS d'architecture, jamais pour copier une interface :
- **ERPNext Education** — modélisation élèves/enseignants/cours/frais/évaluation, portails.
  https://docs.frappe.io/education/introduction
- **Odoo Education** — architecture modulaire, rôles, portails parent/enseignant, planning.
  https://apps.odoo.com/apps/modules/16.0/wk_school_management
- **SAP / Oracle NetSuite / Microsoft Dynamics 365** — multi-société, modèle de sécurité,
  master data, moteurs de workflow, pistes d'audit, reporting. Comprendre les principes,
  pas la complexité. https://arxiv.org/abs/2205.02584

À extraire : patterns d'architecture · organisation de la base · séparation en modules ·
conception des workflows · concepts de sécurité · scalabilité SaaS.

---

## 11. État vs cible — le tableau de vérité

| Pilier | Cible | Aujourd'hui |
|---|---|---|
| Multi-pays (4 marchés) | BH/QA/TN/LY configurables | ✅ livré |
| Couche config pays | langue + curriculum + … | ✅ langue · ⛔ curriculum (à phaser) |
| Référence ERP + 3 identifiants | format complet, générateur unique | ✅ livré |
| Identité humaine séparée | type de pièce par pays | ✅ livré |
| Master data Pays→Ville→École | listes, jamais de saisie libre | ✅ Pays→Ville · ◻︎ École sous Ville |
| Modèle de rôles | 8 rôles, séparation des tâches | ✅ spécifié ([role-model.md]) · ◻︎ appliqué en partie |
| Multi-tenant (isolation) | tenant/école/pays sur chaque table | ◻︎ contexte prêt · ⛔ isolation serveur |
| Onboarding wizard | 6 étapes | ◻︎ briques prêtes · ⛔ parcours |
| Audit log | qui/quand/quoi/avant→après | ⛔ à faire (prochaine brique sécurité) |
| Notifications | in-app/email/SMS/push | ◻︎ in-app+email · ⛔ SMS/push |
| Reporting engine | adaptatif pays/école/rôle/année | ◻︎ insights statiques |
| API-first web+mobile | cœur partagé | ✅ cœur partagé · ◻︎ API serveur mono-école |
| Couche IA | additionnelle | ◻︎ non commencée (non bloquée) |

✅ livré · ◻︎ partiel · ⛔ à faire

---

## 12. La règle avant toute implémentation

Avant d'écrire une fonctionnalité, la classer :

1. **Est-ce le CŒUR de Coreon EDU ?** (vaut pour toutes les écoles)
2. **Est-ce SPÉCIFIQUE À UN PAYS ?** → couche config pays (`locales.js` / curriculum)
3. **Est-ce SPÉCIFIQUE À UNE ÉCOLE ?** → paramètres / configuration d'école
4. **Est-ce que ça devrait être CONFIGURABLE ?** → donnée, pas `if` en dur

**Jamais** résoudre un besoin temporaire par du code en dur. En cas de doute entre deux
options, choisir celle qui garde le cœur unique et pousse la variation dans la config.

---

## 13. Séquencement conseillé (vers la vente, fin de mois)

1. **Fait** — multi-pays + villes + référence ERP + identité + rôles documentés.
2. **Avant la vente** — passe de *demo-readiness* : école de démo au pays du prospect,
   vérifier devise/villes/pièces sur chaque écran, répéter le parcours de vente.
3. **À la signature** — couche curriculum du pays signé (contre son vrai système).
4. **Ensuite** — audit log (sécurité) · assistant d'onboarding · isolation multi-tenant
   serveur · moteur de rapports · SMS/push.
5. **Plus tard** — split départemental complet (CR-019/021) · couche IA.

Ne pas ouvrir le chantier curriculum/tenant en spéculation juste avant une vente : d'abord
solidifier et démontrer ce qui existe.
