# Plan d'Implémentation : Revente de Produits et Commandes Boutique

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place la gestion du stock et des ventes de produits (volants/cordages) avec validation comptable automatique lors de l'approbation du trésorier.

**Architecture:** Approche Vertical Slice (VSA). Ajout des tables SQLite `products` et `orders` dans la base D1 partagée, implémentation des contrôleurs Hono et des tests d'intégration Vitest dans le Worker API, et création des interfaces d'administration et de commande Svelte 5 dans les applications Astro.

**Tech Stack:** Astro, Svelte 5, Drizzle ORM, SQLite (D1), Hono API, Vitest.

## Global Constraints
- Utiliser les versions récentes d'Astro, Svelte (v5), Tailwind CSS (v4).
- Les tests unitaires et d'intégration doivent utiliser Vitest.
- Le code TypeScript doit compiler sans erreurs strictes.

---

### Task 1: Schéma et Migrations Base de Données

**Files:**
- Modify: `libs/shared/db/src/schema.ts`
- Modify: `libs/shared/db/src/db.test.ts`

**Interfaces:**
- Produces: `productsTable` et `ordersTable` pour Drizzle ORM.

- [ ] **Step 1: Mettre à jour `libs/shared/db/src/schema.ts`**
  Ajouter à la fin du fichier :
  ```typescript
  export const productsTable = sqliteTable('products', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    category: text('category', { enum: ['shuttlecock', 'string'] }).notNull(),
    price: integer('price').notNull(),
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
    totalAmount: integer('total_amount').notNull(),
    paymentMethod: text('payment_method', { 
      enum: ['virement', 'cheque', 'especes', 'labaz', 'ancv', 'pass_sport', 'ticket_loisir', 'up_loisir'] 
    }).notNull(),
    status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
    ledgerEntryId: integer('ledger_entry_id').references(() => ledgerEntriesTable.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  });
  ```

- [ ] **Step 2: Ajouter des assertions dans `libs/shared/db/src/db.test.ts`**
  Ajouter un bloc de test pour valider l'insertion dans ces tables :
  ```typescript
  it('should insert and query products and orders', async () => {
    const db = getDb();
    const product = await db.insert(productsTable).values({
      name: 'RSL Grade 1',
      category: 'shuttlecock',
      price: 1500,
      stock: 10,
      active: true,
      createdAt: new Date()
    }).returning().get();

    expect(product.id).toBeDefined();
    expect(product.name).toBe('RSL Grade 1');
  });
  ```

- [ ] **Step 3: Générer et appliquer la migration**
  Run: `npx drizzle-kit generate:sqlite --schema=libs/shared/db/src/schema.ts --out=libs/shared/db/migrations`
  Expected: Un fichier SQL de migration généré.
  Run: `npx vitest run libs/shared/db/src/db.test.ts`
  Expected: Tests OK.

- [ ] **Step 4: Commiter**
  Run: `git add libs/shared/db/src/schema.ts libs/shared/db/src/db.test.ts && git commit -m "db: add products and orders schemas and database tests"`

---

### Task 2: Endpoints API Produits (Hono)

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/index.test.ts`

**Interfaces:**
- Produces: Endpoints `/products` (GET, POST, PUT)

- [ ] **Step 1: Ajouter les routes CRUD produits dans `apps/api/src/index.ts`**
  ```typescript
  app.get('/products', async (c) => {
    const category = c.req.query('category');
    const activeStr = c.req.query('active');
    const db = getDb(c.env.DB);
    let conditions = [];
    if (category) conditions.push(eq(productsTable.category, category as any));
    if (activeStr) conditions.push(eq(productsTable.active, activeStr === 'true'));

    const products = await db.select().from(productsTable).where(and(...conditions));
    return c.json({ success: true, data: products });
  });

  app.post('/products', async (c) => {
    const body = await c.req.json();
    const db = getDb(c.env.DB);
    const prod = await db.insert(productsTable).values({
      name: body.name,
      category: body.category,
      price: body.price,
      stock: body.stock,
      active: body.active !== false,
      createdAt: new Date()
    }).returning().get();
    return c.json({ success: true, data: prod });
  });

  app.put('/products/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const db = getDb(c.env.DB);
    const prod = await db.update(productsTable).set({
      name: body.name,
      price: body.price,
      stock: body.stock,
      active: body.active
    }).where(eq(productsTable.id, id)).returning().get();
    return c.json({ success: true, data: prod });
  });
  ```

- [ ] **Step 2: Écrire les tests d'intégration dans `apps/api/src/index.test.ts`**
  ```typescript
  it('supports product CRUD operations', async () => {
    const res = await app.fetch(new Request('http://localhost/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Yonex BG65', category: 'string', price: 1200, stock: 5 })
    }), mockEnv);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.name).toBe('Yonex BG65');
  });
  ```

- [ ] **Step 3: Lancer les tests et commiter**
  Run: `npx vitest run apps/api/src/index.test.ts`
  Expected: PASS
  Run: `git add apps/api/src/index.ts apps/api/src/index.test.ts && git commit -m "feat(api): add products CRUD API endpoints with integration tests"`

---

### Task 3: Endpoints API Commandes (Hono)

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/index.test.ts`

