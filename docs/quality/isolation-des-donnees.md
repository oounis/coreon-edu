# Coreon EDU — isolation des données et sécurité (note d'une page)

*Destinée au responsable informatique d'une école qui évalue Coreon. Version du 2026-08-11.*

## Frontière entre écoles

Chaque école reçoit **sa propre base de données et son propre serveur**. Deux
écoles ne partagent aucune infrastructure applicative : ni base, ni processus,
ni fichier. Il n'existe donc pas de requête, même mal écrite, capable de lire
les données d'une autre école — il n'y a rien à atteindre.

C'est un choix délibéré : un modèle multi-locataire (toutes les écoles dans une
base commune, séparées par un filtre) fait reposer la confidentialité sur la
justesse de chaque requête. Ici elle repose sur l'absence de lien.

**Vérification indépendante (2026-08-11)** : un jeton de session émis par
l'école A a été présenté au serveur de l'école B → refusé (401), et
réciproquement. Chaque jeton n'est accepté que par sa propre école.

## Authentification

- Mots de passe **hachés (scrypt)**, jamais stockés en clair.
- Sessions de 8 h, révocables.
- Accès **refusé par défaut** : chaque rôle ne reçoit que les données de son
  périmètre (direction, enseignant, parent…), filtrées côté serveur.
- Les tentatives refusées sont journalisées (première trace d'une intrusion) ;
  le mot de passe essayé ne l'est jamais.
- Écritures protégées par **verrou de révision** : deux modifications
  simultanées ne peuvent pas s'écraser silencieusement.

## Sauvegardes et restauration

- Sauvegarde datée au démarrage puis **toutes les 6 heures**, rotation sur 30.
- ⚠️ **À faire avant le pilote** : exécuter et documenter une **restauration
  testée**. Une sauvegarde jamais restaurée n'est pas une sauvegarde.

## Hébergement et transport

- Données hébergées en **Europe** (Francfort pour l'application, région
  européenne pour la base).
- **HTTPS/TLS** sur tous les échanges ; la base n'est pas exposée publiquement.
- Origines autorisées restreintes au domaine de l'école.

## Données personnelles

- Conformité visée : **loi tunisienne 2004-63 / INPDP**.
- La supervision technique (erreurs, disponibilité) est **expurgée** : pas
  d'identité, pas de contenu scolaire, pas de corps de requête. Aucun
  enregistrement de session.
- Rétention et suppression : sur demande de l'école, ses données et son instance
  sont supprimées ; la séparation physique rend la suppression complète et
  vérifiable.

## Contact incident

`contact@kogiagroup.com` — engagement de réponse à préciser dans la convention
de pilote (voir §Reste à formaliser).

## Reste à formaliser avant signature d'un pilote

1. Restauration testée et documentée.
2. Délai d'engagement en cas d'incident et procédure de notification.
3. Convention de traitement des données (sous-traitants : hébergeur, base,
   supervision).
