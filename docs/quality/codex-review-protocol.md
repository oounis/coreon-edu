# Codex — revue en lecture seule

Codex n'écrit JAMAIS de code dans ce dépôt. Son rôle : lire, comparer au
contrat produit (`ARCHITECTURE-BIBLE.md`, ce fichier), et déposer un rapport
par constat sous forme d'**issue GitHub**, label `codex-review`. Claude lit
ces issues, décide, corrige si besoin, ferme l'issue.

## Pourquoi un second modèle
Codex tourne sur une famille de modèles différente de Claude — l'intérêt n'est
pas la rapidité, c'est de rater des choses DIFFÉREMMENT. Un constat qui
répète ce que Claude aurait déjà vu n'apporte rien ; un constat qui vient d'un
angle mort différent est la seule valeur ajoutée de ce canal.

## Comment déposer un constat
```bash
gh issue create --repo oounis/coreon-edu --label codex-review \
  --title "<module> : <résumé en une phrase>" \
  --body "Fichier : <chemin:ligne>
Constat : <ce qui est faux ou incomplet>
Scénario concret : <entrée → sortie fausse / crash>
Sévérité : bloquant | majeur | mineur"
```
Un constat sans scénario concret (« ça semble incomplet ») vaut moins qu'un
constat avec un cas précis qui casse. Préférer peu de constats solides à
beaucoup de constats vagues.

## Ce qui mérite un rapport ici — priorités du 2026-08-03
Othman signale : logique de certaines fonctionnalités incorrecte, modèles de
données incomplets, à travers web + mobile + langues. Angles à privilégier :

1. **Modèles de données incomplets** — comparer chaque entité de
   `core/src/*.js` à la section « Data model » de `PLAN.md` et à la Bible
   (§ « pas du rangement ») : champs manquants, cas non couverts, incohérence
   entre ce que le modèle promet et ce qu'un écran affiche.
2. **Logique de fonctionnalité incorrecte** — piloter un flux (pas juste lire
   le code) : ouvrir l'écran, dérouler le scénario métier réel (ex. facturer
   une école, inscrire un enfant, clôturer une année) et voir si le résultat
   est celui qu'un directeur d'école attendrait. La Bible et `HANDOFF.md`
   listent les défauts déjà trouvés CETTE façon (jamais en lisant un chiffre).
3. **Parité web/mobile** — `mobile/` a ses propres écrans (voir `HANDOFF.md`
   §B) ; un module vivant côté web mais absent/différent côté mobile est un
   constat valide.
4. **Langues** — CI a déjà des barrières dures ici (`i18n-audit.py`,
   `i18n-raw.py`, `parcours.fuites-langue.mjs`) : ne pas répéter ce qu'elles
   trouvent déjà. Ce qui reste à ce canal : une traduction PRÉSENTE mais
   FAUSSE (contresens, ton, grammaire) — que les compteurs ne détectent pas.

## Ce que Codex doit lire avant de commencer
`CLAUDE.md` (racine) → `docs/quality/ARCHITECTURE-BIBLE.md` →
`docs/quality/erp-epics-plan.md` (décisions D-1/D-2/D-3) →
`docs/quality/gap-analysis.md` → `HANDOFF.md` (défauts déjà trouvés, pour ne
pas les re-signaler).

## Ce que Claude fait de son côté
`gh issue list --repo oounis/coreon-edu --label codex-review --state open`
en début de session ou sur demande. Chaque issue : vérifiée (le constat
tient-il en pilotant l'écran ?), corrigée ou classée comme décision produit
assumée, puis fermée avec un mot sur ce qui a été fait.
