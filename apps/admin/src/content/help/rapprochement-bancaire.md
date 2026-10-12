---
title: "Rapprochement bancaire"
description: "Importer le relevé, associer chaque ligne à une écriture, une facture ou un adhérent."
category: "comptabilite"
order: 5
---

Le rapprochement consiste à faire correspondre chaque ligne du relevé de banque avec la comptabilité du club. C'est aussi le moyen le plus rapide de saisir : une ligne non rapprochée peut créer son écriture d'un clic.

## 1. Importer le relevé

Depuis **Comptabilité → Rapprochement bancaire**, le bouton d'import demande un fichier d'export bancaire (format **OFX**) et le compte de destination : *détection automatique depuis le fichier*, Compte Courant, Compte Livret ou Caisse physique.

Chaque opération du fichier porte un identifiant unique fourni par la banque. **Un même relevé peut donc être réimporté sans créer de doublon** : seules les opérations inconnues sont ajoutées, en statut *En attente*.

## 2. Faire analyser les lignes

Le bouton d'analyse fait proposer, pour chaque ligne en attente, une **catégorie comptable** et, lorsqu'il est identifiable, l'**adhérent** concerné. La suggestion s'appuie sur le libellé bancaire, les rapprochements que vous avez déjà validés, le catalogue de la boutique et les montants restant dus par les adhérents. L'analyse peut être relancée sur une seule ligne.

Ce n'est qu'une proposition : rien n'est enregistré tant que vous n'avez pas validé.

## 3. Traiter une ligne

La liste de gauche répartit les lignes en trois onglets — **En attente**, **Rapprochées**, **Ignorées** — avec une recherche libre. Sous le libellé de chaque ligne, la **proposition** s'affiche avec sa nature en étiquette (« Recette », « Déjà saisie », « Virement entre nos comptes »…).

Chaque ligne porte au plus deux boutons :

- le **geste proposé**, quand il y en a un : **Pointer** une écriture qui existe déjà, **Valider** la proposition de l'analyse, ou **Virement** quand l'analyse a reconnu un virement entre deux comptes du club ;
- **Traiter**, qui ouvre la ligne. Au téléphone, un appui sur la ligne fait la même chose, et le balayage offre les deux mêmes gestes.

Une ligne ouverte pose une seule question : **« Qu'est-ce que cette ligne ? »**. La nature proposée est déjà cochée, marquée *Proposée*. Le formulaire qui suit dépend de la réponse :

| Nature | Pour | Ce qui est enregistré |
|---|---|---|
| **Recette** / **Dépense** | Une entrée ou une sortie à imputer à une catégorie | L'écriture, éventuellement **ventilée** en plusieurs parts (un adhérent par part) tant que le montant n'est pas soldé |
| **Déjà saisie** | Une opération que les livres portent déjà : chèque enregistré, commande encaissée, note de frais validée… | Rien de nouveau : la ligne est associée à l'écriture existante. Le nombre entre parenthèses compte les écritures au même montant, à ±7 jours |
| **Règlement de facture** (crédit) | Le paiement d'une ou plusieurs **factures en attente de règlement** | Les factures choisies remplissent l'écriture, une part par facture, que vous relisez avant d'enregistrer. Elles passent au statut *Payée* |
| **Remboursement d'une recette** (débit) | De l'argent rendu : trop-perçu d'une cotisation, article remboursé | Une recette négative dans sa catégorie : la recette diminue, aucune charge n'est créée. Une seule imputation |
| **Virement entre nos comptes** | De l'argent qui passe d'un compte du club à un autre | Les deux écritures, une par compte, hors résultat. Voir ci-dessous |
| **Avance d'un adhérent** (crédit, compte bancaire) | Un adhérent a viré au club pour alimenter son porte-monnaie | Un virement depuis le compte d'attente des adhérents : l'argent lui reste dû. Son porte-monnaie se crédite ensuite depuis l'écran du porte-monnaie |

Le bouton d'enregistrement dit ce qu'il fait : « Enregistrer la recette », « Enregistrer le virement », « Enregistrer l'avance »…

> [!IMPORTANT]
> Un virement entre deux comptes du club apparaît sur **les deux relevés**. La nature **Virement entre nos comptes** le saisit en un geste : choisissez le compte d'en face, elle écrit les deux écritures — une par compte — et pointe la ligne. Si le relevé de l'autre compte porte la ligne qui répond (même montant, sens opposé, à quelques jours près), elle est pointée en même temps ; sinon, associez-la depuis cet autre compte. Le [grand livre](/admin/help/grand-livre) reste possible. N'associer qu'une des deux lignes laisse un écart que rien n'explique, et l'écran vous le signale.

Une ligne est marquée **Rapprochée** dès que le total des écritures qui lui sont rattachées atteint son montant. Tant qu'il reste un écart, elle demeure en attente et vous pouvez continuer à la ventiler.

Dans l'état de rapprochement, un pointage compte à la **date de la ligne de relevé**. Une ligne du 9 associée à une écriture datée du 10 figure, pour un arrêté au 9, parmi les *lignes de relevé non comptabilisées* : la banque l'a vue, les livres pas encore à cette date. Ce décalage n'est pas un écart et disparaît au relevé suivant. Pour l'éviter, datez l'écriture du jour du relevé.

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
