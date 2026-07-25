# Plan des épics ERP — CR-017 · CR-018 · CR-021

_Rédigé le 2026-07-23. Statut : **plan à décider avec Othman** — aucun de ces
chantiers n'est lancé. Ils touchent le modèle de données ; ils se planifient, ils
ne s'improvisent pas dans une session._

Ce document répond à la demande « juste un plan cette session » pour les trois
épics XL restés au statut **NEW** dans le classeur QA. Il s'appuie sur ce qui est
**déjà construit** et sur trois documents existants : la **Bible d'architecture**
(§11 état↔cible, §13 séquencement), le **modèle de rôles** (§7 le pont vers ces
épics) et l'**analyse d'écart** (`gap-analysis.md`).

---

## 0. Ce qui est DÉJÀ fait (pour ne pas le reconstruire)

| Brique | État | Où |
|---|---|---|
| Générateur unique de référence ERP (préfixe‑pays‑tenant‑école‑année‑séquence‑Luhn) | **Construit** | `core/src/refs.js` + `db.assignRef` |
| 13 préfixes d'entité (STD, TCH, PAR, EMP, ADM, INV, PAY, REQ, ACC, INC, doc, booking, expense) | **Construit** | `refs.js` `PREFIX` |
| Séquence sans trou par (type, école, année), contexte serveur jamais client | **Construit** | `refs.js` `nextRef` + `refContext()` |
| Référence affichée sur plusieurs écrans | **Partiel** | Students, Teachers, Admissions, Documents, Requests, StudentProfile |
| Champs d'identité humaine `{ idType, cin }` par pays (CIN/CPR/QID/passeport) | **Construit** | `locales.js` `idTypes/validId` |
| Départements réels cloisonnés (RH, Comptabilité, Administration) | **Construit (CR-019)** | `access.js`, `acl.js`, dashboards dédiés |
| Modèle de rôles écrit (8 rôles, POSSÈDE/DÉCIDE/APPROUVE/NE‑DOIT‑PAS) | **Construit (CR-016/020)** | `docs/quality/role-model.md` |

**Conclusion :** CR-017 et CR-018 ne partent PAS de zéro. Le générateur et les
champs d'identité existent. Ce qui manque est la **couverture complète**,
l'**entité Personne unifiée**, la **migration des données de démo**, et
l'**affichage systématique** — pas l'invention d'un format.

---

## 1. CR-021 — « un vrai ERP » : la définition qui chapeaute

CR-021 n'est pas un chantier de code : c'est la **définition** dont 017 et 018
sont des enfants. Un « vrai ERP » pour Coreon = ces six propriétés (source :
`gap-analysis.md` §architecture + role-model §7) :

