# Architecture technique — Coreon EDU

## En une image

```
  Navigateur (web)         Téléphone (Android, à venir)
        │                          │
        └────────► core/ ◄─────────┘     ← LE CŒUR : les règles du métier,
                    │                       en JS pur, ZÉRO dépendance.
                    │                       Partagé MOT POUR MOT.
             storage.js                   ← LA COUTURE unique vers les données.
                    │
             localStorage (aujourd'hui)   ← DEMAIN : ce fichier devient un cache,
                                             le backend prend le relais, et
                                             le reste du code NE CHANGE PAS.
```

## Les décisions qui comptent

- **Le cœur (`core/`) est la source de vérité.** Les 9 règles du métier y vivent
  et sont testées par exécution. Web et mobile ne les réécrivent pas.
- **Une seule couture de stockage (`core/src/storage.js`).** C'est le point
  exact par lequel entrera le backend. Toute l'architecture est faite pour ce
  jour-là. *(Écrit dans le fichier lui-même.)*
- **Modèle de capacités pour les niveaux.** Un module déclare les niveaux qu'il
  sert ; une école déclare les siens ; l'intersection décide. Une crèche ne voit
  jamais un module de primaire.
- **Accès refusé par défaut (`access.js`).** Une route inconnue est refusée.

## La pile technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Web | React 19 + Vite | Rapide, moderne |
| Style | Tailwind v4 + jetons `core/tokens.js` | Couleurs jamais peintes à la main |
| Cœur | JS pur, `node:test` | Aucune dépendance, testable partout |
| Mobile | React Native (en cours) | Même cœur |
| Hébergement | GitHub Pages + domaine Cloudflare | Gratuit, suffisant AVANT le backend |
| Tests navigateur | Playwright (`e2e/`) | Sur le vrai bundle |

## Ce qui manque (assumé)

- **Pas de backend.** → tout dans le navigateur. Voir
  `docs/quality/production-readiness-checklist.md`.
- **Bundle trop lourd** (777 Ko). → découpage par route à faire.
