---
title: "Catégories de produits"
description: "Regrouper les articles de la boutique et fixer leur imputation comptable."
category: "boutique"
order: 3
---

Une **catégorie de produits** est une famille d'articles de la boutique. Elle se règle dans **Réglages → Catégories produits**.

## Les champs

| Champ | Rôle |
|---|---|
| **Libellé** | Le nom de la famille (Volants, Cordages…) |
| **Catégorie comptable** | L'imputation utilisée pour les recettes de cette famille |
| **Active** | Une famille inactive n'est plus proposée |

## Pourquoi le rattachement comptable est obligatoire

C'est ce lien qui rend automatique l'écriture comptable de la boutique : quand une commande est validée, la recette est imputée à la **catégorie comptable de la famille du produit**, sans aucune double saisie. Voir [Boutique : commandes](/admin/help/boutique-commandes).

Une famille sans catégorie comptable fait **échouer la validation** des commandes portant sur ses produits, avec un message qui la nomme explicitement.

## Supprimer une famille

La suppression est **refusée tant que des produits y sont rattachés**. Réaffectez d'abord ces produits, ou contentez-vous de désactiver la famille.
