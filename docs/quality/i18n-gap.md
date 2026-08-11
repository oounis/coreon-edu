# Écart de traduction — audit du 2026-08-11

Méthode : toutes les chaînes réellement passées à `t()` dans `app/`, `core/` et
`mobile/`, comparées aux dictionnaires. Le français EST la clé : une chaîne
absente n'affiche jamais un vide, elle retombe en français. Le risque n'est donc
pas un trou, c'est un **écran mélangé** — ce qui fait « produit inachevé ».

| Langue | Traduites | Couverture | Manquantes |
|---|---|---|---|
| Arabe | 1784/1868 | 96% | 84 |
| Anglais | 1784/1868 | 96% | 84 |

**Décision pilote :** le premier pilote est tunisien → **français**, complet à 100 %.
Le sélecteur de langue reste donc hors du chemin critique du pilote. L'arabe est
stratégique (Golfe) et à 96 % : on comble l'écart, on ne masque pas la fonction.

## Manquantes en arabe (84)

- `, l'arrivée est comptée en retard.`
- `, un jour d'école :`
- `20 derniers jours d'école`
- `= l'enfant porte une allergie connue.`
- `Approuver l'activité`
- `Au moins 8 caractères. Choisissez-en un que vous n\`
- `Aucun élève n'a manqué 4 jours ou plus ce mois-ci.`
- `Aucune évaluation aujourd'hui.`
- `Ce lien est incomplet. Ouvrez-le directement depuis l\`
- `Ce mois n'a pas encore commencé.`
- `Ce pour quoi l'école le félicite le plus`
- `Ce que l'école a partagé aujourd'hui.`
- `Ce qui s'est passé + mesure prise`
- `Communications de l'école`
- `Compte rendu d'entretien, motif de refus…`
- `Contact d\`
- `Dans l'école depuis`
- `Date d'embauche`
- `Date d\`
- `En attente de l'école`
- `En liste d'attente`
- `Enfants sur la photo (facultatif : sinon c'est un moment de toute la classe)`
- `Instruire l'activité`
- `L'échéancier de paiement apparaîtra ici dès qu'il sera établi.`
- `L'école de votre établissement : connectez-vous.`
- `L'école ouvre à`
- `L'école reprend le`
- `La direction souhaite vous contacter : merci de passer ou d\`
- `La direction souhaite vous parler : merci de passer ou d\`
- `La journée est en cours. Elle vous sera envoyée en fin d'après-midi.`
- `Le dossier n'existe pas ou a été archivé sous un autre identifiant.`
- `Le lien est valable une heure et ne fonctionne qu\`
- `Le suivi en direct démarrera automatiquement à l'arrivée de`
- `Les communications de l'école apparaîtront ici.`
- `Les moments partagés par l'école apparaîtront ici.`
- `Les échéanciers de paiement apparaîtront ici dès qu'un élève sera inscrit.`
- `Merci pour aujourd'hui · à demain !`
- `Message de l\`
- `Moyenne de l'année`
- `Moyenne de l'année et mention`
- `Note de l\`
- `Note facultative pour les parents / l'administration…`
- `N° d\`
- `On encourage d'abord. On observe un enfant : on ne le compare à personne.`
- `Pas d'appel pendant les vacances d'été.`
- `Pas d'école aujourd'hui`
- `Personne n'a encore rien proposé, dans aucun espace.`
- `Pointer l'arrivée`
- `Présence, congés et fiabilité de l'équipe · le quotidien RH de l'école.`
- `Rejoindre la liste d'attente`
- `Rien d'encaissé ce mois-ci`
- `Rien à afficher pour ce statut aujourd'hui.`
- `S'endort`
- `Sans serveur connecté, aucun lien de réinitialisation n\`
- `Session de 8 heures · les données restent sur le serveur de l'école.`
- `Seuil d'alerte`
- `Si un compte existe pour cette adresse, la marche à suivre vient d\`
- `Signalez et suivez ce qui se passe à l'école.`
- `Taux de présence de l'école`
- `Toute l'école`
- `Toute l'équipe est assidue ce mois-ci.`
- `Téléphone d\`
- `Un mot (facultatif) : c'est ce que le parent lira`
- `Un mot de l'éducatrice`
- `Une dépense inscrite ne s'efface pas : elle s'annule, motivée : la trace reste.`
- `Une place s\`
- `VACANCES D'ÉTÉ`
- `Vacances d'été · pas de nouveaux devoirs avant la rentrée du`
- `Vacances d'été · voici l'emploi du temps type ; les cours reprennent le`
- `Visées par l'Administration · votre approbation est finale.`
- `aujourd'hui · dernier à`
- `d'encouragements`
- `d'ici là, profitez de l'été !`
- `dans l'école`
- `depuis n'importe où`
- `en liste d'attente`
- `liste d'attente`
- `n'est pas inscrit(e) à la cantine. Voici tout de même le menu de la semaine.`
- `solde d'encouragement`
- `séances au programme aujourd'hui.`
- `temps de travail aujourd'hui`
- `» sera retiré du calendrier de l'école. Cette action est définitive.`
- `À l'attention de (optionnel)`
- `Évaluations reçues aujourd'hui`

