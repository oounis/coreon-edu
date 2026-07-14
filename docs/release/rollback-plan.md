# Plan de retour arrière

## Aujourd'hui (site statique, pas de base de données)

Le retour arrière est **simple et sûr** : le code est dans Git, chaque
déploiement correspond à un commit.

**Pour revenir en arrière :**
```bash
git revert <commit-fautif>   # annule le changement proprement
git push                     # la CI teste et redéploie l'état corrigé
```
Ou, plus direct : `git reset --hard <bon-commit>` puis push forcé, si le mauvais
commit n'a pas encore d'autres commits par-dessus.

**Il n'y a pas de données à restaurer** : chaque navigateur a ses propres
données locales. Un retour arrière du code ne perd aucune donnée d'école.

## Le jour du backend — ce qui changera

Le retour arrière deviendra **délicat** dès qu'il y aura une base de données :
- Une migration de schéma peut ne **pas** être réversible.
- Restaurer le code sans restaurer la base peut casser les deux.

**Règle future :** toute migration devra avoir sa migration inverse **écrite et
testée** AVANT le déploiement. Une sauvegarde vérifiée juste avant chaque
migration. Ce plan sera réécrit à ce moment-là — il ne faut pas faire semblant
de l'avoir aujourd'hui.
