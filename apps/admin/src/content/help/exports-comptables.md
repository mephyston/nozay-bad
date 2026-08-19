---
title: "Exports comptables"
description: "Récupérer le journal, les factures et les justificatifs d'une saison."
category: "comptabilite"
order: 10
---

L'application produit quatre exports, tous portant sur **une saison**. Ils servent à constituer le dossier de l'exercice, à le transmettre au vérificateur aux comptes, ou à archiver hors de l'application.

| Export | Contenu | Format |
|---|---|---|
| **Complet** | Factures en PDF, justificatifs de notes de frais, journal comptable | ZIP |
| **Factures** | Toutes les factures de la saison en PDF | ZIP |
| **Notes de frais** | Les justificatifs joints aux notes de frais | ZIP |
| **Journal comptable** | Toutes les écritures de la saison | CSV |

## Le journal comptable

Le fichier CSV comporte une ligne par écriture, avec les colonnes : *Date*, *Type*, *Description*, *Montant EUR*, *Catégorie*, *Mode de paiement*, *Référence*, *Membre*. Le séparateur est le point-virgule et le fichier s'ouvre directement dans un tableur, accents compris.

## Où les déclencher

- Le bouton **Exporter (ZIP)** de l'écran [Factures](/admin/help/gestion-factures) télécharge l'export des factures.
- Les autres exports s'obtiennent depuis les écrans de rapports, en ajoutant le paramètre d'export à l'adresse de la page (`?season=25-26&export=all`, `…&export=ledger`, `…&export=expenses`, `…&export=invoices`).

Ils exigent le droit d'**export des rapports**, distinct du droit de simple consultation.

> [!NOTE]
> Si un justificatif ou une facture ne peut pas être produit, l'archive contient à sa place un fichier texte décrivant l'erreur : l'export n'échoue jamais en bloc, et vous savez précisément ce qui manque. Une saison sans document donne une archive contenant un fichier `vide.txt`.