**Interfaces:**
- Produces: Endpoints `/orders` (GET, POST, approve, reject)

- [ ] **Step 1: Ajouter les routes commandes dans `apps/api/src/index.ts`**
  ```typescript
  app.get('/orders', async (c) => {
    const season = c.req.query('season');
    const status = c.req.query('status');
    const db = getDb(c.env.DB);
    let conditions = [];
    if (season) conditions.push(eq(ordersTable.seasonId, season));
    if (status) conditions.push(eq(ordersTable.status, status as any));

    const orders = await db.select({
      order: ordersTable,
      member: membersTable,
      product: productsTable
    }).from(ordersTable)
      .innerJoin(membersTable, eq(ordersTable.memberId, membersTable.id))
      .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
      .where(and(...conditions));

    return c.json({ success: true, data: orders });
  });

  app.post('/orders', async (c) => {
    const body = await c.req.json();
    const db = getDb(c.env.DB);

    const product = await db.select().from(productsTable).where(eq(productsTable.id, body.productId)).get();
    if (!product || product.stock < body.quantity) {
      return c.json({ success: false, error: 'Stock insuffisant ou produit inexistant' }, 400);
    }

    const order = await db.insert(ordersTable).values({
      seasonId: body.seasonId,
      memberId: body.memberId,
      productId: body.productId,
      quantity: body.quantity,
      totalAmount: product.price * body.quantity,
      paymentMethod: body.paymentMethod,
      status: 'pending',
      createdAt: new Date()
    }).returning().get();

    return c.json({ success: true, data: order });
  });

  app.post('/orders/:id/approve', async (c) => {
    const id = parseInt(c.req.param('id'));
    const db = getDb(c.env.DB);

    const orderResult = await db.select({
      order: ordersTable,
      product: productsTable,
      member: membersTable
    }).from(ordersTable)
      .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
      .innerJoin(membersTable, eq(ordersTable.memberId, membersTable.id))
      .where(eq(ordersTable.id, id))
      .get();

    if (!orderResult || orderResult.order.status !== 'pending') {
      return c.json({ success: false, error: 'Commande invalide ou déjà traitée' }, 400);
    }

    const { order, product, member } = orderResult;
    if (product.stock < order.quantity) {
      return c.json({ success: false, error: 'Stock insuffisant pour valider la commande' }, 400);
    }

    // Décrémenter le stock et créer l'écriture de recette
    await db.update(productsTable)
      .set({ stock: product.stock - order.quantity })
      .where(eq(productsTable.id, product.id));

    const tx = await db.insert(ledgerEntriesTable).values({
      seasonId: order.seasonId,
      type: 'recette',
      accountId: 'current',
      category: 'boutique',
      amount: order.totalAmount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: order.paymentMethod as any,
      description: `Achat boutique - ${member.lastName} ${member.firstName} - ${product.name} x${order.quantity}`,
      memberId: member.id,
      createdAt: new Date()
    }).returning().get();

    const updatedOrder = await db.update(ordersTable)
      .set({ status: 'approved', ledgerEntryId: tx.id })
      .where(eq(ordersTable.id, id))
      .returning().get();

    return c.json({ success: true, data: updatedOrder });
  });

  app.post('/orders/:id/reject', async (c) => {
    const id = parseInt(c.req.param('id'));
    const db = getDb(c.env.DB);
    const updatedOrder = await db.update(ordersTable)
      .set({ status: 'rejected' })
      .where(eq(ordersTable.id, id))
      .returning().get();

    return c.json({ success: true, data: updatedOrder });
  });
  ```

