# Les standards de code — Coreon EDU

## Les règles courtes

1. **Une règle du métier vit dans `core/`, pas dans un écran.** Si elle n'est que
   dans l'interface, elle n'existe pas.
2. **On n'invente rien** — ni un chiffre, ni un client, ni une donnée (règle n°7).
3. **Les couleurs ne se peignent pas à la main.** Elles viennent de
   `core/tokens.js` et passent le contraste AA (calculé, jamais estimé).
4. **Un défaut corrigé laisse un test derrière lui** (`docs/quality/regression-checklist.md`).
5. **Un format n'a qu'un seul lecteur.** (Le bug de la clé d'appel a été corrigé
   en donnant au format UN seul parseur dans le cœur, pas en rustinant 5 endroits.)
6. **Le français est la langue du code métier et des commentaires** ; les textes
   d'interface passent par `t()` (i18n) pour l'arabe.
7. **Jamais de secret dans le dépôt** (les dépôts sont publics).

## Les commentaires

Un commentaire dit **pourquoi**, pas **quoi**. Les bons commentaires du projet
racontent la décision et le défaut qu'elle corrige — pas la paraphrase de la
ligne suivante.

## Avant de dire « fini »

- `npm test --prefix core` — vert
- `npm run all --prefix e2e` — vert
- La règle touchée a son test.
- Le carnet (`docs/PLAN.md`) dit la vérité.
