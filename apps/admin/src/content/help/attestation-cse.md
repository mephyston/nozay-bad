---
title: "Attestation CSE"
description: "Générer l'attestation de paiement d'un adhérent et personnaliser le modèle."
category: "adherents"
order: 5
---

L'**attestation CSE** est le document que l'adhérent transmet à son comité d'entreprise pour se faire rembourser sa cotisation. C'est le seul document généré par l'application à destination des adhérents.

## Générer une attestation

Depuis la [liste des adhérents](/admin/help/gestion-adherents) ou depuis sa [fiche](/admin/help/fiche-adherent), l'entrée **Attestation CSE** ouvre le PDF dans un nouvel onglet.

> [!IMPORTANT]
> L'attestation est délivrée dès qu'un **premier règlement** a été enregistré. Tant que le solde reste ouvert, elle indique le montant de la cotisation **et** le montant réglé à ce jour ; une fois soldée, elle dit simplement que la cotisation a été réglée. Tant que rien n'a été reçu, l'application affiche « Attestation indisponible » et en explique la raison.

Le document reprend le nom, le prénom et la date de naissance de l'adhérent, le montant dû (en chiffres et en toutes lettres), la saison, ainsi que le moyen et la date du **dernier paiement enregistré** pour cet adhérent. À défaut de paiement identifié, il mentionne un virement à la date de validation.

L'adhérent peut aussi télécharger lui-même son attestation depuis son espace, sans passer par le bureau.

## Personnaliser le modèle

**Réglages → Attestation CSE** permet de régler ce qui est commun à toutes les attestations :

- **Signataire** — nom, adresse mail et site web imprimés sur le document ;
- **Signature** — l'image apposée en bas de l'attestation.

La signature doit être un fichier **JPEG de 48 Ko au maximum**. Le format et le poids sont vérifiés à la sélection, puis de nouveau à l'enregistrement. Tant qu'aucune signature n'a été déposée, l'application utilise celle du modèle d'origine et l'indique sous l'aperçu.
