# Couverture de traduction — mesure du 2026-08-11 (corrigée)

**Résultat : anglais 100 %, arabe 100 %** sur les 1 981 chaînes réellement
passées à `t()` dans `app/`, `core/` et `mobile/`.

| Langue | Couverture | Action |
|---|---|---|
| Français | source (les clés SONT le français) | — |
| Arabe | **100 %** | rien à faire |
| Anglais | **100 %** | 91 chaînes ajoutées le 2026-08-11 |

## Correction d'une mesure fausse

Un premier audit, le même jour, annonçait **« 84 manquantes en arabe ET en
anglais »**. **C'était faux pour l'arabe.**

Cause : les clés des dictionnaires s'écrivent avec des apostrophes échappées
(`'Toute l\'école'`), alors que l'extraction lisait les appels `t()` sous une
autre forme. Les deux ensembles ne pouvaient pas se rencontrer. L'arabe était
complet depuis le début ; seul l'anglais manquait réellement 91 chaînes.

**Leçon retenue** : une mesure de couverture doit normaliser les deux côtés
avant de les comparer, sinon elle invente un écart. Un chiffre faux fait perdre
du temps à combler un trou qui n'existe pas — et masque celui qui existe.

## Méthode (reproductible)

1. Extraire tout `t('…')` / `t("…")` de `app/src`, `core/src`, `mobile/src`.
2. Extraire les clés de `i18n.ar.js` et `i18n.en.js`.
3. **Dé-échapper les deux côtés** (`\'` → `'`) avant comparaison.
4. Comparer.

Le français reste le filet : une clé absente affiche le français, jamais un vide.
