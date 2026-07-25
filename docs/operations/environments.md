# Environnements — le plan dev / int / prod

_Décision d'Othman, 2026-07-25 : « quand nous préparerons la version finale, nous la
copierons en 3 environnements dans GitHub — dev, int, prod. Les clients reçoivent prod ;
les modifications se font en int ; le développement en dev. »_

## Aujourd'hui (avant la version finale)

Un seul dépôt, une seule branche vivante : `coreon-edu` / `main`, déployée sur
edu.kogiagroup.com par la chaîne CI à 4 étages (tests cœur → build + e2e → deploy →
smoke de prod). **Rien ne change tant que la version finale n'est pas déclarée.**

## À la préparation de la version finale

Trois branches protégées dans `coreon-edu` (pas trois dépôts : un seul historique,
trois niveaux de stabilité) :

| Branche | Rôle | Déployée sur | Qui y écrit |
|---|---|---|---|
| `dev`  | développement quotidien | dev.edu.kogiagroup.com | tout le travail neuf |
| `int`  | intégration / recette | int.edu.kogiagroup.com | uniquement des merges depuis `dev`, + correctifs client à tester |
| `prod` | ce que les clients utilisent | edu.kogiagroup.com (+ domaines clients) | uniquement des merges depuis `int` |

**Règle de flux : dev → int → prod, jamais de saut.**
- Une demande de modification client se corrige en `int`, se valide, part en `prod`,
  puis **redescend** en `dev` (merge back) pour ne jamais diverger.
- Un développement neuf naît en `dev` et remonte par merge.
- Chaque env a sa propre chaîne CI complète ; `prod` exige en plus le smoke de
  production et un tag de version (`v1.x.y`).

## Les 4 versions pays (BH · QA · TN · LY)

Les versions pays ne sont PAS des branches : c'est la **couche de configuration**
(`core/src/locales.js`, CR-023/024) — un seul cœur, quatre configurations (devise,
pièce d'identité, géographie, curriculum, barème, fériés). Les trois environnements
portent donc chacun les quatre pays. Une école choisit son pays à la création ;
rien d'autre à déployer.

## Cloudflare (jetons en main depuis 2026-07-25)

La zone kogiagroup.com est sur Cloudflare : les sous-domaines dev./int. se créeront
par l'API le moment venu, et l'hébergement du backend (`server/`) est à l'étude sur
Workers (Option 0, kogia-ops T-EDU-BACKEND).
