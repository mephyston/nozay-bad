---
title: "Plan comptable"
description: "Les classes de compte qui structurent le compte de résultat."
category: "comptabilite"
order: 15
---

Le **plan comptable** de l'application se réduit aux **classes de compte** : les rubriques qui regroupent les catégories dans le compte de résultat. Il se règle dans **Réglages → Catégories et classes**, onglet *Plan comptable*.

## Une classe de compte

| Champ | Détail |
|---|---|
| **Code** | Le numéro de la rubrique (par exemple `63`). Il est unique et **non modifiable** après création |
| **Libellé** | Le nom affiché (par exemple « 63 - Impôts et taxes ») |
| **Type** | *Produit* (recette), *Charge* (dépense) ou *Trésorerie* |

## À quoi elles servent

- Le [compte de résultat](/admin/help/rapports-financiers) regroupe les catégories par classe : les classes de type *Charge* forment la colonne des charges, celles de type *Produit* la colonne des produits.
- Le [budget prévisionnel](/admin/help/budget-previsionnel) suit la même structure.
- Le [grand livre](/admin/help/grand-livre) peut être filtré par classe de compte.

Une [catégorie comptable](/admin/help/categories-comptables) porte jusqu'à deux classes : l'une pour ses recettes, l'autre pour ses dépenses.

## Créer, modifier, supprimer

Le bouton **Nouvelle classe** ouvre le formulaire. La modification porte sur le libellé et le type, jamais sur le code. La suppression retire la rubrique du compte de résultat : les catégories qui s'y rattachaient n'y apparaîtront plus tant qu'une autre classe ne leur est pas assignée.

> [!NOTE]
> Les **comptes financiers** — Compte Courant, Compte Livret, Caisse physique — ne se règlent pas ici : ce sont les trois emplacements fixes où l'argent du club est détenu. Voir [Principes comptables](/admin/help/principes-comptables).
