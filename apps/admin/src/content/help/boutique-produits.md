---
title: "Boutique : produits"
description: "Tenir le catalogue proposé aux adhérents : prix, stock, disponibilité."
category: "boutique"
order: 1
---

**Boutique → Produits** contient les articles que les adhérents peuvent commander depuis leur espace : volants, cordages, et tout autre article revendu par le club.

## Ajouter ou modifier un produit

| Champ | Détail |
|---|---|
| **Nom** | Le libellé vu par l'adhérent |
| **Catégorie** | La famille du produit : Volants, Cordages, ou Autre. Elle n'est plus modifiable après création |
| **Prix** | En euros |
| **Gérer le stock** | À cocher pour suivre une quantité ; sinon l'article reste toujours disponible |
| **Quantité en stock** | Visible uniquement si le suivi de stock est activé |
| **Produit actif** | Un produit inactif disparaît du catalogue des adhérents |

## Le stock

Le suivi de stock est **facultatif, produit par produit**. Quand il est activé :

- la **validation** d'une commande décrémente la quantité du nombre d'articles commandés ;
- un article dont le stock est épuisé **n'est plus proposé à la commande** ;
- une commande portant sur une quantité supérieure au stock disponible est refusée à la saisie.

Un produit sans suivi de stock reste commandable sans limite : c'est le réglage à choisir pour un article commandé à la demande auprès du fournisseur.

## Le lien avec la comptabilité

C'est la **famille de produits** — et non le produit lui-même — qui porte l'imputation comptable. Voir [Catégories de produits](/admin/help/categories-produits).

> [!IMPORTANT]
> Si la famille d'un produit n'est rattachée à aucune catégorie comptable, la validation d'une commande portant sur ce produit **échoue** : l'application ne saurait pas où imputer la recette.
