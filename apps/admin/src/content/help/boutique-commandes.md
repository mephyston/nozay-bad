---
title: "Boutique : commandes"
description: "Valider, encaisser ou refuser les commandes des adhérents, et l'écriture qui en découle."
category: "boutique"
order: 2
---

**Boutique → Commandes** s'ouvre sur les commandes **en cours** : celles **à valider** et celles **en attente de paiement**, ensemble, chacune avec son statut et ses actions. Le sélecteur de statut permet de n'en voir qu'une étape, ou l'**historique** (payées, refusées, annulées). La recherche porte sur l'adhérent, sa licence, le produit, le moyen de paiement et le montant.

Le filtre **Article** isole un produit avec toutes ses déclinaisons : choisir « Maillot du club » montre les commandes de toutes les tailles, pour suivre une opération d'un bout à l'autre. La vue, l'article et la recherche restent appliqués après chaque validation, encaissement ou refus, et se retrouvent dans l'adresse de la page : un lien copié rouvre la même sélection.

Le bouton **Exporter** (dans la barre du bas sur téléphone) télécharge en CSV les commandes **affichées** : nom, prénom, email, article avec sa taille, quantité, montant, statut et date. Il suit les filtres en cours : filtrez l'article « Maillot du club », exportez, et vous obtenez la liste de l'opération, à ouvrir dans un tableur.

Un symbole ♂ ou ♀ suit le nom de l'adhérent, pour repérer d'un coup d'œil une coupe homme commandée par une femme, ou l'inverse.

Une commande suit le parcours **créée** → **en attente de paiement** → **payée**. Deux issues la referment sans règlement : le **refus** d'une demande non validée, et l'**annulation** d'une commande validée que le paiement n'a jamais suivie.

## D'où viennent les commandes

- **De l'adhérent**, depuis son espace ;
- **Du bureau**, avec le bouton de saisie : choisissez l'adhérent, l'article, la quantité, le moyen de paiement et, le cas échéant, la date de paiement.

Une commande est refusée à la saisie si :

- la saison est clôturée ;
- l'adhérent n'est pas inscrit sur la saison choisie ;
- son dossier n'est pas au statut **valide** ;
- le stock est insuffisant ;
- la date de paiement est **postérieure au jour même**.

## Valider une commande

La validation accepte la demande et met la commande **en attente de paiement**. Elle produit deux effets :

1. **Le stock est décrémenté**, si le produit en assure le suivi : l'article est désormais réservé à cet adhérent ;
2. **L'adhérent est notifié** que sa commande est validée et du montant à régler.

Rien n'est écrit en comptabilité à ce stade : une commande non réglée n'a pas à peser sur l'exercice.

## Encaisser une commande

L'encaissement est l'acte comptable de la boutique. Il enchaîne deux effets :

1. **Une recette est écrite au grand livre**, libellée « Achat boutique – *adhérent* – *produit* × *quantité* », imputée à la catégorie comptable de la **famille du produit** et rattachée à l'adhérent ;
2. **L'adhérent est notifié** de l'enregistrement de son règlement.

L'exercice de rattachement est déduit de la **date de paiement**, et non de la date de la commande. Si cette date tombe dans un exercice déjà arrêté, la recette est portée sur l'exercice ouvert sous forme de **régularisation** documentée, plutôt que refusée.

Une commande déjà traitée ne peut pas l'être une seconde fois : si deux personnes encaissent en même temps, la seconde reçoit un message de conflit.

## Annuler un encaissement

On a encaissé la mauvaise ligne : depuis l'**historique**, le menu d'une commande **payée** propose **Annuler l'encaissement**. La recette est retirée du grand livre et la commande repasse **en attente de paiement**, prête à être encaissée à nouveau ou annulée. L'adhérent en est notifié. Le stock, réservé à la validation, ne bouge pas.

Deux cas refusent l'annulation, pour les mêmes raisons qu'au grand livre : une recette **déjà pointée** sur un relevé bancaire (dissociez-la d'abord depuis le rapprochement), et un **exercice clôturé**.

Si la recette avait déjà été supprimée à la main au grand livre, l'annulation remet simplement la commande d'aplomb.

## Les relances

Les commandes en attente de paiement depuis **plus de sept jours** déclenchent une relance hebdomadaire à l'adhérent, dans la catégorie **Relances** de ses notifications. La liste affiche l'ancienneté de chaque attente, pour repérer d'un coup d'œil celles qui traînent.

Les relances automatiques ne partent que si le rappel de cotisation est activé dans la configuration du club (Réglages → Configuration → Fonctionnalités), le même interrupteur que les relances de cotisation.

## Refuser ou annuler une commande

- Le **refus** ferme une demande **non encore validée**. Aucun mouvement de stock, aucune écriture.
- L'**annulation** ferme une commande **validée et jamais réglée** : le stock réservé est rendu au catalogue. Aucune écriture non plus, puisque la recette n'a jamais existé.

Les deux laissent la commande dans l'historique et notifient l'adhérent.

Refuser ouvre une feuille où saisir un **motif**, facultatif, de 500 caractères au plus : « taille épuisée chez le fournisseur », « commande en double »… Donné, il est repris dans la notification et affiché à l'adhérent sous la commande, dans **Mes commandes**. Il reste visible dans l'historique et dans la fiche de la commande. Sans motif, la notification invite l'adhérent à se rapprocher du bureau.

## Ce qui bloque la clôture

Une **commande portant une date de paiement mais non encaissée** empêche la clôture de l'exercice : la recette correspondante n'existe pas encore en comptabilité. Voir [Saisons comptables](/admin/help/gestion-saisons).

> [!NOTE]
> Consulter les commandes et les traiter sont deux droits distincts. Le secrétariat suit les commandes, le trésorier et la présidence les valident et les encaissent — parce qu'encaisser, c'est écrire une recette.
