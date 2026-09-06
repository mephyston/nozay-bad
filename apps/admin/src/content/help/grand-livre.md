---
title: "Grand livre"
description: "Saisir, retrouver, corriger et supprimer les écritures comptables."
category: "comptabilite"
order: 2
---

Le **Grand livre** (« Journal des écritures ») est le registre de toutes les opérations de la saison. C'est ici que se saisissent les écritures qui ne viennent ni d'un chèque, ni d'un rapprochement bancaire, ni d'une note de frais, ni d'une commande.

## Saisir une écriture

Trois boutons ouvrent le même formulaire, avec des champs adaptés : **recette**, **dépense**, **virement interne**.

> [!NOTE]
> Un virement interne s'enregistre en **deux écritures**, une par compte : elles apparaissent toutes les deux dans le grand livre, marquées « Virement émis » et « Virement reçu », et nomment chacune le compte d'en face. Supprimer l'une supprime l'autre — c'est un seul mouvement, écrit des deux côtés.

| Champ | Détail |
|---|---|
| Montant | En euros, strictement positif |
| Date | La date de l'opération |
| Saison d'affectation | L'exercice auquel rattacher l'écriture |
| Catégorie | Obligatoire pour une recette ou une dépense |
| Compte financier | Compte Courant, Livret A, Caisse Buvette ou Porte-monnaie Badnet |
| Comptes source et destinataire | Pour un virement interne, obligatoirement différents |
| Date de crédit | Pour un virement interne, si l'argent arrive un autre jour que celui où il part. Laissée vide, elle vaut celle du débit |
| Moyen de paiement | Virement, Chèque, Espèces, LABAZ, ANCV, Pass'Sport, Ticket Loisir, Up & Loisir |
| Régularisation | *Normal* par défaut ; les autres motifs exigent une note justificative |
| Description | Le motif de l'opération |
| Référence | Facultative — numéro de chèque, référence de virement… |

Voir [Principes comptables](/admin/help/principes-comptables) pour le détail des régularisations et des règles de date.

## Retrouver une écriture

La liste se filtre par saison, par compte financier, par type, par catégorie, par classe de compte, par adhérent, par mois, et par recherche libre sur la description ou la référence. Un filtre supplémentaire isole les **chèques non encore rapprochés**.

Quand un filtre de catégorie ou de classe est actif, un bandeau le rappelle au-dessus de la liste avec un bouton pour l'effacer.

Chaque ligne affiche la date, le type, la catégorie, le libellé, le montant et le **solde progressif** du compte sélectionné — le solde initial de la saison auquel s'ajoutent les mouvements jusqu'à cette ligne. Une écriture rattachée à une autre saison porte le repère **Cut-off**.

Les écritures issues d'une même ligne de relevé bancaire sont regroupées : on voit d'un coup d'œil comment un versement unique a été ventilé.

## Corriger ou supprimer

Le menu d'actions de chaque ligne permet de **modifier** ou de **supprimer** une écriture. Sur mobile, un appui sur la ligne ouvre directement la modification.

La suppression exige un droit distinct de la saisie : quelqu'un peut avoir le droit d'écrire sans avoir celui de supprimer.

> [!WARNING]
> La suppression est définitive et sans trace. Vérifiez d'abord si l'écriture est rattachée à un chèque, à une note de frais ou à une commande : dans ces cas, il vaut mieux annuler l'opération d'origine (supprimer le chèque, annuler la validation de la note de frais), ce qui défait proprement l'ensemble.

## Ce qui est en lecture seule

Lorsque la saison consultée est clôturée, un bandeau **« Saison clôturée (lecture seule) »** s'affiche et toute écriture est refusée.
