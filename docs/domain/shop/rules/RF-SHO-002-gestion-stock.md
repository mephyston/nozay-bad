# RF-SHO-002 : Gestion du Stock et Mouvements

## 1. Description et Objectif Métier
Assurer l'exactitude du stock de produits de la boutique, permettre le réassort par les administrateurs et réintégrer le stock lors d'une annulation de commande.

---

## 2. Domaine Fonctionnel
- **Domaine** : `shop`
- **Agrégat / Entité clé** : `Produit` / `MouvementStock`
- **Statut** : Validé

---

## 3. Définition de la Règle Métier
1. Tout réassort d'un produit par un administrateur incrémente le stock disponible.
2. L'annulation d'une commande non livrée réintègre automatiquement la quantité des articles annulés dans le stock disponible.
3. Le stock d'un produit ne peut jamais être négatif.

---

## 4. Scénarios d'Acceptation (Gherkin)

```gherkin
# language: fr

Fonctionnalité: Gestion et Réintégration du Stock

  Scénario: Réintégration de stock lors de l'annulation d'une commande
    Étant donné une commande au statut "pending" contenant 3 unités de "Grip Premium"
    Et un stock actuel de "Grip Premium" à 5 unités
    Quand l'administrateur annule la commande
    Alors le statut de la commande devient "cancelled"
    Et le stock disponible de "Grip Premium" redevient 8 unités

  Scénario: Réassort de produit par un administrateur
    Étant donné un produit "Cordage BG65" avec un stock actuel de 2 unités
    Quand l'administrateur ajoute un réassort de 20 unités
    Alors le nouveau stock de "Cordage BG65" devient 22 unités
```
