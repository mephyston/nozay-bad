---
title: "Notes de frais"
description: "Traiter les demandes de remboursement des bénévoles, de la saisie au remboursement."
category: "comptabilite"
order: 8
---

Une **note de frais** est une demande de remboursement pour un achat effectué pour le compte du club. L'écran se trouve dans **Comptabilité → Notes de frais** et présente deux listes : les demandes **en attente** et l'**historique** (validées et refusées), toutes deux avec une recherche libre sur le demandeur et le motif.

## D'où viennent les demandes

- **De l'adhérent** — depuis son espace, s'il y a été **autorisé** depuis sa fiche. Voir [Fiche d'un adhérent](/admin/help/fiche-adherent).
- **Du bureau** — le bouton de saisie permet d'enregistrer une note au nom d'un adhérent, avec le même formulaire.

Une note comporte : le **demandeur**, une **catégorie de dépense**, un **montant**, une **description**, et un **justificatif** photographié. Le justificatif est limité à **800 Ko** ; les catégories marquées « masquée pour les notes de frais » n'apparaissent pas dans la liste proposée.

## Traiter une demande

Une note en attente peut être :

- **Consultée** — le justificatif s'ouvre en grand ;
- **Modifiée** — montant, catégorie, description, demandeur, saison d'affectation ;
- **Validée** ou **refusée**.

**La validation crée l'écriture de dépense** dans le grand livre, libellée « Remboursement frais – *demandeur* – *description* », rattachée à l'adhérent et imputée à la catégorie choisie. Le remboursement effectif (le virement) apparaîtra ensuite sur le relevé bancaire et se rattachera à cette écriture lors du [rapprochement bancaire](/admin/help/rapprochement-bancaire).

Un refus laisse la demande dans l'historique sans écrire quoi que ce soit en comptabilité.

Dans les deux cas, **l'adhérent est notifié** sur son téléphone s'il a activé les notifications.

## Revenir sur une décision

**Annuler la validation** remet la note en attente et **supprime l'écriture comptable** créée. Si cette écriture était rapprochée d'une ligne bancaire et qu'aucune autre écriture ne la couvrait, la ligne bancaire repasse en attente.

## Ce qui est refusé

Toute action — dépôt, modification, validation, refus, annulation — est refusée dès lors que la saison concernée est **clôturée**. Réaffecter une note vers une saison clôturée l'est également. Enfin, le serveur revérifie au dépôt que l'adhérent est bien autorisé : retirer l'autorisation prend effet immédiatement.

> [!NOTE]
> Les droits sont séparés : *saisir et modifier* d'un côté, *valider, refuser et annuler* de l'autre. Un trésorier dispose des deux, la présidence uniquement du second.
