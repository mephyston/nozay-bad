---
title: "Liste des adhérents"
description: "Rechercher, filtrer et agir sur les adhérents d'une saison."
category: "adherents"
order: 1
---

La rubrique **Adhérents** affiche les membres inscrits pour une saison. Les dossiers proviennent de l'import Poona : ils ne se créent pas à la main dans l'application.

## Ce qu'affiche la liste

Chaque ligne montre le nom, la date de naissance, le numéro de licence, le genre, la formule d'adhésion (le *type* importé de Poona) et le statut du dossier :

- **Validé** — cotisation réglée intégralement ;
- **Paiement partiel** — un versement a été reçu, il reste un solde à devoir ;
- **En attente de paiement** — aucun règlement enregistré pour l'instant ;
- **Suspendu** — dossier annulé côté Poona.

Le statut suit le règlement lu dans l'export Poona, il se met donc à jour à chaque import. L'accès à l'espace adhérent s'ouvre dès qu'un versement, même partiel, est enregistré pour l'un des dossiers du foyer ; un dossier en attente de paiement ou suspendu n'y donne pas accès.

La liste est paginée par 20.

## Rechercher et filtrer

La barre de recherche porte sur le nom et le numéro de licence. Le bouton de filtres ouvre quatre critères supplémentaires :

- **Saison** — l'exercice consulté ;
- **Genre** — Homme / Femme ;
- **Type d'adhérent** — Compétiteur / Loisir ;
- **Statut** — Validé / Paiement partiel / En attente de paiement / Suspendu.

Un bouton *Réinitialiser* remet les critères à leur valeur par défaut.

## Les actions sur une ligne

Le menu d'actions de chaque ligne propose :

- **Voir le profil** — ouvre la [fiche de l'adhérent](/admin/help/fiche-adherent) ;
- **Autoriser / Retirer note de frais** — ouvre ou ferme à cet adhérent la possibilité de déposer une note de frais depuis son espace ; l'application demande confirmation ;
- **Attestation CSE** — ouvre l'attestation en PDF dans un nouvel onglet. Cette entrée n'apparaît **que si la cotisation est intégralement réglée**.

## Importer les adhérents

Le bouton **Import Poona**, en haut de la liste, mène à l'écran d'import. Voir [Import Poona](/admin/help/import-poona).

## Exporter les mails

Le bouton **Exporter les mails**, à côté de l'import, télécharge un fichier CSV (nom, prénom, licence, statut, adresse) ouvrable dans un tableur. Il suit **les filtres en cours** : filtrez par statut « En attente de paiement » et vous obtenez les adresses à relancer ; sans filtre, toute la saison affichée.

Seule l'adresse propre de l'adhérent y figure, pas celles des parents ; un adhérent sans adresse n'apparaît pas dans le fichier. Le bouton n'est proposé qu'aux rôles qui ont le droit d'exporter le fichier des adhérents (présidence, secrétariat).

> [!NOTE]
> Les autres exports sont ceux de la comptabilité (journal, factures, justificatifs) — voir [Exports comptables](/admin/help/exports-comptables).
