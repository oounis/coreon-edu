# Plan de supervision

## Aujourd'hui : le point aveugle à connaître

> **Si une erreur se produit chez un utilisateur, nous ne le savons pas.**
> Il n'y a pas de suivi d'erreurs, pas de serveur qui journalise. C'est la
> limite d'un site statique, et il faut la nommer.

Ce qui existe quand même :
- **Smoke de production automatique** après chaque déploiement (le site
  répond-il, sert-il le bon bundle ?).
- **Alerte de sauvegarde interne** dans l'application : si le stockage du
  navigateur est plein, l'utilisateur est prévenu (plus de perte silencieuse).

## Le jour du backend — ce qu'on branchera

| Quoi | Outil prévu |
|---|---|
| Suivi des erreurs | Sentry (ou équivalent) |
| Disponibilité du site | une sonde externe (UptimeRobot) |
| Performance (latence API) | tableau de bord du backend |
| Ressources serveur | CPU, mémoire, disque |
| Comportement utilisateur | analytique respectueuse de la vie privée |
| Alertes de sécurité | journal d'accès + alertes |

**Règle :** une alerte doit arriver à un humain (e-mail/téléphone), pas dormir
dans un tableau que personne ne regarde.
