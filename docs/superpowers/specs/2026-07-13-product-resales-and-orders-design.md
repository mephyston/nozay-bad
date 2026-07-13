# Spécifications Techniques : Revente de Produits et Commandes Boutique

## Objectif
Permettre la gestion de la revente de produits (volants et cordages) depuis la console d'administration, et permettre aux adhérents de soumettre des souhaits d'achat depuis l'application boutique. Ces souhaits, une fois validés par le trésorier, génèrent automatiquement des écritures comptables sur le Compte Courant de l'association.

## 1. Modélisation de la Base de Données (SQLite via Drizzle)

Nous introduisons deux nouvelles tables dans `libs/shared/db/src/schema.ts` :

```typescript
export const productsTable = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category', { enum: ['shuttlecock', 'string'] }).notNull(),
  price: integer('price').notNull(), // En centimes d'euros
  stock: integer('stock').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const ordersTable = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  memberId: integer('member_id').notNull().references(() => membersTable.id),
  productId: integer('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull().default(1),
  totalAmount: integer('total_amount').notNull(), // En centimes (quantity * price)
  paymentMethod: text('payment_method', { 
    enum: ['virement', 'cheque', 'especes', 'labaz', 'ancv', 'pass_sport', 'ticket_loisir', 'up_loisir'] 
  }).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  transactionId: integer('transaction_id').references(() => transactionsTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
```

---

## 2. API Endpoints (Hono Worker)

Les routes suivantes seront ajoutées dans `apps/api/src/index.ts` :

### Produits (`/products`)
* **`GET /products`** : Retourne la liste des produits.
  * Query params optionnels: `category` (`shuttlecock` ou `string`), `active` (boolean).
* **`POST /products`** : Crée un nouveau produit.
* **`PUT /products/:id`** : Met à jour un produit.

### Commandes (`/orders`)
* **`GET /orders`** : Liste les commandes avec jointures adhérent et produit.
  * Query params optionnels: `season`, `status` (`pending`, `approved`, `rejected`).
* **`POST /orders`** : Crée un souhait d'achat (depuis la boutique).
  * Validation: vérifie que le stock est `>=` quantité.
* **`POST /orders/:id/approve`** : Validation par le trésorier.
  * Décrémente le stock du produit.
  * Crée une écriture de type `recette` sur le Compte Courant (`current`), sous la catégorie `boutique`, avec le mode de paiement déclaré.
  * Met à jour le statut de la commande à `approved`.
* **`POST /orders/:id/reject`** : Rejet par le trésorier.
  * Met à jour le statut de la commande à `rejected`.

---

## 3. Interfaces Utilisateur

### Console d'Administration (`apps/admin-console`)
* **`/admin/shop/shuttlecocks`** : Gestion des volants (CRUD produit).
* **`/admin/shop/strings`** : Gestion des cordages (CRUD produit).
* **`/admin/shop/orders`** : Validation et historique des commandes (onglets *En attente* et *Historique*).

### Boutique Adhérent (`apps/boutique`)
* **`/`** : Page de commande avec :
  * Combobox de sélection de l'adhérent (recherche).
  * Grille d'articles avec sélecteur de quantité et indication de stock.
  * Sélection du mode de paiement prévu.
  * Soumission asynchrone avec retour visuel immédiat.

---

## 4. Tests d'Acceptation (Gherkin)

### Scénario 1 : Soumission et approbation d'une commande
* **Étant donné** que le produit "Volant RSL" a un stock de `10` et un prix de `15.00 €`
* **Et** que l'adhérent "Jean Dupont" est inscrit
* **Quand** Jean Dupont soumet un souhait d'achat de `2` "Volant RSL" payés par `virement`
* **Alors** une commande est créée à l'état `pending` d'un montant de `30.00 €`
* **Quand** le trésorier approuve la commande
* **Alors** le stock du produit "Volant RSL" passe à `8`
* **Et** une transaction de type `recette` d'un montant de `30.00 €` est insérée sur le Compte Courant avec la catégorie `boutique`
* **Et** le statut de la commande passe à `approved`
