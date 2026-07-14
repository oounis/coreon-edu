# Le cycle de vie du produit (SDLC) — Coreon EDU

**Où en est-on, honnêtement, au 2026-07-15 :**

| Phase | État | Environnement |
|---|---|---|
| 1 · Planification & fondation | ✅ Fait (voir `docs/PLAN.md` = le carnet de bord vivant) | — |
| 2 · Environnement de développement | ✅ Fait (dépôt propre, CI qui bloque, cœur partagé web/mobile) | Local + GitHub |
| 3 · Développement des fonctionnalités | 🔵 **EN COURS** (c'est là qu'on vit) | Local + GitHub |
| 4 · Tests internes / QA | ✅ Automatisé et bloquant (voir `docs/quality/`) | Local + GitHub |
| 5 · Pré-production (staging) | ⏳ **BLOQUÉ : pas de backend** | À créer |
| 6 · Préparation de version | ⏳ En attente de la première vente | — |
| 7 · Déploiement production | 🟡 Partiel (le site est en ligne, mais **sans données réelles**) | edu.kogiagroup.com |
| 8 · Post-production | ⏳ En attente (pas encore de vrais utilisateurs) | — |

## La règle qui gouverne tout

> Le produit est **excellent en démonstration** et **pas prêt pour les données
> réelles d'une école**. Les deux sont vrais en même temps. On ne bloque pas le
> développement en attendant le backend — on construit la fondation maintenant,
> on automatise, et on écrit les listes pour plus tard.

## Le verrou avant chaque avancée

Pour chaque fonctionnalité, avant de la dire « finie », on vérifie :
1. **Phase SDLC actuelle** — où elle en est.
2. **Fait / en attente** — ce qui est prouvé, ce qui manque.
3. **Environnement** — ce qui est testable ici, ce qui attend le staging.
4. **Validation requise** avant d'avancer.

Voir `docs/quality/` pour la partie tests, et `docs/PLAN.md` pour l'état réel.
