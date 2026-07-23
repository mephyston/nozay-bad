# Spécification de Conception : Formulaire Simplifié de la Boutique Club

- **Date** : 2026-07-23
- **Statut** : Approuvé
- **Auteur** : Antigravity & Équipe NBA

---

## 1. Contexte & Objectif

Actuellement, la boutique club (`libs/domains/shop/list-products/ui/ShopCatalog.svelte`) affiche l'ensemble des articles sous forme de cartes individuelles. Chaque carte possède son propre sélecteur de mode de paiement, son propre sélecteur de quantité et son propre bouton de commande.

Cette approche devient difficile à naviguer lorsque le catalogue grandit et nécessite des saisies répétitives pour l'utilisateur.

L'objectif de cette fonctionnalité est de **simplifier le parcours d'achat** en le remplaçant par un **formulaire unique de commande unifié**, structuré dans l'ordre suivant :
1. Sélection de l'adhérent (acheteur)
2. Sélection du mode de paiement
3. Filtrage par type de produit (catégorie)
4. Sélection du produit correspondant et de la quantité
5. Récapitulatif avec calcul dynamique du prix total et validation Turnstile

---

## 2. Architecture & Interface Utilisateur (`ShopCatalog.svelte`)

Le composant Svelte 5 `ShopCatalog.svelte` est réécrit pour présenter une carte unifiée unique (`Card.Root`).

### 2.1 Structure du formulaire

```
┌────────────────────────────────────────────────────────┐
│  🛒 Boutique Club                                      │
├────────────────────────────────────────────────────────┤
│  1. Acheteur (Adhérent)                                │
│     [ Rechercher par Nom, Prénom, Licence...        ▼ ]│
│     ✓ Adhérent sélectionné : Jean D.                   │
│                                                        │
│  2. Mode de paiement                                   │
│     [ Virement                                      ▼ ]│
│                                                        │
│  3. Article & Quantité                                 │
│     Type de produit :                                  │
│     [ Toutes les catégories                         ▼ ]│
│                                                        │
│     Produit :                                          │
│     [ Volants Yonex AS20 — 22.00 € (Stock: 15)      ▼ ]│
│                                                        │
│     Quantité :                                         │
│     [ - ]  2  [ + ]                                    │
│                                                        │
│  4. Récapitulatif de la commande                       │
│     Article : Volants Yonex AS20                       │
│     Total : 44.00 € (2 x 22.00 €)                      │
│     [ Widget Turnstile anti-bot ]                      │
│                                                        │
│     [ 🛒 Valider la commande ]                         │
└────────────────────────────────────────────────────────┘
```

### 2.2 Détail des champs

1. **Acheteur (Adhérent)** :
   - Champ texte autocomplété avec menu déroulant (`combobox`) recherchant via `/api/members-search?q=...`.
   - Préservation des règles de masquage de la vie privée (Nom `D.`, Licence `12***67`).
   - Badge vert confirmant la sélection ou badge rouge avertissant si non sélectionné.

2. **Mode de Paiement** :
   - Choix parmi : `Virement`, `Chèque`, `Espèces`, `Labaz`, `Chèque ANCV`, `Pass'Sport`, `Ticket Loisir`, `Up Loisir`.

3. **Type de produit (Catégorie)** :
   - Options :
     - `all` : Toutes les catégories
     - `shuttlecock` : Volants
     - `string` : Cordages
     - `other` : Autres équipements
   - Le changement de catégorie filtre automatiquement la liste déroulante des produits. Si le produit actuellement sélectionné n'appartient pas à la nouvelle catégorie, la sélection de produit est réinitialisée sur le premier produit disponible de la catégorie.

4. **Produit** :
   - Menu déroulant affichant la liste des produits actifs filtrés par catégorie.
   - Format de l'option : `${product.name} — ${(product.price / 100).toFixed(2)} € (${product.stock > 0 ? `Stock: ${product.stock}` : 'Rupture'})`.
   - Désactivé ou désélectionné si le stock est épuisé.

5. **Quantité** :
   - Champ numérique et boutons `[-]` / `[+]`.
   - Borne minimale : `1`.
   - Borne maximale : `Math.min(product.stock, 99)`.

6. **Récapitulatif & Soumission** :
   - Encart récapitulatif calculant dynamiquement `Prix unitaire * Quantité`.
   - Intégration du widget Turnstile (Captcha).
   - Envoi d'une requête HTTP `POST` vers l'endpoint courant (page Astro `boutique.astro`).
   - Message de succès en cas de validation ou message d'erreur en cas d'échec/stock insuffisant.

---

## 3. Gestion de l'État Réactif (Svelte 5 Runes)

- `selectedMemberId` : `$state<string>('')`
- `selectedPaymentMethod` : `$state<string>('virement')`
- `selectedCategory` : `$state<string>('all')`
- `selectedProductId` : `$state<number | null>(null)`
- `selectedQuantity` : `$state<number>(1)`
- `submitting` : `$state<boolean>(false)`
- `successMessage` : `$state<string | null>(null)`
- `errorMessage` : `$state<string | null>(null)`

### Calculs dérivés (`$derived`)
- `filteredProducts` : Filtre `products` par `selectedCategory` (`category === selectedCategory` ou `all`).
- `selectedProduct` : Produit correspondant à `selectedProductId`.
- `totalPriceCents` : `selectedProduct ? selectedProduct.price * selectedQuantity : 0`.
- `isFormValid` : `selectedMemberId !== '' && selectedProductId !== null && selectedProduct !== undefined && selectedProduct.stock >= selectedQuantity`.

---

## 4. Tests Unitaires (`ShopCatalog.test.ts`)

Mise à jour de `libs/domains/shop/list-products/ui/ShopCatalog.test.ts` pour vérifier :
1. L'affichage correct des catégories dans la première liste déroulante.
2. Le filtrage réactif de la seconde liste déroulante (produits) lorsque la catégorie change.
3. Le calcul dynamique du montant total lors du changement de produit ou de quantité.
4. L'envoi correct de la commande avec `memberId`, `productId`, `quantity`, `paymentMethod` et `turnstileToken`.

---

## 5. Non-Régression & Contrats d'API

- Aucune modification du schéma de base de données ni du contrat de l'endpoint `POST /boutique` ou `create-order`.
- Les props passées à `ShopCatalog.svelte` (`products`, `members`, `activeSeasonId`) restent strictement identiques.
