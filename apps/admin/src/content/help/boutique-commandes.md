---
title: "Boutique : commandes"
description: "Saisir, valider ou refuser les commandes des adhérents, et l'écriture qui en découle."
category: "boutique"
order: 2
---

**Boutique → Commandes** présente deux listes : les commandes **en attente** et l'**historique** (validées et refusées). La recherche porte sur l'adhérent, sa licence, le produit, le moyen de paiement et le montant.

Une commande suit trois états : **en attente** → **validée** ou **refusée**.

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

La validation est l'acte comptable de la boutique. Elle enchaîne trois effets :

1. **Une recette est écrite au grand livre**, libellée « Achat boutique – *adhérent* – *produit* × *quantité* », imputée à la catégorie comptable de la **famille du produit** et rattachée à l'adhérent ;
2. **Le stock est décrémenté**, si le produit en assure le suivi ;
3. **L'adhérent est notifié** de la validation sur son téléphone, s'il a activé les notifications.

L'exercice de rattachement est déduit de la **date de paiement**, et non de la date de la commande. Si cette date tombe dans un exercice déjà arrêté, la recette est portée sur l'exercice ouvert sous forme de **régularisation** documentée, plutôt que refusée.

Une commande déjà traitée ne peut pas l'être une seconde fois : si deux personnes valident en même temps, la seconde reçoit un message de conflit.

## Refuser une commande

Le refus laisse la commande dans l'historique, sans écriture comptable ni mouvement de stock, et notifie l'adhérent.

## Ce qui bloque la clôture

Une **commande payée mais non validée** empêche la clôture de l'exercice : la recette correspondante n'existe pas encore en comptabilité. Voir [Saisons comptables](/admin/help/gestion-saisons).

> [!NOTE]
> Consulter les commandes et les valider sont deux droits distincts. Le secrétariat suit les commandes, le trésorier et la présidence les valident — parce que valider, c'est écrire une recette.
