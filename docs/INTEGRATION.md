# La porte d'intégration — comment les données d'un client entrent dans Coreon EDU

_CR-034 · écrit le 2026-07-25, à la veille du premier client de production (Bahreïn).
Une école qui achète Coreon EDU a déjà des années de données ailleurs : un Excel,
un autre SIS, un export OneRoster. Ce document est le processus complet — pas un
bouton d'import, une **discipline de migration**._

## 1. Les méthodes d'entrée, de la plus simple à la plus riche

| Méthode | Quand | État |
|---|---|---|
| **CSV guidé** (`/app/import`) | le cas normal : l'école exporte son Excel en « CSV UTF-8 » | ✅ livré (élèves+parents, personnel) |
| **En-têtes OneRoster** | l'ancien système sait exporter OneRoster (users.csv) | ✅ reconnus d'office par le rapprochement |
| **Import JSON serveur** (`server/import.mjs`) | reprise complète d'une école en mode serveur (jour J de l'hébergement) | ✅ existe (hache les mots de passe) |
| **API REST + webhooks** | synchronisation continue avec un système tiers | 🔜 après l'hébergement backend (T-EDU-BACKEND) |

## 2. Le processus, en six pas — jamais de surprise

1. **EXTRAIRE** — l'école exporte depuis son ancien système. Modèles fournis :
   colonnes libres, le rapprochement s'adapte (FR / EN / AR / OneRoster).
2. **RAPPROCHER** — `autoMap` devine colonnes → champs ; l'opérateur corrige à
   l'écran, champ par champ. Rien n'oblige à renommer des colonnes dans Excel.
3. **VALIDER** — chaque ligne est jugée : dates normalisées (dd/mm/yyyy → ISO),
   sexe multilingue, âge plausible, email vraisemblable, pièce d'identité du pays.
4. **RÉPÉTER** (dry-run) — le plan affiche ligne par ligne : **créer / mettre à
   jour / ignorer / erreur**, avec chaque message. **Rien n'est écrit.** C'est la
   répétition générale ; on la refait autant de fois que nécessaire.
5. **APPLIQUER** — l'écriture passe par les **mêmes chemins que la saisie
   manuelle** : référence ERP (`assignRef`), lien parent↔enfant des deux côtés
   (`setStudentParent`), échéancier semé, classe rapprochée par son nom (créée si
   inconnue — annoncé d'avance). Un élève importé est indistinguable d'un élève
   saisi : il apparaît immédiatement partout (présence, cantine, finance, direct).
6. **VÉRIFIER** — le journal des imports (qui, quand, fichier, comptes) + un tour
   des écrans. En cas de doute : **annuler** (pas 7).

## 3. Doublons — la règle

- **Élève** : reconnu par (nom normalisé — accents/casse ignorés — + date de
  naissance). Connu → **mise à jour** : les champs non vides du fichier
  complètent la fiche ; jamais un double.
- **Personnel/parent** : reconnu par **email** (l'identifiant de connexion).
- **Doublon interne au fichier** : la deuxième occurrence est ignorée, en le disant.

## 4. Retour arrière (rollback)

Avant chaque écriture, une **photographie complète de la base** est prise
(un cran, le dernier import). « Annuler cet import » la restaure à l'identique.
Si le stockage refuse la photographie (quota), l'import se déclare honnêtement
**non annulable** avant d'écrire. En mode serveur s'ajoutent les sauvegardes
horodatées du serveur (école **et registre d'auth**, rotation 30).

## 5. Identifiants générés

Un parent ou un membre du personnel créé par l'import reçoit un **mot de passe
provisoire**, remis **une seule fois** (téléchargement CSV à remettre en main
propre) — jamais réaffiché. En mode serveur, les mots de passe sont hachés au
passage (`import.mjs`) et le blob n'en garde aucun.

## 6. Synchronisation continue (stratégie)

La v1 est **migration ponctuelle** (une école arrive une fois). La
synchronisation continue (SIS tiers ↔ Coreon) viendra par l'API REST + webhooks
après l'hébergement : mêmes validations, même journal, avec en plus un
horodatage par enregistrement (`dateLastModified`) pour l'incrémental.
L'export OneRoster existe déjà (`/app/interop`) — la promesse inverse :
**vos données ressortent aussi librement qu'elles sont entrées.**

## 7. Monitoring

Chaque import est journalisé dans `d.imports` (append-only) : opérateur,
horodatage, fichier, cible, comptes créés/mis à jour/ignorés/erreurs,
annulabilité. Le journal est visible en bas de `/app/import`.

## 8. Notes par pays

Les validations lisent le **pack pays** (`locales.js`) : pièce d'identité (CPR
9 chiffres au Bahreïn, CIN 8 en Tunisie…), et bientôt semaine scolaire et
calendrier. Les dates ambiguës suivent la convention **jj/mm/aaaa** (annoncée à
l'écran) ; le format sûr reste ISO `aaaa-mm-jj`.

## 9. Limites assumées de la v1 (dettes ouvertes, classées)

- Excel binaire (.xlsx) non lu directement — passer par « CSV UTF-8 » (2 clics).
- Cibles : élèves+parents et personnel. Classes/emplois du temps/soldes
  financiers d'ouverture : à la demande du premier client réel.
- Le cran d'annulation est unique (le dernier import) — voulu : simple et sûr.
- Pas encore d'import par le mobile (opération de bureau, assumé).
