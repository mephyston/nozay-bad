---
title: "Comptes et moyens de paiement"
description: "Les comptes de trésorerie du club — banque, caisses, porte-monnaie — et ce qu'il accepte comme règlement ; la porte de la comptabilité."
category: "comptabilite"
order: 13
---

**Réglages → Configuration → Comptes et moyens de paiement** règle deux listes que le reste de la comptabilité consomme : les **comptes de trésorerie** sur lesquels les mouvements s'enregistrent, et les **moyens de paiement** que le club accepte.

## Les comptes de trésorerie

Chaque compte a un **code** (stable, il figure dans l'adresse de son écran), un **libellé**, une **classe** du plan comptable (512, 517, 530…) et une **nature**, qui décide de ce que l'application en fait :

| Nature | Ce que c'est | Ce que l'application en fait |
|---|---|---|
| **Compte bancaire** | Compte courant, livret. | Se rapproche par relevé importé ; le premier compte bancaire actif est le compte principal, proposé par défaut au grand livre. |
| **Caisse** | Des espèces en main : buvette, ventes sur place. | Une entrée de menu et un écran de caisse, avec ses gestes pré-câblés (voir [Caisse](/admin/help/caisse)). |
| **Porte-monnaie** | Un compte chez un tiers, alimenté et débité par les inscriptions (Badnet…). | Une entrée de menu et son écran (voir [Porte-monnaie Badnet](/admin/help/porte-monnaie-badnet)). |
| **Compte d'attente** | Les fonds reçus pour le compte des adhérents. | Une dette hors trésorerie ; il se gère avec le rapprochement et ne se règle pas ici. |

Le menu **Comptabilité** porte une entrée par caisse et par porte-monnaie actif, sous *Remises de chèques* : ajoutez une seconde caisse, elle apparaît ; désactivez-la, elle disparaît.

> [!IMPORTANT]
> **Un compte bancaire actif ouvre la comptabilité.** Sans lui, grand livre, rapprochement, rapports, remises de chèques et clôture restent fermés, quel que soit le réglage des fonctionnalités. Les **factures** et les **notes de frais**, eux, restent utilisables : seul leur règlement demande un compte. Le dernier compte bancaire actif ne peut pas être désactivé — créez-en un autre d'abord.

**Un compte ne se supprime jamais** : ses écritures y renvoient. *Désactiver* le retire des menus et des formulaires en gardant son historique ; ses soldes restent visibles dans les rapports tant qu'ils ne sont pas nuls.

Pour un compte bancaire, le **numéro sur les relevés** est celui que la banque écrit dans ses exports (`ACCTID` d'un fichier OFX). L'import du relevé y reconnaît le compte de destination. Laissez-le vide s'il n'y a qu'un compte bancaire sans numéro ; dès qu'il y en a plusieurs sans numéro, l'import demande de choisir plutôt que de deviner.

## Les moyens de paiement

Un moyen a un **code**, un **libellé** (celui que les adhérents lisent dans la boutique), une **nature**, le **compte crédité** par défaut et l'**état de l'écriture** à la saisie :

| Nature | Comportement |
|---|---|
| **Virement** | La boutique montre l'IBAN du club ; l'écriture naît encaissée. |
| **Chèque** | L'écriture attend *en coffre* jusqu'à la [remise](/admin/help/remises-cheques). |
| **Espèces** | Remis en main propre ; l'écriture naît encaissée. |
| **Carte bancaire** | Paiement par carte ou plateforme ; l'écriture naît encaissée. |
| **Bon ou chèque tiers** | Chèque-vacances, coupon sport, bon d'un comité d'entreprise ; attend en coffre jusqu'à la remise. |

Deux interrupteurs, indépendants :

- **Proposé dans la boutique** — décoché, les adhérents ne le voient plus, mais l'administration peut toujours l'employer (un paiement par carte reçu sur une plateforme, par exemple).
- **Actif** — désactivé, le moyen ne se propose plus **nulle part**, administration comprise. Les écritures et commandes qui le portent gardent son libellé.

**Un moyen déjà employé ne se supprime pas** : dès qu'une écriture du grand livre ou une commande de la boutique y renvoie, l'application refuse et vous invite à le rendre inactif. Le *virement interne*, qui porte les deux jambes d'un virement entre comptes, est technique : il ne se modifie ni ne se supprime.
