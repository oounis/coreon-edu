# Environnements — le plan dev / int / prod

_Décision d'Othman, 2026-07-25 : « quand nous préparerons la version finale, nous la
copierons en 3 environnements dans GitHub — dev, int, prod. Les clients reçoivent prod ;
les modifications se font en int ; le développement en dev. »_

## ✅ EN PLACE depuis le 2026-07-25 (version finale déclarée : 1er client réel, Bahreïn)

Trois branches dans `coreon-edu` (pas trois dépôts : un seul historique,
trois niveaux de stabilité). **`main` EST la branche de production** — on ne l'a
pas renommée pour ne pas casser la chaîne GitHub Pages qui fait vivre le site :

| Branche | Rôle | Déployée sur | Chaîne CI | Qui y écrit |
|---|---|---|---|---|
| `dev`  | développement quotidien (branche PAR DÉFAUT) | dev.edu.kogiagroup.com (Cloudflare Pages `coreon-edu-dev`) | envs.yml : tests cœur+serveur → build → smoke → deploy | tout le travail neuf |
| `int`  | intégration / recette | int.edu.kogiagroup.com (Cloudflare Pages `coreon-edu-int`) | envs.yml : chaîne COMPLÈTE (tous les parcours) | merges depuis `dev`, correctifs client à tester |
| `main` | = **prod**, ce que les clients utilisent | edu.kogiagroup.com (GitHub Pages) | deploy.yml : 4 étages + smoke de prod | merges depuis `int` (protection : checks requis) |

**Règle de flux : dev → int → main(prod), jamais de saut.**
- Une demande de modification client se corrige en `int`, se valide, part en `main`,
  puis **redescend** en `dev` (merge back) pour ne jamais diverger.
- Un développement neuf naît en `dev` et remonte par merge.
- `main` est protégée : les PR exigent les checks verts (tests cœur + build/e2e) ;
  le propriétaire garde le droit de pousser en direct (enforce_admins off) pour
  les urgences — à n'utiliser qu'en urgence.
- À chaque merge int → main qui livre un lot fonctionnel : poser un tag `v1.x.y`
  (`git tag v1.x.y && git push --tags`) — c'est le registre des versions client.
- **Rollback prod** : relancer deploy.yml (workflow_dispatch) depuis le SHA sain,
  ou `git revert` le merge fautif sur main — la chaîne redéploie.
- Secrets CI : `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (réglés 2026-07-25,
  scope Pages) ; GitHub Pages n'a besoin d'aucun secret.

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
