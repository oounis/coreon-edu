# 🐋 Coreon Edu — par Kogia Group

**L'école qu'on a envie d'ouvrir.** Pas un ERP scolaire de plus : Coreon Edu fait vivre
le quotidien de l'école — évaluer une classe en 30 secondes, suivre la journée de son
enfant en direct, laisser parents et enseignants organiser la vie commune.

**Démo en ligne :** https://edu.kogiagroup.com · **Site :** https://kogiagroup.com
Sur l'écran de connexion, entrez d'un clic dans n'importe quel portail (Direction,
Enseignant, Parent…). La première visite simule une journée de classe (mode démo,
réversible).

## Où est la vérité

| Question | Document |
|---|---|
| Ce qu'est le produit, comment le lancer | **ce README** |
| L'architecture, les principes non négociables | [`docs/quality/ARCHITECTURE-BIBLE.md`](docs/quality/ARCHITECTURE-BIBLE.md) |
| L'état courant, les manques | [`docs/COREON_STATUS.md`](docs/COREON_STATUS.md) |
| Le travail en cours | **Linear** (KogiaGroup / équipe KOG) |
| Les décisions passées, y compris abandonnées | [`docs/history/`](docs/history/) — **ne jamais suivre** |

Les documents de `docs/history/` décrivent des architectures qui n'ont pas été
construites (FastAPI/Redis, Supabase). Ils portent un bandeau d'avertissement.

## Structure du dépôt

| Dossier | Rôle |
|---|---|
| `core/src/` | **Le cœur métier partagé** — JS pur, zéro dépendance, zéro API navigateur. Données, règles, autorisations, notifications. Web et mobile l'importent tel quel (`@core`). |
| `app/` | **Application web** (React 19 + Vite + Tailwind). Six portails par rôle. |
| `mobile/` | **Application Android/iOS** (Expo / React Native). 22 écrans natifs sur le même cœur. |
| `server/` | **Backend optionnel** — mots de passe hachés, sessions, verrou de révision. Zéro dépendance en local (fichiers JSON) ; `@libsql/client` uniquement si `TURSO_DATABASE_URL` est posé (hébergeur sans disque persistant). Voir `server/README.md`. |
| `ops/` | Scripts de vérification rapide (`check.sh`, `verify-live.sh`) — voir `CLAUDE.md`. |
| `brand/` | Logos et identité visuelle (source de vérité). |
| `source_assets/` | Illustrations sources (non embarquées). |
| `docs/history/HANDOFF.md` (archivé) | État précis du produit — **à lire pour reprendre le développement.** |
| `CLAUDE.md` | Repères pour reprendre une session (structure, flot git, comment vérifier avant de dire « en ligne »). |

## Développer

```bash
# Web
cd app && npm install && npm run dev          # http://localhost:5173

# Mobile (Expo SDK 54 — imposé par l'App Store : Expo Go 55+ n'y est pas
# distribué, et au-delà l'app devient intestable sur iPhone. Verrouillé dans
# .github/dependabot.yml — ne pas remonter sans raison écrite.)
cd mobile && npm install && npx expo start --tunnel   # scanner avec Expo Go
npx expo export --platform web                # aperçu navigateur depuis dist/

# Qualité
npx expo lint          # dans mobile/ — 0 erreur attendu
npx expo-doctor        # 20/20 attendu
```

Règles d'or : la logique vit dans `core/` (jamais dupliquée par plateforme) ;
`core/src/storage.js` est la seule couture plateforme ; les mêmes formes de données
partout — un appel fait sur mobile produit exactement le bulletin que le parent voit
sur le web. Détails et pièges connus : `docs/history/HANDOFF.md` (archivé).

## État

La démo publique reste locale par défaut (données dans le navigateur, aucun compte
requis). Un backend existe et tourne (`server/`, hébergé gratuitement sur Render +
Turso) — mots de passe hachés, sessions, verrou de révision — mais reste **optionnel
par école** : le client bascule en mode serveur seulement si `coreon_api` est posé
(voir `server/README.md`). Modules Devoirs/Examens/Bibliothèque/Transport
volontairement éteints (`core/src/features.js`) — le code reste prêt.

© Kogia Group · Tunisie
