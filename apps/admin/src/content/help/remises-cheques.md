---
title: "Chèques et remises"
description: "Enregistrer un chèque reçu, générer un bordereau de remise et l'encaisser."
category: "comptabilite"
order: 6
---

La rubrique **Comptabilité → Remises de chèques** se divise en deux écrans : la **gestion des chèques** reçus, et les **bordereaux de remise** déposés en banque.

Un chèque passe par trois états : *reçu* (en coffre, même déjà inscrit sur un bordereau à déposer) → *déposé* (le bordereau a été remis à la banque) → *encaissé* (la remise est rapprochée du relevé).

Une remise passe elle aussi par trois états : *à déposer* (le bordereau est préparé et imprimé) → *déposée* (vous confirmez l'avoir remise au guichet) → *encaissée* (la ligne du relevé est pointée).

## 1. Enregistrer un chèque

Depuis **Gestion des chèques**, le bouton **Enregistrer un chèque** ouvre un formulaire en deux parties.

**Scanner** — prenez le chèque en photo. L'analyse remplit le numéro, le montant, l'émetteur, la banque et la date d'émission, et propose l'adhérent dont le nom correspond à celui de l'émetteur ou d'un représentant légal. Relisez toujours les champs remplis ainsi.

**Saisir manuellement** — les mêmes champs, à renseigner vous-même :

- **N° de chèque** (7 chiffres), **montant**, **émetteur** — obligatoires ;
- **Banque** et **date d'émission** — facultatives. La date doit tomber dans l'exercice choisi : une date d'un autre exercice est refusée, comme pour toute écriture du grand livre. Relisez en particulier l'**année** lue sur la photo ;
- **Adhérent concerné** — pour l'imputation de la cotisation ;
- **Affectation / catégorie** — l'imputation comptable de la recette.

À l'enregistrement, l'application crée **automatiquement une recette au Compte Courant**, portant la référence « Chèque n° … », au statut *en coffre* : elle compte dans le solde comptable, pas dans le solde bancaire théorique, jusqu'à l'encaissement de la remise.

Supprimer un chèque supprime l'écriture correspondante et défait ce report.

### Modifier un chèque

Depuis la liste, le menu **⋯** d'une ligne propose **Modifier** : tous les champs se corrigent (numéro, montant, émetteur, banque, adhérent, catégorie, date d'émission) et la recette du grand livre suit. Un chèque déjà inscrit sur un bordereau — même à déposer — ne se modifie ni ne se supprime plus : supprimez d'abord la remise, corrigez, puis recréez-la.

## 2. Générer un bordereau de remise

Lorsque vous partez déposer plusieurs chèques :

1. Cochez les chèques concernés dans la liste des chèques *reçus* ;
2. Cliquez sur **Créer une remise** ;
3. La **référence est proposée automatiquement** (du type `REMISE-20260315-3`) et reste modifiable ; renseignez la date ;
4. Validez.

La remise apparaît *à déposer* dans l'écran **Bordereaux de remise** ; les chèques qu'elle contient restent *reçus* mais ne sont plus sélectionnables pour une autre remise. **Consulter / Imprimer** ouvre le bordereau en PDF dans un nouvel onglet, sur le papier à lettre du club, à joindre au dépôt.

## 3. Confirmer le dépôt

Une fois le bordereau remis au guichet, le menu **⋯** de la remise propose **Confirmer le dépôt en banque** : la remise passe *déposée* et ses chèques *déposés*.

## 4. Encaisser la remise

Quand la remise apparaît sur le relevé bancaire, **Encaisser** propose les lignes en attente **du même montant** que la remise. La remise passe *encaissée*, la ligne bancaire est marquée rapprochée et **les recettes des chèques sont pointées sur cette ligne** : l'état de rapprochement n'en garde aucune trace.

Si aucune ligne ne porte le montant exact, soit le relevé n'est pas encore importé, soit la banque a rejeté un chèque : corrigez alors le bordereau (supprimez-le, retirez le chèque, recréez-le) plutôt que de pointer une ligne d'un autre montant.

## Défaire une remise

Supprimer un bordereau **libère les chèques qu'il contenait** — ils redeviennent disponibles pour une nouvelle remise — et, si la remise était encaissée, remet la ligne bancaire en attente et les recettes des chèques *en coffre*.

> [!NOTE]
> Un chèque encore en coffre ou une remise non encaissée **empêche la clôture de l'exercice**. Voir [Saisons comptables](/admin/help/gestion-saisons).
