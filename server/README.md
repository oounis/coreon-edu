# Le serveur Coreon — pilote v1

Un seul processus Node (≥ 20), **zéro dépendance**.

> ⚠️ **Une école par processus — limite temporaire, PAS un principe.**
> La [Bible d'architecture](../docs/quality/ARCHITECTURE-BIBLE.md) définit Coreon
> comme une plateforme **multi-tenant / multi-école**, et le modèle de données le
> porte déjà (`refContext()` : pays / tenant / école / année). Ce serveur ne lit
> pas encore ces valeurs depuis la session : il sert un blob `school` unique.
> D'ici là, chaque école reçoit sa propre instance (`ops/provision-school.sh`) —
> décision d'exploitation datée du 2026-08-11, valable jusqu'à ~10 écoles,
> détaillée au §0 bis de la Bible. **N'écrivez pas de code qui suppose une seule
> école** : il faudra le défaire.

Il lève
les verrous de `docs/quality/production-readiness-checklist.md` : mots de passe
hachés (scrypt), données servies **par rôle** (`core/src/acl.js`, défaut refus),
écritures sous **verrou de révision** (fini le « dernier écrase le premier »),
sauvegardes datées automatiques.

## Démarrer (local)

```bash
node server/import.mjs --demo     # une fois : sème l'école de démonstration
node server/server.mjs            # → http://localhost:8787
```

## Reprendre les données d'une vraie école

Dans le navigateur de l'école : console → `copy(localStorage.coreon_db)` →
coller dans `export.json`, puis :

```bash
node server/import.mjs export.json
```

## Brancher l'application

Le client passe en mode serveur quand `coreon_api` est posé :

```js
localStorage.setItem('coreon_api', 'https://api.votre-hote.tld')  // puis recharger
```

Sans cette clé, rien ne change : la démo publique reste 100 % locale.

## Déployer

Deux voies, selon le budget (comparées en 2026-08 — le paysage des offres
gratuites change vite, revérifier avant de choisir si ce document a plus de
quelques mois) :

### A. Gratuit — Render (web service) + Turso (base) — ⭐ voie actuelle
Le disque de Render (plan gratuit) est **effacé à chaque redémarrage/déploiement**
— `store.mjs` (fichiers locaux) y perdrait toutes les données. `server/store.turso.mjs`
résout ça : même interface `{read, write, backup}`, mais persistée sur une base
Turso (libSQL) distante, gratuite, sans carte (5 Go, 1 Md lignes lues/mois,
25 M écrites/mois — largement suffisant pour une école). C'est la SEULE
dépendance npm du serveur (`server/package.json`, `@libsql/client`) — activée
uniquement si `TURSO_DATABASE_URL` est posé ; sans cette variable, `server.mjs`
reste zéro-dépendance comme avant (fichiers locaux).

1. Base Turso (une fois) :
   ```bash
   curl -fsSL https://get.tur.so/install.sh | bash   # CLI, pas de carte requise
   turso auth login                                   # ouvre le navigateur
   turso db create coreon-edu
   turso db show coreon-edu           # → note l'URL libsql://…
   turso db tokens create coreon-edu  # → note le jeton (secret, hors dépôt)
   ```
2. Importer l'école (une fois, en pointant déjà sur Turso) :
   ```bash
   cd server && npm install   # installe @libsql/client
   TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… node import.mjs --demo
   # (ou node import.mjs export.json pour une vraie école)
   ```
3. Render : nouveau Web Service, dépôt `oounis/coreon-edu`, répertoire racine
   `server`, commande de build `npm install`, commande de démarrage
   `node server.mjs`. Variables d'environnement :
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `COREON_ORIGINS=https://edu.kogiagroup.com`,
   `PORT` (Render le fournit automatiquement — le lire quand même via `process.env.PORT`,
   déjà fait). Ne PAS poser `COREON_DATA` (inutile, le disque est de toute façon éphémère).
   Ne pas poser `COREON_STATIC` : l'application reste servie par GitHub Pages.
4. Connaître le compromis : instance gratuite Render = **mise en veille après
   inactivité**, première requête du matin ~30-60 s le temps du réveil. Les
   écritures (`store.write`) sont fire-and-forget vers Turso — le serveur
   répond avant confirmation d'écriture distante (la donnée VRAIE reste en
   mémoire process pendant sa durée de vie ; Turso n'est qu'une couche de
   DURABILITÉ contre un redémarrage, pas le chemin de lecture).
5. Vérifié de bout en bout le 2026-08-03 : lecture/écriture/sauvegarde/rotation
   contre une base Turso réelle, plus un cycle complet login → lecture → écriture
   via `server.mjs` démarré avec `TURSO_DATABASE_URL` posé — la valeur écrite
   par l'API est bien retrouvée en interrogeant Turso directement (pas
   seulement en mémoire process).

### B. Payant, ~5 €/mois — VPS (Hetzner…) ou PaaS (Fly.io, Railway)
Aucun changement de code : `server.mjs` tourne tel quel, fichiers locaux
(`store.mjs`), disque persistant. Variables : `PORT`, `COREON_DATA` (répertoire
des données), `COREON_ORIGINS`, `COREON_STATIC=../app/dist` pour servir aussi
l'application. HTTPS par le reverse-proxy de l'hôte (Caddy fait ça en 3 lignes).
Fly.io et Railway n'ont plus de palier gratuit sérieux en 2026 (carte exigée
dès l'inscription) — seule cette voie reste réellement à coût nul.

**Sauvegardes** : copie datée au démarrage + toutes les 6 h (rotation 30) —
dans `data/backups/` pour la voie B, dans la table `coreon_backups` de Turso
pour la voie A. Le jour J, ajouter UNE ligne de cron qui copie les données hors
de l'hébergeur (rclone/S3 pour B ; `turso db shell` + export pour A) — et
TESTER une restauration.

## L'API

| Méthode | Chemin | Qui | Quoi |
|---|---|---|---|
| POST | /api/login | public | `{email, pw}` → `{token, user}` (session 8 h) |
| POST | /api/apply | public | pré-inscription (limitée par IP) |
| GET | /api/db | session | `{rev, blob}` — filtré par rôle (acl.js) |
| POST | /api/db | personnel | `{baseRev, blob}` → fusion des collections du rôle ; **409** si périmé |
| POST | /api/op | parent | `{op, args}` — opérations nommées gardées (acknowledge, toggleLike) |
| GET | /api/rev | session | la révision courante (sondage léger) |
| GET | /api/health | public | `{ok, rev}` |

## Ce que la v1.1 devra ajouter (assumé)

- Messagerie et RSVP parents (extraire les écritures de Messages.jsx/Social.jsx
  vers le cœur, puis les exposer en opérations).
- Multi-écoles (un blob par école, comptes rattachés).
- Journal d'audit des accès (INPDP).
