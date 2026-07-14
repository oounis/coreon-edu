# La stratégie de branches

## La cible (professionnelle)

```
main      → PRODUCTION. Protégée. Chaque commit déploie (edu.kogiagroup.com).
develop   → développement actif. On y intègre avant de passer en production.
feature/* → une fonctionnalité = une branche, fusionnée dans develop.
```

## Aujourd'hui, honnêtement

Le projet a été mené par un seul développeur à un rythme rapide : tout est allé
sur `main`, et `main` déploie. **La branche `develop` existe désormais** et
devient l'endroit du travail en cours ; `main` ne reçoit que ce qui est prêt à
être en ligne.

## La règle simple

| Je fais quoi ? | Sur quelle branche ? |
|---|---|
| Une nouvelle fonctionnalité | `feature/nom` → fusionnée dans `develop` |
| Du travail en cours | `develop` |
| Mettre en ligne | fusionner `develop` → `main` (la CI teste puis déploie) |
| Un correctif urgent en production | `hotfix/nom` → `main` **et** `develop` |

## Le garde-fou

La CI tourne sur **chaque `push` et chaque pull request** vers `main` :
tests du cœur → build + parcours navigateur → déploiement → smoke de production.
Un test rouge **bloque**. Donc même une erreur sur `main` est arrêtée avant la
mise en ligne.
