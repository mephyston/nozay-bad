---
title: "Accès & Rôles"
description: "Gérer qui a le droit de se connecter et d'agir sur l'interface d'administration."
category: "admin"
order: 4
---

Le module **Accès & Rôles** contrôle qui peut ouvrir l'administration et ce que chacun peut y faire.

## Le principe : aucun droit par défaut

Un compte n'a accès qu'à ce qu'on lui a explicitement accordé. Créer un compte ne donne donc rien de plus que le tableau de bord et le centre d'aide : c'est en lui attribuant un **rôle** qu'on lui ouvre des rubriques.

## Les rôles

Un rôle correspond à une fonction réelle dans l'association. Vous pouvez en attribuer plusieurs à la même personne — une secrétaire qui assure aussi la trésorerie reçoit les deux rôles.

- **Membre** — Tableau de bord et centre d'aide uniquement. C'est le rôle par défaut.
- **Entraîneur·e** — Le catalogue de la boutique et les commandes passées pour les adhérents, dont il consulte le fichier. Il ne valide pas les commandes : l'encaissement relève de la trésorerie.
- **Secrétaire** — Le fichier des adhérents (consultation, modification, import Poona), les attestations CSE, la communication (notifications) et le catalogue de la boutique. Consultation seule côté finances.
- **Trésorier·ère** — La comptabilité complète : grand livre, factures, rapprochement bancaire, chèques, exercices, budget et rapports. Les notes de frais, de la saisie au remboursement. L'encaissement des commandes.
- **Président·e** — La consultation de l'ensemble du club, les actes de gouvernance (ouverture et clôture d'exercice, vote du budget), la validation des notes de frais et des commandes, la communication, et la gestion des accès.
- **Super administrateur** — Tous les droits, y compris la configuration technique.

> [!NOTE]
> La présidence peut tout consulter mais ne saisit pas d'écriture comptable. C'est volontaire : le trésorier saisit, la présidence contrôle, et chaque écriture du grand livre reste attribuable à une seule personne. Si la même personne assure les deux fonctions, attribuez-lui les deux rôles.

## Attribuer un rôle

Depuis **Réglages → Accès & Rôles**, ajoutez la personne avec l'adresse e-mail qu'elle utilise pour se connecter, puis cochez ses rôles. La liste des droits accordés s'affiche juste en dessous : vérifiez-la avant d'enregistrer, elle dit exactement ce que la personne pourra faire.

> [!CAUTION]
> Ne donnez le rôle **Super administrateur** qu'aux personnes qui en ont réellement besoin. Il ouvre la configuration technique et permet de consulter l'application sous l'identité d'un autre compte.

## Ajuster ce qu'un rôle permet

Depuis le panneau **Que permet chaque rôle ?**, un super administrateur peut cocher ou décocher les droits d'un rôle. La modification s'applique immédiatement à tous les comptes qui le portent — comptez quelques secondes de propagation.

Trois points à connaître :

- Le rôle **Super administrateur** n'est pas modifiable : il détient tous les droits par construction, y compris ceux des fonctionnalités à venir. C'est aussi ce qui garantit qu'on ne peut pas se verrouiller hors de cet écran.
- Le tableau de bord et le centre d'aide restent toujours accordés, même si vous les décochez : sans eux, la personne ne verrait plus rien après s'être connectée.
- Un rôle qui s'écarte de sa définition d'origine est signalé, avec le nombre d'ajouts et de retraits, et un bouton pour y revenir. Chaque modification est enregistrée avec son auteur et sa date.

> [!CAUTION]
> Modifier un rôle change les droits de **toutes** les personnes qui le portent, pas seulement les vôtres. Vérifiez la colonne concernée avant d'enregistrer.

## Retirer un accès

Supprimer un compte lui retire immédiatement l'accès. Un garde-fou empêche de supprimer — ou de rétrograder — le dernier super administrateur : sans lui, plus personne ne pourrait attribuer de rôle, et il faudrait une intervention technique pour rouvrir l'application.

## Consulter en tant qu'un autre compte

Un super administrateur peut consulter l'application sous l'identité d'un autre compte, pour reproduire ce qu'une personne voit quand elle signale un problème. Un bandeau orange rappelle en permanence sous quelle identité vous agissez. Cette fonction ne permet jamais d'obtenir plus de droits que les siens.
