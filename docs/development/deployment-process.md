# Le processus de déploiement

## Comment ça marche aujourd'hui (automatique)

Un `push` sur `main` déclenche la CI (`.github/workflows/deploy.yml`), qui
enchaîne **quatre étages, chacun bloquant le suivant** :

```
1. QUALITÉ   → tests du cœur (19) + audit des dépendances
2. BUILD     → construit le bundle, PUIS le teste au navigateur
               (parcours public · demandes · arabe · smoke 60 pages × 5 rôles · UI mobile)
3. DÉPLOIE   → seulement si 1 et 2 sont verts
4. SMOKE-PROD → interroge le VRAI site : répond-il 200 ? sert-il NOTRE bundle ?
```

Si un test échoue, **rien ne part en ligne**.

## Après le déploiement

- Vérification humaine à la première ouverture : **rechargement forcé**
  (Ctrl+Shift+R) — le navigateur garde l'ancien bundle en cache.
- Le domaine `edu.kogiagroup.com` a un certificat SSL (HTTPS forcé).
- L'ancienne adresse GitHub redirige vers le domaine.

## Le jour du backend (staging → production)

Ce processus s'étoffera : déploiement en staging d'abord, migrations de base de
données, sauvegardes vérifiées, puis promotion en production. Voir
`docs/release/deployment-checklist.md`.
