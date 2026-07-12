# Coreon Edu — état des lieux (reprise de session)

Ce fichier existe pour qu'une nouvelle session Claude reprenne **exactement** ici.
Produit : **Coreon Edu**, département **Kogia Education**, éditeur **Kogia Group**.
Ce n'est **pas** un ERP scolaire — c'est un produit qu'on ouvre avec plaisir. On garde
ce qui fait vivre l'école tous les jours et on éteint ce que tout le monde vend déjà.

Dernière session : 2026-07-10 (2ᵉ session du jour — l'app Android est née).

---

## ✅ Fait et livré

### 1. Modules cachés (pas supprimés) — commit `7affb5b`
Devoirs, Examens, Bibliothèque, Transport scolaire sont **éteints**, pas effacés.
- Interrupteurs dans `core/src/features.js` (`homework/exams/library/transport: false`).
- Un module éteint disparaît du **menu** (`nav.js`), de la **palette Ctrl+K**, et
  refuse l'**URL directe** (`access.js` + `App.jsx`). Le code des pages reste là,
  testé, prêt à rallumer d'un `true` (futur « pack gestion » pour l'école qui le demande).
- **Vérifié au rendu** (test headless du 2026-07-10) : absents du menu enseignant ET
  du tableau de bord parent ; les 4 URLs directes redirigent vers /app avec toast.

