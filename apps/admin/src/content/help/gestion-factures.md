---
title: "Factures"
description: "Émettre une facture au nom du club, suivre son règlement et l'exporter."
category: "comptabilite"
order: 6
---

La rubrique **Factures** sert aux factures **émises par le club** : une commune, un partenaire, un comité d'entreprise à qui l'association facture une prestation.

## Créer une facture

Le bouton **Nouvelle facture** ouvre le formulaire :

- **Client** — nom, adresse et adresse e-mail ;
- **Date** ;
- **Lignes** — description, quantité et prix unitaire. Le total se calcule au fur et à mesure.

Le **numéro de facture est attribué automatiquement** à l'enregistrement ; il est unique. La facture est créée au statut *Brouillon*.

## Les statuts

| Statut | Signification |
|---|---|
| **Brouillon** | En cours de rédaction |
| **En attente de règlement** | Émise, pas encore payée |
| **Payée** | Le règlement est encaissé |
| **Annulée** | Abandonnée |

Le changement de statut se fait depuis le menu de la ligne, avec confirmation. Une facture passe aussi en *Payée* **automatiquement** lorsqu'elle est rattachée à une ligne de relevé pendant le [rapprochement bancaire](/admin/help/rapprochement-bancaire) — c'est la voie normale, car elle crée en même temps l'écriture de recette.

## Consulter, imprimer, supprimer

- **Imprimer** ouvre le PDF de la facture dans un nouvel onglet.
- **Modifier** rouvre le formulaire, lignes comprises.
- **Supprimer** efface définitivement la facture ; cette action exige un droit distinct de la création.

La liste se filtre par saison et par statut, et se cherche par numéro, client, objet ou montant.

## Exporter

Le bouton **Exporter (ZIP)** télécharge l'ensemble des factures de la saison en PDF. Voir [Exports comptables](/admin/help/exports-comptables).

## Ce qui est refusé

Toute création, modification ou suppression est refusée sur une **saison clôturée**. De même, une facture déjà *payée* ou *annulée* ne peut plus être rattachée à une ligne bancaire.

> [!NOTE]
> Les factures **fournisseurs** (ce que le club doit payer) ne se saisissent pas ici : elles se comptabilisent en dépense depuis le [grand livre](/admin/help/grand-livre) ou directement depuis le rapprochement bancaire. Il n'existe pas de pièce jointe sur une facture.
