# Liste de contrôle — déploiement

## Avant chaque mise en ligne (aujourd'hui : automatique via CI)

- [ ] `npm test --prefix core` — vert
- [ ] `npm run all --prefix e2e` — vert (parcours + smoke + UI)
- [ ] Aucun secret dans le diff (dépôt public)
- [ ] Le défaut corrigé a un test de régression
- [ ] Le carnet (`docs/PLAN.md`) est à jour

## Après (automatique)

- [ ] Smoke de production : le site répond 200 et sert notre bundle

## Le jour du backend — ce qui s'ajoutera

- [ ] Migration de base testée sur une **copie** des données réelles
- [ ] Sauvegarde vérifiée **avant** la migration
- [ ] Plan de retour arrière prêt (`rollback-plan.md`)
- [ ] École prévenue de la fenêtre de maintenance
- [ ] Supervision active (erreurs, disponibilité)
