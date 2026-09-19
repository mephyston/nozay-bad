---
title: "Caisse"
description: "Suivre les espèces : entrées, sorties et dépôt en banque."
category: "comptabilite"
order: 3
---

La rubrique **Caisse** est la vue du compte **Caisse** : les billets et les pièces détenus par le club. C'est le même écran qui sert à tout compte sans relevé bancaire, comme le [porte-monnaie Badnet](/admin/help/porte-monnaie-badnet) : chacun a son adresse, `/admin/accounting/accounts/<code>`, et ses gestes pré-câblés.

## Ce que montre l'écran

Quatre indicateurs en haut de page : le **solde initial** de la saison, le total des **entrées**, le total des **sorties** et le **solde courant**. Les virements internes sont comptés dans ce calcul — de l'argent transféré vers la caisse est une entrée, de l'argent transféré depuis la caisse est une sortie.

En dessous, l'historique des mouvements, filtrable par recherche libre sur le libellé, la catégorie, le montant ou la date.

## Enregistrer un mouvement

Le bouton **Nouveau** propose les trois gestes de la caisse : **Espèces reçues** (une recette : une cotisation, une vente à la buvette, une inscription), **Dépense payée en espèces** (un achat de boissons, par exemple) et **Dépôt d'espèces en banque** (voir plus bas). Chacun ouvre le formulaire du grand livre avec le compte et le mode de règlement déjà choisis ; il reste le montant, la date, la catégorie et la description.

Quand c'est un adhérent qui paie — une cotisation, une inscription —, choisissez-le dans le champ **Adhérent** : c'est ce rattachement qui fait apparaître le règlement sur sa fiche et dans son attestation. Une vente à la buvette reste une recette générale, sans adhérent. Le formulaire ne propose que les adhésions de l'exercice d'affectation : une cotisation de rentrée encaissée en août se rattache à l'adhésion de la saison qui commence, pas à celle de l'année écoulée.

La caisse s'appelle comme vous voulez : son libellé se change dans *Paramètres → Comptes et moyens de paiement*. Si elle reçoit autre chose que les espèces de la buvette, « Caisse » suffit ; la buvette se distingue par sa **catégorie** de recette, pas par un compte.

## Déposer les espèces en banque

Un dépôt d'espèces n'est ni une recette ni une dépense : c'est un **virement interne**. Le bouton **Nouveau → Dépôt en banque** l'ouvre avec les deux comptes déjà choisis :

- **Compte source** : Caisse
- **Compte destinataire** : Compte Courant
- **Date** : le jour où les espèces quittent réellement la caisse
- **Date de crédit** : le jour où la banque les porte au compte, s'il est différent

Le virement écrit alors deux écritures : la caisse baisse le jour du dépôt, le compte courant monte le jour du crédit. Entre les deux, l'argent est **en transit** — c'est normal, et l'écran de [rapprochement bancaire](/admin/help/rapprochement-bancaire) l'affiche.

La ligne du relevé bancaire correspondante sera ensuite associée à la jambe créditrice lors du rapprochement.

> [!TIP]
> Le solde affiché doit toujours correspondre à l'argent réellement présent dans la caisse du club. Un écart signale un mouvement oublié : comptez la caisse avant chaque dépôt en banque.

## Corriger ou supprimer un mouvement

Le menu d'actions de chaque ligne permet de **modifier** ou de **supprimer** le mouvement. La modification rouvre le formulaire rempli de ce que la ligne porte ; c'est le même geste que dans le [grand livre](/admin/help/grand-livre), avec les mêmes droits.

Un virement se corrige et se supprime **entier**, ses deux jambes à la fois, quel que soit le compte depuis lequel on l'ouvre : le formulaire montre le compte source, le compte destinataire et les deux dates. Si l'une des jambes a déjà été pointée au rapprochement, son montant et son compte ne bougent plus — dissociez-la d'abord, puis corrigez. Le libellé, la référence et les dates restent modifiables.

Lorsque la saison est clôturée, l'écran passe en lecture seule : le formulaire est désactivé et le menu des lignes disparaît.
