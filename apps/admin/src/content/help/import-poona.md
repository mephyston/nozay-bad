---
title: "Import Poona"
description: "Charger l'extraction CSV de Poona pour créer ou mettre à jour les dossiers d'adhérents."
category: "adherents"
order: 3
---

Les adhérents entrent dans l'application par un **fichier CSV extrait de Poona**. C'est le seul moyen de créer un dossier.

## Déposer le fichier

Depuis **Adhérents → Import Poona**, glissez le fichier dans la zone de dépôt ou cliquez pour le choisir. Seuls les fichiers `.csv` sont acceptés.

L'application lit le fichier dans votre navigateur avant tout envoi et affiche un **aperçu** des premières lignes ainsi que le nombre de lignes détectées. Le séparateur est reconnu automatiquement : point-virgule ou virgule.

## Les colonnes attendues

L'import échoue si l'une de ces colonnes est absente :

`Licence`, `Saison`, `Nom`, `Prénom`, `Sexe`, `Date naissance` (ou `Date de naissance`), et `Tarif` (ou `Type`).

Les colonnes suivantes sont utilisées si elles sont présentes : `Email`, `Téléphone`, `Statut` (ou `Adhérent validé`, `Etat de dossier`), `Montant`, `Montant reçu`, `Montant restant`, `Payé`, et les contacts `Nom / Email / Tél. du contact 1` et `... contact 2`, qui deviennent les représentants légaux.

## Ce que fait l'import

- Les **saisons absentes sont créées** à partir du code lu dans la colonne `Saison` (par exemple `25-26` donne « Saison 2025-2026 », du 1er septembre au 31 août). Elles sont créées **inactives** : c'est à vous de désigner la saison active dans les réglages.
- Chaque dossier est identifié par le couple **licence + saison**. Un dossier déjà présent est mis à jour, sinon il est créé.
- Le genre `H` ou `M` est enregistré comme masculin, `F` comme féminin.
- Les dates au format `JJ-MM-AAAA` sont converties ; les autres formats non reconnus font rejeter la ligne.
- Le statut est ramené à *valide* (`Oui`, `valide`, dossier « finalisé ») ou *suspendu* (`Non`, `suspendu`, dossier « annulé »).

## Le compte rendu

À la fin, l'application indique combien de dossiers ont été **créés**, combien ont été **mis à jour**, et combien de lignes ont été **ignorées**. Une ligne est ignorée lorsqu'une donnée obligatoire manque, que le genre est illisible ou que la date de naissance n'est pas exploitable.

> [!WARNING]
> Un réimport **écrase** les montants de cotisation par ceux du fichier. Si des encaissements ont été saisis dans l'application depuis le dernier export Poona, réimportez de préférence un export Poona à jour.