### 2. Site Kogia Group refait — commit `6dca18e` (en ligne sur kogiagroup.com, vérifié 200)
- Vision « pas un ERP », 9 cartes de fonctionnalités, annonce mobile honnête
  (Android d'abord, iPhone ensuite, web + téléphone synchronisés), FAQ, JSON-LD.

### 3. Cœur partagé `core/src/` — commit `63b1230` (16 modules, zéro dépendance)
- JS pur, sans plateforme : `storage.js` est la SEULE couture (données + session).
- Icônes par NOM (`icon:'Star'`) ; le web les résout via `app/src/icons.jsx`
  (lucide-react), le mobile via `mobile/src/icons.js` (lucide-react-native).
- **Fuite corrigée cette session** : `auth.js` appelait `sessionStorage` en dur →
  passe désormais par `getSession/setSession/removeSession` de `storage.js`
  (`setSessionStorage()` pour brancher la plateforme). Web inchangé ; sur téléphone
  la session est persistante (on ne retape pas son mot de passe à chaque ouverture).
- Vérifié : `grep -rn "sessionStorage\|localStorage\|document\.\|window\." core/src/`
  ne renvoie que des usages gardés par `typeof`.

### 4. 📱 Application Android (Expo) — `mobile/` — PRODUIT COMPLET (session 3 du 2026-07-10)
Expo SDK 57 / React Native 0.86 / React 19 (même React que le web). État : **14 écrans
natifs**, barre d'onglets par rôle + pile (Shell.js fait main, contrat écran stable
`({user, params, nav})`), kit de composants partagé (`src/components.js`).
Écrans : Login, Dashboard (parent + staff), Suivi en direct (timeline de la journée),
Bulletin, Espaces/Social (cycle complet : proposer→viser→approuver→s'inscrire, quorum,
désistements), Événements (calendrier mensuel), Messages (fils + bulles + envoi),
Annonces, Notifications (inbox → navigation par lien), Paiements (déclarer, jamais
s'auto-marquer payé), Emploi du temps (lecture, par rôle), Pointage (badgeuse + congés),
Évaluer (flux 30 s en tap-tap : élève → panier, mêmes formes de données que le web),
Appel/Présence (vue école pour direction, appel une-main pour enseignant).
**Vérifié au rendu, 6 rôles × tous les onglets × tout le menu Plus : ZÉRO erreur
console** (export web de l'app RN + chromium headless). Les modules cachés restent
absents du mobile (même nav.js). Les mutations mobiles ont exactement les mêmes formes
que le web (bulletins/notifications calculés par le même cœur).
- `metro.config.js` : alias `@core` → `../core/src` via `resolveRequest` +
  `watchFolders: ['../core']`.
- **⚠️ Piège SDK 57 contourné** : pendant `expo export`, le « on-demand filesystem »
  jette les watchFolders (`withMetroMultiPlatform.js`) → « Failed to get the SHA-1 ».
  Désactivé via `app.json` → `expo.experiments.onDemandFilesystem: false` (le poser
  dans metro.config.js ne sert à rien, `instantiateMetro.js` l'écrase).
- `src/storage.js` : cache mémoire synchrone (exigé par db.js) répliqué vers
  AsyncStorage ; `hydrate()` À ATTENDRE avant le premier `db()` (App.js le fait).
  MMKV plus tard (exige un dev-build ; seul ce fichier changera).
- `src/screens/Login.js` (e-mail/mdp + boutons démo par rôle) et
  `src/screens/Dashboard.js` (parent : enfant en un coup d'œil, tuiles, moyennes par
  matière ; autres rôles : aperçu chiffré). `src/ui.js` = jetons visuels.
- Mode démo par défaut au premier lancement (équivalent du `?live=1` web), sans
  écraser un choix mémorisé.
- Lancer : `cd mobile && npx expo start` (Expo Go sur le téléphone) ;
  vérifier au rendu : `npx expo export --platform web` puis servir `dist/`.

---

## ⏳ À faire — reprendre ICI

### A. Backend (DÉCISION PRISE par Othman, 2026-07-10)
Directive explicite : web et mobile partagent **le même backend, la même base, la même
logique** — toute info saisie d'un côté apparaît immédiatement de l'autre. Donc :
1. **Supabase (offre gratuite)** recommandé : Postgres + auth (mots de passe hachés,
   rôle côté serveur) + realtime. Zéro budget respecté.
2. **Seul Othman peut créer le compte** (avec `ounissothmen@gmail.com`) — le demander
   au début de la prochaine session, puis brancher par la couture `core/src/storage.js`
   (db.js ne change pas) ou, mieux, remplacer progressivement db.js par une couche API.
3. Ce backend débloque AUSSI les prérequis « vraie école » : plaintext passwords,
   escalade de rôle côté client, multi-onglets (voir §Rappels).

### B. Mobile — reste à faire
1. Session du 2026-07-11 : Élèves, Enseignants, Personnel, Suivi élèves, Frais &
   Finances, Incidents, Demandes, Poste de sécurité sont désormais NATIFS (22 écrans).
   Encore « Bientôt sur mobile » : Comptes, Écoles (owner), Paramètres — faible
   valeur démo, à faire avec le backend.
2. Test sur vrai téléphone (Expo Go, `npx expo start --tunnel` depuis WSL).
3. Polices : le web utilise Nunito/Plus Jakarta — brancher expo-font quand on voudra
   une parité typographique.
4. Autres corrections cœur de cette session : `livestatus.js` ne touche plus
   `import.meta` (setAssetBase, posé par app/src/main.jsx) ; `rentreeDate/rentreeLabel/
   frDateLabel` vivent dans core/clock.js sans date-fns (Summer.jsx les ré-exporte).

### C. Distribution Android
Expo Go suffit pour le développement. Pour un APK de démo : `eas build` (compte Expo
gratuit) — décision à prendre quand Othman voudra le montrer.

---

## Rappels d'architecture (pour ne pas casser l'existant)
- **DB** = un blob JSON clé `coreon_db` (localStorage web / AsyncStorage mobile),
  version `_v`, évolutions par `migrate()`. `SCHEMA=21`. Ne jamais changer `KEY`
  ni sauter une migration.
- `demoUsers()` / `demoSocialEvents()` appelées par `seed()` ET `migrate()`.
- Personne n'approuve sa propre demande (`canDecide`, `ev.by!==user.id`) ;
  espaces cloisonnés (`belongsToSpace`) ; le parent ne se marque pas payé.
- Dates : jamais `toISOString()` (UTC) → `isoOf()` local. Démo web : `?live=1`.
- Palette charts VALIDÉE (skill dataviz), jamais choisie à l'œil.
- **Avant vraie école** : backend obligatoire (mots de passe en clair, rôle client,
  login démo un clic, multi-onglets qui s'écrasent).

## Secrets
Coffre **hors de tout repo** : `/mnt/c/Current LAB/_Private/Kogia/KOGIA_credentials.txt`.
`Kogia_Group` (site) et `Kogia_Education` sont **publics** → rien de sensible dedans.

---

## QA détaillée du 2026-07-11/12 (3 agents, web + mobile + Yeddi)
Couverture : web 25 pages × 7 rôles × 2 modes ; mobile 6 rôles × tous les écrans × 2
modes + ~75 assertions de flux. **0 erreur console partout.** 21 corrections livrées
(commits e96a0dc, 95c9b7c, d2471c8 côté Yeddi) — dont fuites de tableau de bord,
civilité adulte qui bloquait les activités genrées, Alert.alert muet sur web,
numéro de visiteur affiché en entier, bouton retour qui recouvrait les actions.

**Décisions produit en attente (pour Othman) :**
1. La landing web et les tarifs vantent « Devoirs & examens, Transport,
   bibliothèque, 14+ modules » alors que ces modules sont volontairement éteints —
   aligner le discours ou prévoir le « pack gestion » ?
2. Le rôle Sécurité peut OUVRIR les incidents mais pas en DÉCLARER (canReport) —
   l'agent de terrain devrait-il pouvoir ?
3. Annonces/Événements ne peuvent pas cibler le rôle Sécurité (listes d'audience).
4. Données de démo (core/db.js) : enseignants adultes avec civilité
   « Garçon/Fille », évaluations de t1 sur des matières qu'il n'enseigne pas.
5. Yeddi : les filtres de l'accueil se réinitialisent au retour d'une tâche
   (le Shell ne rend que le sommet de la pile — correction structurelle).
