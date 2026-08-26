---
title: "Catégories comptables"
description: "L'imputation choisie par les bénévoles, et son lien avec le plan comptable."
category: "comptabilite"
order: 13
---

Une **catégorie comptable** est l'imputation que choisit le bénévole au moment de saisir une écriture, de déposer une note de frais ou d'enregistrer un chèque. Elle évite d'avoir à connaître le plan comptable.

L'écran se trouve dans **Réglages → Catégories et classes**, onglet *Catégories comptables*.

## Les champs d'une catégorie

| Champ | Rôle |
|---|---|
| **Libellé Admin** | Le nom vu par le bureau dans les écrans comptables (« Achat de grips et accessoires ») |
| **Libellé Adhérent** | Le nom vu par l'adhérent lorsqu'il saisit une note de frais (« Grips & accessoires ») |
| **Classe Recette** | La classe de compte utilisée quand l'argent entre |
| **Classe Dépense** | La classe de compte utilisée quand l'argent sort |
| **Masquer pour les notes de frais** | Retire la catégorie de la liste proposée aux adhérents |
| **Catégorie active** | Une catégorie inactive n'est plus proposée en saisie |

Les deux libellés sont obligatoires ; les deux classes sont facultatives, mais une catégorie sans classe n'apparaît ni dans le compte de résultat par classe ni dans le budget.

## Créer, modifier, supprimer

Le bouton **Nouvelle catégorie** ouvre le formulaire ; le menu de chaque ligne permet de la modifier ou de la supprimer. Une catégorie déjà utilisée par des écritures gagne à être **désactivée** plutôt que supprimée : l'historique reste ainsi lisible.

## Où les catégories interviennent

- Elles sont obligatoires sur toute recette et toute dépense du [grand livre](/admin/help/grand-livre) ; un virement interne n'en porte jamais, et le logiciel refuse de lui en attribuer une.
- Elles structurent le [compte de résultat](/admin/help/rapports-financiers) et le [budget](/admin/help/budget-previsionnel).
- Chaque **famille de produits** de la boutique pointe vers une catégorie comptable, ce qui rend automatique l'écriture de recette à la validation d'une commande. Voir [Catégories de produits](/admin/help/categories-produits).
- La catégorie d'**adhésion** a un rôle particulier : un encaissement rattaché à un adhérent et imputé à cette catégorie met à jour le montant reçu de sa cotisation.

> [!NOTE]
> Certaines automatisations reconnaissent une catégorie à son libellé (« volant », « cordage », « matériel »…). Renommer largement une catégorie peut donc changer le comportement des suggestions de rapprochement ou la répartition par pôle du tableau de bord.
>
> Ce n'est **plus** le cas des virements internes : ils se reconnaissent désormais à leur nature, pas à un libellé. La catégorie « Virements Internes » a été désactivée et ne peut plus être attribuée.
