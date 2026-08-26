---
title: "Caisse"
description: "Suivre les espèces : entrées, sorties et dépôt en banque."
category: "comptabilite"
order: 3
---

La rubrique **Caisse** est une vue dédiée au compte **Caisse physique** : les billets et les pièces détenus par le club.

## Ce que montre l'écran

Quatre indicateurs en haut de page : le **solde initial** de la saison, le total des **entrées**, le total des **sorties** et le **solde courant**. Les virements internes sont comptés dans ce calcul — de l'argent transféré vers la caisse est une entrée, de l'argent transféré depuis la caisse est une sortie.

En dessous, l'historique des mouvements, filtrable par recherche libre sur le libellé, la catégorie, le montant ou la date.

## Enregistrer un mouvement

Le bouton **Nouveau mouvement** ouvre un formulaire simplifié (pour une entrée ou une sortie d'espèces ; un dépôt en banque se saisit au grand livre, voir plus bas) :

- **Type** — Entrée (recette, par exemple une vente à la buvette) ou Sortie (dépense, par exemple un achat de boissons) ;
- **Montant** et **date** ;
- **Catégorie** — la liste s'adapte au sens du mouvement : *Événements & buvette*, *Boutique & cordages*, *Adhésion & cotisation*, *Divers* en entrée ; *Événements & buvette (achats)*, *Matériel club*, *Divers* en sortie ;
- **Description**.

## Déposer les espèces en banque

Un dépôt d'espèces n'est ni une recette ni une dépense : c'est un **virement interne**. Il se saisit depuis le [Grand livre](/admin/help/grand-livre) :

- **Compte source** : Caisse physique
- **Compte destinataire** : Compte Courant
- **Date** : le jour où les espèces quittent réellement la caisse
- **Date de crédit** : le jour où la banque les porte au compte, s'il est différent

Le virement écrit alors deux écritures : la caisse baisse le jour du dépôt, le compte courant monte le jour du crédit. Entre les deux, l'argent est **en transit** — c'est normal, et l'écran de [rapprochement bancaire](/admin/help/rapprochement-bancaire) l'affiche.

La ligne du relevé bancaire correspondante sera ensuite associée à la jambe créditrice lors du rapprochement.

> [!TIP]
> Le solde affiché doit toujours correspondre à l'argent réellement présent dans la caisse du club. Un écart signale un mouvement oublié : comptez la caisse avant chaque dépôt en banque.

Lorsque la saison est clôturée, l'écran passe en lecture seule et le formulaire est désactivé.
