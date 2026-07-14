# Le processus de version

## Aujourd'hui : pas encore de versions numérotées

Le produit est en développement continu. Il n'y a pas encore de `v1.0` parce
qu'il n'y a pas encore de client. **La première version numérotée arrivera avec
la première vente**, pas avant — numéroter dans le vide serait du théâtre.

## Quand la première vente arrivera

1. Geler `develop`, créer une branche `release/v1.0`.
2. Écrire les **notes de version** — pour la directrice de l'école, pas pour le
   développeur.
3. Valider la **release candidate** en pré-production (staging).
4. Exécuter la liste complète : `docs/release/deployment-checklist.md`.
5. Fusionner dans `main` → la CI teste et déploie.
6. Étiqueter : `git tag v1.0`.

## Le versionnage

`vMAJEUR.MINEUR.CORRECTIF` (SemVer) :
- **MAJEUR** : un changement qui casse (une école doit être prévenue).
- **MINEUR** : une nouvelle fonctionnalité.
- **CORRECTIF** : un bug corrigé.
