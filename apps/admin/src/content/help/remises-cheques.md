---
title: "Chèques et remises"
description: "Enregistrer un chèque reçu, générer un bordereau de remise et l'encaisser."
category: "comptabilite"
order: 5
---

La rubrique **Comptabilité → Remises de chèques** se divise en deux écrans : la **gestion des chèques** reçus, et les **bordereaux de remise** déposés en banque.

Un chèque passe par trois états : *reçu* (en coffre) → *déposé* (inclus dans un bordereau) → *encaissé* (le bordereau est rapproché du relevé).

## 1. Enregistrer un chèque

Depuis **Gestion des chèques**, le bouton **Enregistrer un chèque** ouvre un formulaire en deux parties.

**Scanner** — prenez le chèque en photo. L'analyse remplit le numéro, le montant, l'émetteur, la banque et la date d'émission, et propose l'adhérent dont le nom correspond à celui de l'émetteur ou d'un représentant légal. Relisez toujours les champs remplis ainsi.

**Saisir manuellement** — les mêmes champs, à renseigner vous-même :

- **N° de chèque** (7 chiffres), **montant**, **émetteur** — obligatoires ;
- **Banque** et **date d'émission** — facultatives ;
- **Adhérent concerné** — pour l'imputation de la cotisation ;
- **Affectation / catégorie** — l'imputation comptable de la recette.

À l'enregistrement, l'application crée **automatiquement une recette au Compte Courant**, portant la référence « Chèque n° … ». Si un adhérent est désigné et que la catégorie est celle de l'adhésion, le montant est en plus **reporté sur sa cotisation**.

Supprimer un chèque supprime l'écriture correspondante et défait ce report.

### Modifier un chèque

Depuis la liste, le menu **⋯** d'une ligne propose **Modifier** : tous les champs se corrigent (numéro, montant, émetteur, banque, adhérent, catégorie, date d'émission) et la recette du grand livre suit. Un chèque déjà inclus dans un bordereau ne se modifie plus : supprimez d'abord la remise, corrigez, puis recréez-la.

## 2. Générer un bordereau de remise

Lorsque vous partez déposer plusieurs chèques :

1. Cochez les chèques concernés dans la liste des chèques *reçus* ;
2. Cliquez sur **Créer une remise** ;
3. La **référence est proposée automatiquement** (du type `REMISE-20260315-3`) et reste modifiable ; renseignez la date ;
4. Validez.

Les chèques sélectionnés passent en *déposé* et la remise apparaît dans l'écran **Bordereaux de remise**. **Consulter / Imprimer** ouvre le bordereau en PDF dans un nouvel onglet, sur le papier à lettre du club, à joindre au dépôt.

## 3. Encaisser la remise

Quand la remise apparaît sur le relevé bancaire, ouvrez-la et choisissez la ligne du relevé correspondante parmi les opérations en attente. La remise passe en *encaissée* et la ligne bancaire est marquée rapprochée.

## Défaire une remise

Supprimer un bordereau **libère les chèques qu'il contenait** — ils redeviennent disponibles pour une nouvelle remise — et remet, le cas échéant, la ligne bancaire associée en attente.

> [!NOTE]
> Un chèque encore en coffre ou une remise non encaissée **empêche la clôture de l'exercice**. Voir [Saisons comptables](/admin/help/gestion-saisons).
