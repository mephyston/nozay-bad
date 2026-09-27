# RF-SHO-001 : Passage et Validation de Commande

## 1. Description et Objectif Métier
Un adhérent du club peut commander un ou plusieurs articles disponibles dans la boutique du club. La commande réserve les articles en stock et génère le montant total dû.

---

## 2. Domaine Fonctionnel
- **Domaine** : `shop`
- **Agrégat / Entité clé** : `Commande` / `LigneDeCommande`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier
1. Une commande ne peut être passée que si la quantité demandée pour chaque produit est **inférieure ou égale au stock disponible**.
2. Dès la validation de la commande par le bureau, le stock de chaque produit commandé est immédiatement décrémenté de la quantité correspondante. La suite du cycle de vie est décrite par [RF-SHO-003](./RF-SHO-003-workflow-paiement-commande.md).
3. Le montant total de la commande est la somme exacte des `(quantité * prix_unitaire)` de chaque ligne.
4. Une commande vide (0 article) est refusée.
5. **Qui peut commander** : l'adhérent dont la cotisation a reçu au moins un règlement — statut « Validé » (soldée) ou « Paiement partiel ». C'est la même règle que l'accès à l'espace adhérent. Un adhérent « En attente de paiement » (rien reçu) ou « Suspendu » ne commande pas, et le refus le dit en clair. La règle vaut pour la commande passée par l'adhérent comme pour celle que le bureau saisit ou corrige en son nom. *(Décision du 27/09/2026 : la boutique exigeait jusque-là une cotisation soldée.)*

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Passage et Validation de Commande

  Scénario: Passage de commande réussi avec stock suffisant
    Étant donné un adhérent "Marc Dupont"
    Et un produit "Boîte Volants Plumes" avec un stock de 10 unités au prix de 20,00 €
    Quand l'adhérent passe commande de 2 unités de "Boîte Volants Plumes"
    Alors la commande est créée au statut "created" avec un montant total de 40,00 €
    Et le stock restant de "Boîte Volants Plumes" devient 8 unités dès que le bureau la valide

  Scénario: Refus de commande pour stock insuffisant
    Étant donné un produit "Maillot Club Taille M" avec un stock de 1 unité
    Quand un adhérent tente de commander 2 unités de "Maillot Club Taille M"
    Alors la commande est refusée avec le message "Stock insuffisant pour Maillot Club Taille M"
    Et le stock de "Maillot Club Taille M" reste inchangé à 1 unité

  Scénario: Commande d'un adhérent en paiement partiel
    Étant donné que la cotisation de "Camille Durand" a reçu un premier versement sur deux
    Quand Camille commande 1 unité de "Boîte Volants Plumes"
    Alors la commande est créée au statut "created"

  Scénario: Refus pour une cotisation sans aucun règlement
    Étant donné que la cotisation de "Léo Petit" n'a reçu aucun règlement
    Quand le bureau tente de créer une commande au nom de Léo
    Alors la commande est refusée avec le message "La cotisation de Léo n'a pas encore été réglée : la boutique s'ouvre dès le premier versement."
```
