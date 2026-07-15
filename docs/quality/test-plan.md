# Le plan de test — les RÈGLES, pas les lignes

On ne mesure pas la couverture des lignes : on mesure la couverture des **neuf
règles non négociables** (`docs/PLAN.md` §5) et des parcours qui font le produit.

## Les 9 règles — chacune doit avoir un test qui la prouve

| # | La règle | Prouvée par | État |
|---|---|---|---|
| 1 | Un enfant ne part **jamais** avec quelqu'un qui n'est pas sur la liste | `core.test.mjs` « règle n°1 : un enfant ne part JAMAIS avec quelqu'un hors liste » | ✅ (2026-07-15) |
| 2 | **Deux paires d'yeux** sur un accident : qui déclare ne valide pas | `core.test.mjs` « bureau : chaque étape d'un accident… » | ✅ |
| 3 | Personne ne valide **sa propre** demande (congé, dépense) | `core.test.mjs` « personne ne décide de sa propre demande », « séparation des pouvoirs » | ✅ |
| 4 | Une facture émise **ne se modifie pas** — on l'annule par un avoir | `core.test.mjs` « règle n°4 : … on l'annule par un AVOIR » | ✅ (2026-07-15) |
| 5 | On **archive**, on ne supprime jamais un dossier scolaire | `core.test.mjs` « règle n°5 : on ARCHIVE… » | ✅ (2026-07-15) |
| 6 | **La capacité décide** : jamais une place promise qui n'existe pas | `core.test.mjs` « règle n°6 : la capacité décide » — le test passe par la porte (pièces → étude → accepté) | ✅ (2026-07-15) |
| 7 | **On n'invente rien** — ni un chiffre, ni un client, ni une donnée | `core.test.mjs` « jamais de faux reçu » ; faux témoignages supprimés du site | ✅ (partiellement — c'est aussi une règle éditoriale) |
| 8 | La **pédagogie** passe avant l'argent (un cours ne se fait pas déloger) | `core.test.mjs` « règle n°8 : la pédagogie passe avant l'argent » | ✅ (2026-07-15) |
| 9 | On **observe** un enfant, on ne le note pas — et on ne le compare à personne | `results.js` / évaluation | ⚠️ Trou (règle de conception, difficile à tester) |

> **Dette fermée le 2026-07-15 :** 8 règles sur 9 sont désormais tenues par un
> test d'exécution. La règle n°9 (observer, ne pas classer) reste une règle de
> conception — elle se vérifie en revue, pas en test.

## Les parcours du produit

| Parcours | Fichier | État |
|---|---|---|
| Le parent dépose (photo lourde, quota, reçu honnête) → la direction décide | `e2e/parcours.public.mjs` | ✅ |
| Demande → 2 validations → assignation → clôture → bilan du mois | `e2e/parcours.demandes.mjs` | ✅ |
| Bascule arabe, RTL, candidature complète en arabe | `e2e/parcours.arabe.mjs` | ✅ |
| 60 pages × 5 rôles : erreurs JS, pages vides, `NaN`/`undefined` | `e2e/parcours.smoke.mjs` | ✅ |
| **Chaîne d'accident de bout en bout dans l'interface** (schéma corporel → validation → parent signe) | — | ❌ **À écrire** |
| **Paie : préparer → prime → valider → verrouiller** | — | ❌ À écrire (le cœur est testé, pas l'écran) |

## Les tests par fonctionnalité future

Toute nouvelle fonctionnalité arrive avec, **dans le même commit** :
1. son test d'exécution dans `core/` si elle porte une règle ;
2. son parcours dans `e2e/` si elle change ce qu'un utilisateur fait ;
3. sa ligne dans `regression-checklist.md` si elle corrige un défaut.