## Manquantes en anglais (84)

- `, l'arrivée est comptée en retard.`
- `, un jour d'école :`
- `20 derniers jours d'école`
- `= l'enfant porte une allergie connue.`
- `Approuver l'activité`
- `Au moins 8 caractères. Choisissez-en un que vous n\`
- `Aucun élève n'a manqué 4 jours ou plus ce mois-ci.`
- `Aucune évaluation aujourd'hui.`
- `Ce lien est incomplet. Ouvrez-le directement depuis l\`
- `Ce mois n'a pas encore commencé.`
- `Ce pour quoi l'école le félicite le plus`
- `Ce que l'école a partagé aujourd'hui.`
- `Ce qui s'est passé + mesure prise`
- `Communications de l'école`
- `Compte rendu d'entretien, motif de refus…`
- `Contact d\`
- `Dans l'école depuis`
- `Date d'embauche`
- `Date d\`
- `En attente de l'école`
- `En liste d'attente`
- `Enfants sur la photo (facultatif : sinon c'est un moment de toute la classe)`
- `Instruire l'activité`
- `L'échéancier de paiement apparaîtra ici dès qu'il sera établi.`
- `L'école de votre établissement : connectez-vous.`
- `L'école ouvre à`
- `L'école reprend le`
- `La direction souhaite vous contacter : merci de passer ou d\`
- `La direction souhaite vous parler : merci de passer ou d\`
- `La journée est en cours. Elle vous sera envoyée en fin d'après-midi.`
- `Le dossier n'existe pas ou a été archivé sous un autre identifiant.`
- `Le lien est valable une heure et ne fonctionne qu\`
- `Le suivi en direct démarrera automatiquement à l'arrivée de`
- `Les communications de l'école apparaîtront ici.`
- `Les moments partagés par l'école apparaîtront ici.`
- `Les échéanciers de paiement apparaîtront ici dès qu'un élève sera inscrit.`
- `Merci pour aujourd'hui · à demain !`
- `Message de l\`
- `Moyenne de l'année`
- `Moyenne de l'année et mention`
- `Note de l\`
- `Note facultative pour les parents / l'administration…`
- `N° d\`
- `On encourage d'abord. On observe un enfant : on ne le compare à personne.`
- `Pas d'appel pendant les vacances d'été.`
- `Pas d'école aujourd'hui`
- `Personne n'a encore rien proposé, dans aucun espace.`
- `Pointer l'arrivée`
- `Présence, congés et fiabilité de l'équipe · le quotidien RH de l'école.`
- `Rejoindre la liste d'attente`
- `Rien d'encaissé ce mois-ci`
- `Rien à afficher pour ce statut aujourd'hui.`
- `S'endort`
- `Sans serveur connecté, aucun lien de réinitialisation n\`
- `Session de 8 heures · les données restent sur le serveur de l'école.`
- `Seuil d'alerte`
- `Si un compte existe pour cette adresse, la marche à suivre vient d\`
- `Signalez et suivez ce qui se passe à l'école.`
- `Taux de présence de l'école`
- `Toute l'école`
- `Toute l'équipe est assidue ce mois-ci.`
- `Téléphone d\`
- `Un mot (facultatif) : c'est ce que le parent lira`
- `Un mot de l'éducatrice`
- `Une dépense inscrite ne s'efface pas : elle s'annule, motivée : la trace reste.`
- `Une place s\`
- `VACANCES D'ÉTÉ`
- `Vacances d'été · pas de nouveaux devoirs avant la rentrée du`
- `Vacances d'été · voici l'emploi du temps type ; les cours reprennent le`
- `Visées par l'Administration · votre approbation est finale.`
- `aujourd'hui · dernier à`
- `d'encouragements`
- `d'ici là, profitez de l'été !`
- `dans l'école`
- `depuis n'importe où`
- `en liste d'attente`
- `liste d'attente`
- `n'est pas inscrit(e) à la cantine. Voici tout de même le menu de la semaine.`
- `solde d'encouragement`
- `séances au programme aujourd'hui.`
- `temps de travail aujourd'hui`
- `» sera retiré du calendrier de l'école. Cette action est définitive.`
- `À l'attention de (optionnel)`
- `Évaluations reçues aujourd'hui`