- [ ] **Step 2: Ajouter les tests de validation de commande dans `apps/api/src/index.test.ts`**
  ```typescript
  it('processes orders and creates transaction on approval', async () => {
    // 1. Post order
    const res = await app.fetch(new Request('http://localhost/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: '25-26', memberId: 1, productId: 1, quantity: 2, paymentMethod: 'virement' })
    }), mockEnv);
    expect(res.status).toBe(200);

    // 2. Approve
    const appRes = await app.fetch(new Request('http://localhost/orders/1/approve', {
      method: 'POST'
    }), mockEnv);
    expect(appRes.status).toBe(200);
    const json = await appRes.json() as any;
    expect(json.data.status).toBe('approved');
    expect(json.data.ledgerEntryId).toBeDefined();
  });
  ```

- [ ] **Step 3: Lancer les tests et commiter**
  Run: `npx vitest run apps/api/src/index.test.ts`
  Expected: PASS
  Run: `git add apps/api/src/index.ts apps/api/src/index.test.ts && git commit -m "feat(api): add orders creation and approval flow with automatic transaction registration"`

---

### Task 4: Console d'Administration - Gestion des Articles Svelte UI

**Files:**
- Create: `apps/admin-console/src/components/ProductsManager.svelte`
- Create: `apps/admin-console/src/components/ProductsManager.test.ts`
- Create: `apps/admin-console/src/pages/admin/shop/shuttlecocks.astro`
- Create: `apps/admin-console/src/pages/admin/shop/strings.astro`

- [ ] **Step 1: Créer `ProductsManager.svelte`**
  Composant de gestion des stocks/prix (CRUD).
  ```html
  <script lang="ts">
    import { Plus, Edit, Trash2, Check } from "lucide-svelte";
    // ... implémenter tableau d'affichage et formulaire d'ajout/édition
  </script>
  ```

- [ ] **Step 2: Créer les pages Astro volants et cordages**
  `shuttlecocks.astro` et `strings.astro` chargent le `ProductsManager` avec la catégorie configurée.

- [ ] **Step 3: Écrire les tests unitaires et valider**
  Run: `npx vitest run apps/admin-console/src/components/ProductsManager.test.ts`
  Expected: PASS
  Run: `git add apps/admin-console/src/components/ProductsManager* apps/admin-console/src/pages/admin/shop/* && git commit -m "feat(console): implement Svelte 5 shuttlecock and string products management interfaces"`

---

### Task 5: Console d'Administration - Validation des Commandes Svelte UI

**Files:**
- Create: `apps/admin-console/src/components/OrdersManager.svelte`
- Create: `apps/admin-console/src/components/OrdersManager.test.ts`
- Create: `apps/admin-console/src/pages/admin/shop/orders.astro`

- [ ] **Step 1: Créer `OrdersManager.svelte`**
  Gère les demandes `'pending'` (boutons Valider / Refuser) et affiche l'historique `'approved'` / `'rejected'`.

- [ ] **Step 2: Créer la page Astro de validation**
  `/admin/shop/orders` charge `OrdersManager` avec la liste des commandes et des saisons.

- [ ] **Step 3: Écrire les tests unitaires et valider**
  Run: `npx vitest run apps/admin-console/src/components/OrdersManager.test.ts`
  Expected: PASS
  Run: `git add apps/admin-console/src/components/OrdersManager* apps/admin-console/src/pages/admin/shop/orders.astro && git commit -m "feat(console): implement order validation dashboard for the treasurer"`

---

### Task 6: Application Boutique Adhérents

**Files:**
- Create: `apps/boutique/src/components/ShopCatalog.svelte`
- Create: `apps/boutique/src/components/ShopCatalog.test.ts`
- Modify: `apps/boutique/src/pages/index.astro`

- [ ] **Step 1: Créer `ShopCatalog.svelte`**
  Formulaire de déclaration d'achat adhérent avec sélection recherchable du nom de l'adhérent (combobox), catalogue de produits actifs, choix de la quantité et mode de paiement.

- [ ] **Step 2: Modifier `apps/boutique/src/pages/index.astro`**
  Charger `ShopCatalog` et lier la base D1 de l'API.

- [ ] **Step 3: Écrire les tests unitaires de la boutique**
  Run: `npx vitest run apps/boutique/src/components/ShopCatalog.test.ts`
  Expected: PASS
  Run: `git add apps/boutique/src/components/ShopCatalog* apps/boutique/src/pages/index.astro && git commit -m "feat(boutique): implement client shop catalog and purchase wish submission flow"`
