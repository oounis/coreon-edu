# Réponse aux incidents

## Aujourd'hui (avant les vrais clients)

Un « incident » aujourd'hui = le site est cassé ou en panne. La réponse :

1. **Constater** : le smoke de production échoue, ou on ouvre le site.
2. **Revenir en arrière** : `git revert` + push (voir `rollback-plan.md`).
3. **Comprendre** : pourquoi la CI ne l'a pas attrapé ? Ajouter le test manquant.
4. **Noter** : la ligne entre dans `docs/quality/regression-checklist.md`.

Comme il n'y a pas encore de vrais utilisateurs, **le risque est faible et le
retour arrière est sûr**.

## Le jour des vrais clients — le vrai plan

| Gravité | Exemple | Réponse |
|---|---|---|
| 🔴 Critique | Fuite de données, site down pour tous | Retour arrière immédiat, prévenir les écoles, corriger, post-mortem écrit |
| 🟠 Majeure | Une fonctionnalité cassée pour un rôle | Corriger en priorité, communiquer |
| 🟡 Mineure | Un défaut d'affichage | File normale |

**À préparer avant la première école :**
- [ ] Un canal pour que l'école signale un problème (⚠️ aujourd'hui
  `contact@kogiagroup.com` ne reçoit pas encore — à créer).
- [ ] Un responsable joignable en cas d'incident critique.
- [ ] Un modèle de message pour prévenir les écoles.
- [ ] Un post-mortem écrit après chaque incident critique (sans blâme).
