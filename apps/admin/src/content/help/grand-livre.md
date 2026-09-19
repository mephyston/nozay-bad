---
title: "Grand livre"
description: "Saisir, retrouver, corriger et supprimer les écritures comptables."
category: "comptabilite"
order: 2
---

Le **Grand livre** (« Journal des écritures ») est le registre de toutes les opérations de la saison. C'est ici que se saisissent les écritures qui ne viennent ni d'un chèque, ni d'un rapprochement bancaire, ni d'une note de frais, ni d'une commande.

En tête, la bande **Disponibilités** donne le total de trésorerie et le solde comptable de chaque compte ; un point orange signale un compte dont le dernier relevé importé ne colle pas au solde. **Détail** déplie une carte par compte — solde du relevé et sa date, écart, chèques encore en coffre, débits en attente — et le choix est retenu d'une visite à l'autre.

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
| Compte financier | L'un des comptes de trésorerie du club (banque, caisse, porte-monnaie, bons) |
| Comptes source et destinataire | Pour un virement interne, obligatoirement différents |
| Date de crédit | Pour un virement interne, si l'argent arrive un autre jour que celui où il part. Laissée vide, elle vaut celle du débit |
| Moyen de paiement | L'un des moyens actifs du club (virement, chèque, espèces, bons…) |
| Adhérent | Pour une recette, l'adhérent qui paie — facultatif. C'est ce rattachement qui fait apparaître le règlement sur sa fiche et dans son attestation ; seules les adhésions de l'exercice d'affectation sont proposées |
| Régularisation | *Normal* par défaut ; les autres motifs exigent une note justificative |
| Description | Le motif de l'opération |
| Référence | Facultative — numéro de chèque, référence de virement… |

Voir [Principes comptables](/admin/help/principes-comptables) pour le détail des régularisations et des règles de date.

## Retrouver une écriture

La liste se filtre par saison, par compte financier, par type, par catégorie, par classe de compte, par adhérent, par mois, et par recherche libre sur la description ou la référence. Un filtre supplémentaire isole les **chèques non encore rapprochés**.

Quand un filtre de catégorie ou de classe est actif, un bandeau le rappelle au-dessus de la liste avec un bouton pour l'effacer.

Chaque ligne affiche la date, le type, la catégorie, le libellé, le montant et le **solde progressif** du compte sélectionné — le solde initial de la saison auquel s'ajoutent les mouvements jusqu'à cette ligne. Une écriture rattachée à une autre saison porte le repère **Cut-off**.

Un repère **Solde fin &lt;mois&gt;** sépare les mois. Le solde progressif et ces repères ne s'affichent que sur la liste complète du compte (le filtre par mois compris) : dès qu'une recherche ou un filtre — catégorie, classe, sens, rattachement, chèques non pointés — retire des écritures, ils disparaissent, car un solde posé sur une ligne isolée ne dirait rien de juste. Pour vérifier qu'aucune écriture ne manque face à la banque, c'est l'écart de l'écran de [rapprochement](/admin/help/rapprochement-bancaire) qui fait foi, pas ce solde : il contient les chèques encore en coffre et les débits en attente.

Les écritures issues d'une même ligne de relevé bancaire sont regroupées : on voit d'un coup d'œil comment un versement unique a été ventilé.

## Corriger ou supprimer

Le menu d'actions de chaque ligne permet de **modifier** ou de **supprimer** une écriture. Sur mobile, un appui sur la ligne ouvre directement la modification.

Un virement interne se modifie et se supprime **entier** : ouvrir l'une de ses deux jambes rouvre le virement complet, avec ses deux comptes et ses deux dates. Une jambe déjà pointée au rapprochement garde son montant et son compte tant qu'elle n'est pas dissociée.

La suppression exige un droit distinct de la saisie : quelqu'un peut avoir le droit d'écrire sans avoir celui de supprimer.

> [!WARNING]
> La suppression est définitive et sans trace. Vérifiez d'abord si l'écriture est rattachée à un chèque, à une note de frais ou à une commande : dans ces cas, il vaut mieux annuler l'opération d'origine (supprimer le chèque, annuler la validation de la note de frais), ce qui défait proprement l'ensemble.

## Ce qui est en lecture seule

Lorsque la saison consultée est clôturée, un bandeau **« Saison clôturée (lecture seule) »** s'affiche et toute écriture est refusée.
