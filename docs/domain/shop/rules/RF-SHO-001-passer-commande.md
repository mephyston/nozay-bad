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
2. Dès la validation de la commande, le stock de chaque produit commandé est immédiatement décrémenté de la quantité correspondante.
3. Le montant total de la commande est la somme exacte des `(quantité * prix_unitaire)` de chaque ligne.
4. Une commande vide (0 article) est refusée.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Passage et Validation de Commande

  Scénario: Passage de commande réussi avec stock suffisant
    Étant donné un adhérent "Marc Dupont"
    Et un produit "Boîte Volants Plumes" avec un stock de 10 unités au prix de 20,00 €
    Quand l'adhérent passe commande de 2 unités de "Boîte Volants Plumes"
    Alors la commande est créée au statut "pending" avec un montant total de 40,00 €
    Et le stock restant de "Boîte Volants Plumes" devient 8 unités

  Scénario: Refus de commande pour stock insuffisant
    Étant donné un produit "Maillot Club Taille M" avec un stock de 1 unité
    Quand un adhérent tente de commander 2 unités de "Maillot Club Taille M"
    Alors la commande est refusée avec le message "Stock insuffisant pour Maillot Club Taille M"
    Et le stock de "Maillot Club Taille M" reste inchangé à 1 unité
```
