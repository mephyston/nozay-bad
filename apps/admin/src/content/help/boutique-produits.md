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
| **Catégorie** | La famille du produit, parmi celles réglées dans [Catégories de produits](/admin/help/categories-produits). Elle se modifie à tout moment |
| **Description** | Facultative : une ligne lue sous le nom, sur la carte de la boutique (matière, contenu du tube, délai…) |
| **Image** | Facultative : PNG, JPEG ou WebP, réduite automatiquement. C'est elle qui illustre la carte dans la boutique |
| **Prix** | En euros |
| **Gérer le stock** | À cocher pour suivre une quantité ; sinon l'article reste toujours disponible |
| **Quantité en stock** | Visible uniquement si le suivi de stock est activé |
| **Produit actif** | Un produit inactif disparaît du catalogue des adhérents, avec toutes ses déclinaisons |

## Les déclinaisons

Un produit qui existe en plusieurs tailles, couleurs ou contenances se crée **une fois**, puis se décline : chaque déclinaison a son libellé (« L », « 12 ans », « Rouge »), son prix, son stock et sa disponibilité. Nom, catégorie, description et image sont ceux du produit et se modifient sur sa fiche.

- Depuis la liste, **⋯ → Ajouter une déclinaison** sur le produit ouvre une fiche déjà rattachée.
- Un produit existant se rattache à un autre par le champ **Déclinaison de** de sa fiche ; le laisser sur « Aucun » le détache.
- Dans la boutique, la famille tient sur **une carte** ; l'adhérent y choisit sa déclinaison avant de commander.
- Un produit qui a des déclinaisons **ne se commande pas lui-même** : ce sont elles qui portent le prix.

## Supprimer un produit

Un produit — ou une déclinaison — **jamais commandé** se supprime depuis **⋯ → Supprimer**. Dès qu'une commande le référence, la suppression n'est plus proposée : les commandes passées et la comptabilité y renvoient. Désactivez-le à la place ; il reste dans l'historique mais disparaît de la boutique.

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
