---
title: "Saisons comptables"
description: "Créer un exercice, l'activer, le clôturer et reporter les soldes."
category: "comptabilite"
order: 11
---

Une **saison** est un exercice comptable. Elle isole les écritures, les budgets, les factures, les commandes et les dossiers d'adhérents. L'écran se trouve dans **Réglages → Saisons comptables**.

## Créer une saison

Le bouton **Nouvelle saison** demande :

- un **code** (par exemple `26-27`) ;
- un **libellé** (par exemple « Saison 2026-2027 ») ;
- la possibilité de la **définir comme active** immédiatement.

Les saisons sont aussi créées automatiquement par l'[import Poona](/admin/help/import-poona) lorsqu'il rencontre un code inconnu ; elles sont alors inactives, du 1er septembre au 31 août.

## La saison active

Une seule saison est active. C'est celle proposée par défaut dans les écrans, et celle sur laquelle portent les fonctions automatiques (ciblage des notifications, espace adhérent). Le bouton **Activer** de la liste la désigne.

## Les soldes initiaux

Le bouton **Soldes** de chaque saison ouvre la saisie du solde de départ des trois comptes financiers. Voir [Soldes initiaux](/admin/help/soldes-initiaux).

## Clôturer un exercice

Le bouton **Clôturer** lance d'abord une **vérification comptable**. La clôture est **refusée** tant que subsiste l'un de ces points :

- l'exercice est déjà clôturé ;
- la date de fin n'est pas encore passée ;
- des lignes de relevé bancaire restent non rapprochées ;
- des remises de chèques ne sont pas encaissées ;
- des chèques restent en coffre, non remis en banque ;
- des commandes boutique payées n'ont pas été validées.

D'autres constats sont signalés en **avertissement**, sans bloquer :

- des écritures en attente de débit ;
- un **écart entre le solde de clôture calculé et le solde initial déjà saisi** sur la saison suivante. Dans ce cas, l'écran affiche les deux montants compte par compte et demande une **confirmation explicite** avant d'écraser.

Deux options accompagnent la clôture : confirmer l'écrasement des soldes initiaux de la saison suivante, et **recopier le budget** vers cette saison suivante.

Une fois clôturé, l'exercice est **en lecture seule** : plus aucune écriture, modification ou suppression n'y est possible, et les écrans concernés affichent un bandeau « Saison clôturée ».

## Rouvrir un exercice

Une saison clôturée peut être rouverte. C'est une opération de rattrapage, à réserver aux cas où la clôture s'est faite trop tôt.

> [!NOTE]
> La clôture et la réouverture relèvent d'un droit spécifique, distinct de la simple création de saison : ce sont des actes de gouvernance, portés par la présidence et le trésorier.
