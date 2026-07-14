# Plan de sauvegarde

## Aujourd'hui : il n'y a rien à sauvegarder côté serveur

Les données vivent dans le `localStorage` de chaque navigateur. **Il n'y a
aucune sauvegarde**, et c'est l'une des raisons pour lesquelles **aucune école
réelle ne doit encore y mettre ses données**
(`docs/quality/production-readiness-checklist.md`).

Ce qui protège quand même l'utilisateur aujourd'hui :
- **L'export OneRoster v1.2** : l'école peut sortir ses données en un clic,
  quand elle veut. C'est sa sauvegarde manuelle.
- **Le code est sauvegardé** dans Git (GitHub).

## Le jour du backend — la règle des sauvegardes

- [ ] Sauvegarde **automatique quotidienne** de la base.
- [ ] **Testée** : une sauvegarde jamais restaurée n'est pas une sauvegarde.
- [ ] Conservée **hors du serveur principal** (autre région).
- [ ] Chiffrée (données de santé d'enfants).
- [ ] Restauration testée tous les mois.
- [ ] Alerte si une sauvegarde échoue.
