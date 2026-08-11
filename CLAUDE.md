# Coreon EDU (Kogia Education)

Multi-tenant école SaaS. Éditeur **Kogia Group**. Dépôt = `oounis/coreon-edu`,
copie de travail ici (`~/kogia/Kogia_Education`, ext4 — jamais `/mnt/c`, Metro/npm
y sont 8-30× plus lents). Prod : **edu.kogiagroup.com** (GitHub Pages).

Le constitution du produit est `docs/quality/ARCHITECTURE-BIBLE.md` — vérifier
tout changement d'architecture contre elle. Décisions verrouillées : pas de
portail élève (0-12 ans), français = clé du dictionnaire i18n, `html{zoom:0.85}`
≥1024px ne se touche pas, une école = une Direction (jamais supprimée, seulement
désactivée), le compte se vend à l'école.

## Structure
- `core/` — logique métier pure JS, zéro dépendance plateforme (`core/src/storage.js`
  est la SEULE couture). Tests : `cd core && npm test` (node:test).
- `app/` — web React/Vite. `cd app && npm run dev|build|lint` (oxlint).
- `mobile/` — Expo/React Native, alias `@core` → `../core/src`.
- `server/` — backend. Tests : `node --test server/test/`.
- `e2e/` — Playwright, 22 "parcours" (parcours de bout en bout pilotés navigateur)
  + diagnostics. `cd e2e && npm run all` lance toute la suite. Scripts individuels :
  `npm run <nom>` (voir `e2e/package.json`).
- `docs/quality/` — gates i18n (`i18n-audit.py`, `i18n-raw.py`), Bible, normes
  d'acceptation, workbook QA.
- `ops/` — scripts de vérification rapide (`check.sh`, `verify-live.sh`).

## Flot git
`dev` → `int` → `main`. `main` = prod, déployé par `.github/workflows/deploy.yml`
(3 étages qui se bloquent : qualité → build+e2e → deploy, puis `smoke-prod` qui
interroge le vrai site après coup). **Ne jamais dire "en ligne" sans avoir
vérifié le bundle servi** — `git commit` ≠ `git push` ≠ **en ligne**. Utiliser
`ops/verify-live.sh <marqueur>` plutôt qu'un simple curl du HTML : les chunks
i18n sont chargés à la demande et ne sont PAS cités directement par `index.html`.
Cache GitHub Pages `max-age=600` — après déploiement, F5 normal peut montrer
l'ancienne page jusqu'à 10 min : dire Ctrl+Shift+R ou navigation privée.

`gh run list --limit 1` juste après un push renvoie souvent le run PRÉCÉDENT —
toujours filtrer par `headSha`.

## Vérifier avant de dire "ça marche"
`ops/check.sh` lance cœur + serveur + oxlint + gates i18n + tous les parcours
e2e et n'imprime qu'un verdict court (log complet dans `/tmp/coreon-check.log`).
Lancer ça, PAS chaque script séparément, sauf diagnostic ciblé d'un échec précis.

Une page qui **charge** n'est pas une page qui **marche** — les error boundaries
avalent les plantages sans jamais remonter en `pageerror`. Vérifier en
**pilotant** l'app (rendu réel, clics), pas seulement en lisant un chiffre
vert. Les vrais défauts passés (calcul de paie faux, page RH blanche, "-1h"
d'affichage) n'ont été trouvés qu'en ouvrant l'écran.

## Démo locale
```
cd app && npm run build && cd dist && python3 -m http.server 8123
```
Comptes : `direction@alnour.tn`/`admin` · `creche@alnour.tn`/`teacher` ·
`parent@alnour.tn`/`parent` (argument commercial : un parent, un enfant crèche
+ un en 5ème, une seule app).

## Secrets
Hors dépôt : `/mnt/c/Current LAB/_Private/Kogia/KOGIA_credentials.txt`. Ce dépôt
et le site sont **publics** — rien de sensible dedans, jamais.

## Où reprendre
Voir mémoire `kogia-build-state` / `docs/history/HANDOFF.md` (archivé) pour l'état détaillé. En bref
(2026-08-01) : **D9 hébergement serveur** est le seul vrai blocage restant
(bloqué sur Othman, ~1h, Cloudflare Workers gratuit). Faisable sans lui :
**D5/D3 argent (CR-038)** — unifier factures/grille mensuelle, TVA, GOSI/EOSB.
