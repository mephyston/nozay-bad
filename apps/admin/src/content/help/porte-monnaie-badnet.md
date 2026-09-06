---
title: "Porte-monnaie Badnet"
description: "Tenir le compte prépayé du club chez Badnet, et l'argent des adhérents qui y transite, sans fausser le résultat."
category: "comptabilite"
order: 4
---

Le club détient un **porte-monnaie prépayé chez Badnet**, la plateforme d'inscription aux tournois. L'argent en est retirable vers la banque à tout moment : c'est une caisse dématérialisée, un **compte de disponibilités** (classe 517), au même titre que le compte courant, le livret ou la caisse.

Il a son écran, **Comptabilité → Badnet**, construit comme celui de la [Caisse](/admin/help/caisse) : les soldes de la saison, l'historique des mouvements, et un bouton **Nouveau** qui propose les gestes du compte, déjà câblés. Vous n'y entrez que le montant, la date et le nom.

## L'argent d'une adhérente qui transite

Une adhérente vire une somme sur le compte courant du club, puis vous créditez la même somme sur *son* porte-monnaie Badnet depuis celui du club. Entre les deux gestes, **le club lui doit cet argent**. Ce n'est ni une recette ni une dépense : c'est une opération pour compte de tiers, qui ne doit jamais toucher au résultat.

L'application la porte sur un compte d'attente, **« Fonds reçus pour le compte des adhérents »** (classe 467). Son solde est normalement nul ; négatif, il dit ce que le club doit encore rendre. Il est présenté partout comme une **dette**, jamais comme de la trésorerie : hors du total de trésorerie disponible, sur une ligne à part du bilan d'AG.

Les deux gestes sont deux virements internes, chacun à sa vraie date :

| Geste réel | Bouton | Virement écrit |
| --- | --- | --- |
| Son virement arrive sur le compte courant | **Virement reçu d'une adhérente** | Fonds reçus des adhérents → Compte Courant, à son nom |
| Vous créditez son porte-monnaie depuis celui du club | **Remboursement sur son porte-monnaie Badnet** | Porte-monnaie Badnet → Fonds reçus des adhérents, à son nom |

L'encart **Avances d'adhérents en attente** liste les virements reçus que rien n'a encore rendus, avec leur ancienneté. Le bouton **Rembourser** d'une ligne pré-remplit le second virement depuis la première : c'est ce qui les apparie. Rendez l'argent dans le mois, pour que la liste ne s'allonge pas.

> [!TIP]
> Au [rapprochement bancaire](/admin/help/rapprochement-bancaire), une ligne au crédit du compte courant porte un bouton **Adhérente** : il crée le virement reçu et pointe la ligne en un geste. Vous n'avez plus qu'à revenir sur l'écran Badnet pour le rembourser.

## Les mouvements du porte-monnaie du club

| Geste réel | Bouton | Nature |
| --- | --- | --- |
| Vous rechargez le porte-monnaie depuis la banque | **Recharge du porte-monnaie** | Virement Compte Courant → Badnet, hors résultat |
| Vous rapatriez en banque les inscriptions encaissées après un tournoi du club | **Rapatriement en banque** | Virement Badnet → Compte Courant, hors résultat |
| Les participants à un tournoi du club ont payé leurs inscriptions | **Inscriptions encaissées** | Recette, catégorie Tournois. Une écriture par tournoi suffit, avec le total et le nombre d'inscrits |
| Le club inscrit ses joueurs ou ses équipes, ou Badnet prélève une commission | **Inscription payée ou commission** | Dépense, catégorie Championnats, Tournois ou Frais de fonctionnement |

Toujours en brut : les droits encaissés en recette, la commission en dépense, jamais compensés.

## Le contrôle mensuel

Badnet ne fournit aucun export : ces mouvements se saisissent à la main. Le contrôle tient en une comparaison : à chaque fin de mois, **le solde du compte Badnet dans l'application doit être égal à celui qu'affiche l'écran Badnet du club**. Un écart signale une opération oubliée. Le compte d'attente, lui, doit être à zéro ou justifié nom par nom : c'est l'encart des avances en attente.

## Le solde de départ

L'argent déjà présent sur le porte-monnaie entre dans les livres par les [soldes initiaux](/admin/help/soldes-initiaux) de l'exercice en cours. Signalez cette régularisation d'une ligne dans le rapport d'assemblée générale : jusqu'ici, la recharge avait été comptée en dépense.

À la clôture, le solde du porte-monnaie se reporte sur l'exercice suivant comme celui des autres comptes, et celui du compte d'attente aussi : une avance non rendue au 31 août reste due.

> [!NOTE]
> Le porte-monnaie Badnet n'est pas de l'argent librement disponible : il n'entre pas dans la courbe de prévision de trésorerie du rapport, mais bien dans le bilan de trésorerie et dans le total des disponibilités.