1. **Départements** avec permissions composables — ✅ fait (CR-019).
2. **Identité & numérotation documentées** — CR-017 / CR-018 (ce plan).
3. **Séparation des tâches** (maker‑checker : saisir ≠ approuver ≠ rapprocher) — partiel : à ajouter à `accounting.js`.
4. **Journal d'audit** (qui a vu/modifié quoi) — absent, prérequis RGPD.
5. **Clôture de période** (un mois comptable se ferme, on ne réécrit pas l'histoire) — absent.
6. **Comptabilité en partie double** — aujourd'hui simple‑entrée ; décision produit à prendre (voir §5).

> **Décision à prendre avec Othman (D-1) :** jusqu'où va « vrai ERP » pour la
> **vente de fin juillet** ? Ma recommandation : 1‑2‑3 suffisent pour un pilote
> crédible ; 4‑5‑6 sont la V2. Ne pas bloquer la vente sur la partie double.

---

## 2. CR-017 — la référence ERP partout, sans trou, immuable

**Objectif d'acceptation (classeur) :** schéma documenté ✅, un préfixe par type
✅, IDs sans trou / immuables / jamais réutilisés / **affichés partout** ⟵ le
reste, démo migrée ⟵ le reste.

| # | Étape | Effort | Dépend |
|---|---|---|---|
| 17.1 | Auditer les créateurs d'entité : lister chaque endroit qui pousse un enregistrement et vérifier qu'il appelle `assignRef`. Combler les trous (paie, dépenses, réservations, incidents…). | M | — |
| 17.2 | Garantir l'**immuabilité** : une fois émise, la référence ne se recalcule jamais (test qui échoue si un `assignRef` écrase une ref existante). | S | 17.1 |
| 17.3 | **Migration** des données de démo (v-suivante) : attribuer une référence rétroactive à tout enregistrement seed qui n'en a pas, dans l'ordre de création, sans trou. | M | 17.1 |
| 17.4 | **Affichage systématique** : composant `<Ref/>` (mono, copiable, avec validation Luhn visuelle) posé sur chaque fiche/ligne/document où le dossier apparaît. | M | 17.1 |
| 17.5 | Tests d'exécution : sans‑trou par (type, école, année), Luhn rejette une ref mal recopiée, unicité, immuabilité. | S | 17.1‑17.4 |

**Total ≈ 1 à 1,5 semaine.** Risque : faible (le générateur est prouvé) ; le
travail est de la couverture, pas de la conception.

---

## 3. CR-018 — l'entité Personne (une personne, plusieurs rôles)

Aujourd'hui l'identité vit dispersée dans chaque entité (`{idType, cin}` sur
l'élève, l'enseignant, le parent). Le vrai besoin ERP : **une seule Personne**
peut être à la fois parent d'un élève, employée de l'école et enseignante — sans
ressaisir son identité trois fois, et sans que trois dossiers divergent.

| # | Étape | Effort | Dépend |
|---|---|---|---|
| 18.1 | Définir l'entité **Person** : `{ ref(PRS), idType, idNumber, issuingCountry, expiry, names, contact }`. Type de pièce **choisi**, pas figé à CIN. | M | CR-017, D‑2 |
| 18.2 | **Unicité** par (type de pièce, pays) : deux dossiers ne peuvent pas revendiquer le même passeport. | M | 18.1 |
| 18.3 | **Liens de rôle** : une Person ↔ N rôles (parent, employé, enseignant). Les entités métier pointent vers un `personId` au lieu de recopier l'identité. | L | 18.1 |
| 18.4 | **Sensibilité** : les données d'identité sortent des blobs vus par le personnel (défaut‑refus, comme le blob parent) — RGPD. | M | 18.1, acl.js |
| 18.5 | Migration démo : dédupliquer les personnes existantes (le parent p1 qui a deux enfants = **une** Person). | L | 18.3 |

**Total ≈ 2 à 3 semaines.** Risque : **élevé** — c'est une refonte du modèle de
données (les entités cessent de porter l'identité, elles la référencent). À faire
**après** 017, jamais en même temps.

> **Décision à prendre avec Othman (D-2) :** faut‑il l'entité Person **avant** le
> premier pilote ? Ma recommandation : **non**. Un pilote crèche/primaire tourne
> très bien avec l'identité par entité. Person est un investissement pour le
> multi‑établissement et le Golfe (où un parent expatrié change de pièce). À
> planifier quand un 2ᵉ marché signe, pas avant.

---

## 4. Séquencement recommandé (le fil vers la vente)

```
MAINTENANT ─────────────────────────────────────────────► V2
  Démo‑readiness (les 4 notes finissables) ✅ cette session
        │
        ▼
  CR-017  ██████░░  (1–1,5 sem, risque faible)     ← à lancer en 1er
        │            couvre + affiche + migre les références
        ▼
  Séparation des tâches (accounting maker‑checker)  ← petit, fort signal ERP
        │
        ▼
  Journal d'audit (RGPD)                            ← prérequis pilote réel
        │
        ▼
  CR-018  ████░░░░  (2–3 sem, risque élevé)         ← quand un 2ᵉ marché signe
        │            entité Person, refonte identité
        ▼
  Clôture de période + (décision) partie double     ← V2 « vrai ERP » complet
```

**Pourquoi cet ordre :** CR-017 est presque fini et à faible risque → gain
visible vite (des références propres partout, ça « fait ERP » immédiatement). La
séparation des tâches et le journal d'audit sont **petits** mais donnent le plus
de crédibilité ERP par heure investie. CR-018 est le plus lourd et le moins
urgent pour un premier pilote → il vient en dernier, porté par un vrai besoin
(2ᵉ établissement / Golfe), pas par anticipation.

---

## 5. Les trois décisions à prendre ensemble

- **D-1 — Portée de « vrai ERP » pour la vente** : s'arrêter à départements +
  numérotation + séparation des tâches (recommandé), ou viser aussi partie double
  + clôture avant de vendre (retarde la vente).
- **D-2 — Person avant pilote ?** : non recommandé avant un 2ᵉ marché.
- **D-3 — Partie double ?** : décision produit lourde. La simple‑entrée actuelle
  suffit pour une crèche/école ; la partie double vise l'acheteur « groupe ».
  À trancher seulement si un prospect l'exige.

_Rien dans ce plan n'est engagé. Il attend ta décision sur D‑1/D‑2/D‑3 avant
qu'une seule ligne du modèle de données ne bouge._

---

## 6. ✅ DÉCISIONS PRISES — 2026-07-25

Othman a **délégué la décision** (« go with your recommendation and decide instead
of me »). Les trois recommandations deviennent donc les décisions :

- **D-1 — TRANCHÉ :** « vrai ERP » pour la vente = départements ✅ + numérotation
  (CR-017, à lancer) + séparation des tâches (maker‑checker). Le maker‑checker
  paie est **fait** (commit 85fb30d) ; celui de la facturation suit avec CR-029.
  Journal d'audit = prérequis du **pilote réel**, pas de la vente. Partie double
  et clôture de période = V2.
- **D-2 — TRANCHÉ :** **pas** d'entité Person avant le premier pilote. CR-018
  reste planifié, déclenché par la signature d'un 2ᵉ marché / multi-établissement.
- **D-3 — TRANCHÉ :** **pas** de partie double tant qu'aucun prospect ne l'exige.
  La simple entrée + maker‑checker + références CR-017 suffisent au pilote.

**Ordre d'exécution acté :** finir CR-028 par tranches (1er volet livré) →
CR-029 socle comptable (maker-checker facture, barème de frais) → CR-017
références partout → journal d'audit → [pilote] → CR-018.
