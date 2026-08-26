---
title: "Principes comptables de l'application"
description: "Exercices, comptes financiers, catégories, moyens de paiement : le vocabulaire commun à tous les écrans."
category: "comptabilite"
order: 1
---

Cet article décrit les notions qu'on retrouve dans tous les écrans comptables. Le lire une fois évite bien des hésitations ensuite.

## L'exercice, appelé « saison »

Toute la comptabilité est rattachée à une **saison** (un exercice comptable), identifiée par un code du type `25-26` et bornée par une date de début et une date de fin. Une seule saison est **active** à la fois : c'est celle proposée par défaut. Voir [Saisons comptables](/admin/help/gestion-saisons).

## Les trois comptes financiers

L'argent du club est suivi sur trois comptes :

- **Compte Courant**
- **Compte Livret**
- **Caisse physique**

Chaque écriture désigne **un** de ces comptes. Un virement interne, lui, s'enregistre en **deux écritures** : une qui retire l'argent du compte de départ, une qui le verse au compte d'arrivée.

## Les trois types d'écriture

| Type | Effet | Particularité |
|---|---|---|
| **Recette** | L'argent entre sur un compte | Une catégorie est obligatoire |
| **Dépense** | L'argent sort d'un compte | Une catégorie est obligatoire |
| **Virement interne** | L'argent passe d'un compte à l'autre | **Deux écritures** liées, sur deux comptes différents, **aucune catégorie** |

Un virement interne ne change pas le résultat de l'exercice : il n'apparaît ni en produit ni en charge dans le compte de résultat.

### Pourquoi deux écritures, et non une seule

Parce que la banque, elle, en annonce deux. Un virement de votre compte courant vers le livret apparaît sur **les deux relevés** : un débit d'un côté, un crédit de l'autre. Une écriture unique ne pourrait être associée qu'à l'une des deux lignes, et l'autre resterait éternellement en attente — au point de bloquer la clôture de l'exercice.

Chaque écriture porte donc **sa propre date de valeur**. C'est ce qui permet de dire qu'un dépôt d'espèces est sorti de la caisse le lundi et n'est arrivé en banque que le jeudi : entre les deux, l'argent est **en transit**. L'écran de [rapprochement bancaire](/admin/help/rapprochement-bancaire) affiche ce montant, qui explique pourquoi le total de trésorerie peut baisser quelques jours sans qu'un euro ait été perdu.

## La catégorie, et non le numéro de compte

Le bénévole ne choisit jamais un numéro de compte : il choisit une **catégorie** (« Achat de volants », « Cotisations »…). Chaque catégorie porte deux rattachements — une classe de compte pour les recettes, une pour les dépenses — qui font le lien avec le plan comptable. Voir [Catégories comptables](/admin/help/categories-comptables) et [Plan comptable](/admin/help/plan-comptable).

## Les moyens de paiement

Virement, Chèque, Espèces, LABAZ, ANCV, Pass'Sport, Ticket Loisir, Up & Loisir.

## Les montants

Tous les montants sont stockés en **centimes** et un montant d'écriture est toujours **strictement positif** : c'est le *type* de l'écriture qui donne le sens, jamais le signe.

## Les trois phases d'un exercice

Ce qu'il est possible de saisir dépend de la date du jour par rapport aux bornes de la saison :

1. **Exercice en cours** — la saisie est libre à l'intérieur des bornes de dates.
2. **Période d'inventaire** — la date de fin est passée mais l'exercice n'est pas clôturé. Seules les **régularisations de fin d'exercice** sont acceptées : charge à payer, produit à recevoir.
3. **Exercice arrêté** — l'exercice est clôturé. Il est en **lecture seule** : plus aucune écriture ni modification.

## Les régularisations (cut-off)

Une écriture dont la date sort des bornes de l'exercice sélectionné exige un **motif de rattachement** et une **note justificative** :

- **Produit constaté d'avance** — une recette qui concerne la saison suivante ;
- **Produit à recevoir** — une recette attendue et rattachable à l'exercice (une subvention, par exemple) ;
- **Charge constatée d'avance** — une dépense payée pour la saison suivante ;
- **Charge à payer** — une dépense engagée dont la facture n'est pas parvenue.

Les motifs de type *produit* sont réservés aux recettes, ceux de type *charge* aux dépenses, et **aucune régularisation n'est possible sur un virement interne**.

> [!NOTE]
> Sans motif de rattachement, une écriture doit impérativement être datée à l'intérieur des bornes de sa saison. C'est le refus le plus fréquent au moment d'enregistrer.
