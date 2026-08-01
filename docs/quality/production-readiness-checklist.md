# Prêt pour la production ? — La réponse honnête : PAS ENCORE

> Ce document existe pour qu'aucune vente, aucune démonstration enthousiaste et
> aucune nuit de code ne fasse oublier ceci :
>
> ## 🔴 **AUCUNE ÉCOLE RÉELLE NE DOIT METTRE SES DONNÉES DANS COREON EDU AUJOURD'HUI.**
>
> Le produit est **excellent en démonstration** et **incomplet en production**.
> Les deux affirmations sont vraies en même temps, et il faut les dire ensemble.

## Ce qui bloque, précisément

| Verrou | Pourquoi c'est bloquant | Levée |
|---|---|---|
| **Il n'y a pas de backend** | Tout vit dans le `localStorage` du navigateur. Les données ne sont **ni partagées entre appareils, ni sauvegardées, ni protégées**. Un directeur qui vide son cache perd son école. | Backend |
| **Mots de passe en clair, rôle côté client** | Escalade de privilèges triviale (`security-checklist.md`) | Backend |
| **Aucune sauvegarde** | Aucune restauration possible. Pour un dossier scolaire, c'est disqualifiant. | Backend |
| **Quota du navigateur (~5 Mo)** | Une école réelle le dépasse en quelques semaines de pièces jointes. Le produit **le dit désormais honnêtement** au lieu de perdre les données en silence — mais la limite reste. | Backend + stockage de fichiers |
| **Écriture concurrente** | Deux onglets, deux enseignants : le dernier écrase le premier. | Backend |
| **Conformité INPDP / RGPD** | Données de santé d'enfants. **Journal d'audit livré le 2026-08-01** (CR-039, `core/src/audit.js`) : qui a lu / modifié quel dossier sensible. Restent le registre des traitements, le chiffrement, et l'immuabilité serveur du journal. | Backend + travail juridique |

## Ce qui est DÉJÀ prêt pour la production (et c'est beaucoup)

- **Les règles du métier sont dans le cœur**, testées par exécution, partagées
  mot pour mot entre le web et le mobile. Le backend ne les réécrira pas — il
  les hébergera.
- **La couture du stockage est unique** (`core/src/storage.js`) : le jour du
  backend, **c'est ce seul fichier qui devient un cache**, et `db.js` ne change pas.
  *L'architecture a été faite pour ce jour-là.*
- **L'export OneRoster v1.2** : les données de l'école sont récupérables en un
  clic, dès aujourd'hui. « Vos données sont à vous » n'est pas un slogan.
- **La chaîne de qualité** : tests, parcours, smoke, smoke de production — et la
  CI qui refuse de déployer si l'un d'eux échoue.
- **L'accès est refusé par défaut** (`access.js`), et cloisonné par rôle.

## Le jour du premier pilote — l'ordre des choses

1. Backend (authentification serveur, base réelle, sauvegardes).
2. Exécuter `security-checklist.md` § « le jour où le backend existe » **en entier**.
3. Environnement de **pré-production** = exécuter enfin les tests de perf, de
   charge et de sécurité offensive de `performance-plan.md`.
4. **UAT avec une vraie directrice**, sur ses vraies données, dans son école.
5. Migration testée sur une **copie** de ses données.
6. Procédure de retour arrière **essayée**, pas seulement écrite.
7. Supervision : erreurs, disponibilité, sauvegardes vérifiées.

## Supervision & observabilité (à construire avec le backend)

- [ ] Suivi des erreurs (Sentry ou équivalent) — **aujourd'hui, une erreur chez
      un utilisateur est invisible pour nous**.
- [ ] Disponibilité du site (une sonde externe).
- [ ] Alerte si la sauvegarde ne s'est pas faite.
- [x] Retour utilisateur : un canal réel, pas une adresse e-mail qui rebondit.
      *(✅ 2026-07-15 : la boîte Zoho `contact@kogiagroup.com` existe (créée le
      09/07) et le DNS est complet — MX vers Zoho, SPF, DKIM, DMARC vérifiés
      par requête. Reste le test de bout en bout : un courriel envoyé et lu.)*
