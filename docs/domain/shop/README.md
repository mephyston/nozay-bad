# Domaine Métier : Shop (Boutique)

Le domaine **Shop** gère le catalogue des produits (volants, maillots, cordages, textiles), la prise de commandes par les adhérents, la gestion du stock et l'historique des ventes de la boutique du club.

---

## Dictionnaire de Données & Glossaire Métier

| Terme Métier | Définition & Contexte | Type / Exemple |
|---|---|---|
| **Produit** | Article en vente dans la boutique du club (ex: Boîte de volants, Maillot officiel). | `Entity` (`id`, `name`, `category`, `price`, `stock`) |
| **Catégorie Produit** | Famille d'articles (Volants, Cordages, Textiles, Accessoires). | `Enum` / `string` |
| **Commande** | Ensemble d'articles réservés ou achetés par un adhérent. | `Aggregate` (`id`, `memberId`, `totalAmount`, `status`) |
| **Ligne de Commande** | Quantité et prix unitaire d'un produit donné au sein d'une commande. | `Value Object` (`productId`, `quantity`, `unitPrice`) |
| **Statut de Commande** | État du cycle de vie de la commande (`pending`, `paid`, `delivered`, `cancelled`). | `Enum` |
| **Mouvement de Stock** | Variation du stock disponible (entrée réassort, sortie vente, ajustement inventaire). | `Event` / `Record` (`productId`, `delta`, `reason`) |

---

## Règles Fonctionnelles du Domaine

- [RF-SHO-001 : Passage et Validation de Commande](./rules/RF-SHO-001-passer-commande.md)
- [RF-SHO-002 : Gestion du Stock et Alertes Réassort](./rules/RF-SHO-002-gestion-stock.md)
