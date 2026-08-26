---
title: "Rapprochement bancaire"
description: "Importer le relevé, associer chaque ligne à une écriture, une facture ou un adhérent."
category: "comptabilite"
order: 4
---

Le rapprochement consiste à faire correspondre chaque ligne du relevé de banque avec la comptabilité du club. C'est aussi le moyen le plus rapide de saisir : une ligne non rapprochée peut créer son écriture d'un clic.

## 1. Importer le relevé

Depuis **Comptabilité → Rapprochement bancaire**, le bouton d'import demande un fichier d'export bancaire (format **OFX**) et le compte de destination : *détection automatique depuis le fichier*, Compte Courant, Compte Livret ou Caisse physique.

Chaque opération du fichier porte un identifiant unique fourni par la banque. **Un même relevé peut donc être réimporté sans créer de doublon** : seules les opérations inconnues sont ajoutées, en statut *En attente*.

## 2. Faire analyser les lignes

Le bouton d'analyse fait proposer, pour chaque ligne en attente, une **catégorie comptable** et, lorsqu'il est identifiable, l'**adhérent** concerné. La suggestion s'appuie sur le libellé bancaire, les rapprochements que vous avez déjà validés, le catalogue de la boutique et les montants restant dus par les adhérents. L'analyse peut être relancée sur une seule ligne.

Ce n'est qu'une proposition : rien n'est enregistré tant que vous n'avez pas validé.

## 3. Traiter une ligne

La liste de gauche répartit les lignes en trois onglets — **En attente**, **Rapprochées**, **Ignorées** — avec une recherche libre. Sélectionner une ligne ouvre à droite un panneau proposant trois façons de la traiter :

- **Saisir écriture** — créer l'écriture correspondante (type, catégorie, montant, date, libellé, adhérent). Une même ligne bancaire peut être **ventilée en plusieurs écritures** : ajoutez des lignes de répartition tant que le montant n'est pas soldé.
- **Associer** — rattacher la ligne à une écriture **déjà saisie** dans le grand livre (un chèque enregistré, une jambe de virement interne, une note de frais validée…).

> [!IMPORTANT]
> Un virement entre deux comptes du club apparaît sur **les deux relevés**. Saisissez-le une fois depuis le [grand livre](/admin/help/grand-livre) — il y écrit deux écritures — puis associez **chacune** des deux lignes de relevé à sa jambe. N'en associer qu'une laisse un écart que rien n'explique, et l'écran vous le signale.
- **Associer facture** — rattacher la ligne à une ou plusieurs **factures en attente de règlement**. Les factures concernées passent automatiquement au statut *Payée*.

Une ligne est marquée **Rapprochée** dès que le total des écritures qui lui sont rattachées atteint son montant. Tant qu'il reste un écart, elle demeure en attente et vous pouvez continuer à la ventiler.

### Rattacher un adhérent

Le champ *adhérent* du panneau lie l'écriture à un dossier. Si l'écriture est imputée à la catégorie d'**adhésion**, le montant est en plus **reporté sur la cotisation de l'adhérent** : son montant reçu augmente et son solde diminue.

### Ignorer une ligne

Le bouton **Ignorer** écarte une ligne qui n'a pas à être comptabilisée. Elle bascule dans l'onglet *Ignorées*, d'où elle peut être rétablie.

## 4. Traiter plusieurs lignes d'un coup

Des cases à cocher permettent de sélectionner plusieurs lignes en attente, puis :

- **Rapprocher en lot** — crée pour chaque ligne sélectionnée l'écriture issue de sa suggestion d'analyse. Les lignes sans suggestion sont laissées de côté.
- **Ignorer en lot** — après confirmation.

> [!WARNING]
> Le rapprochement en lot applique les suggestions sans que vous les ayez relues une à une. Réservez-le aux lots homogènes et bien identifiés.

## Contrôles

Le rapprochement d'une écriture ou d'une facture appartenant à une **saison clôturée** est refusé, de même que le rattachement d'une facture déjà payée ou annulée. Les règles de date et de régularisation du [grand livre](/admin/help/grand-livre) s'appliquent aux écritures créées depuis cet écran.

Il reste toujours possible de défaire un rapprochement en supprimant l'écriture rattachée : la ligne bancaire repasse alors en attente.
