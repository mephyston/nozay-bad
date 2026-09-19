import { sqliteTable, text, integer, index, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';


export const productCategoriesTable = sqliteTable('product_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Unique : rend `INSERT OR IGNORE` du seed de référence réellement idempotent
  // (un rejeu de migration avait dupliqué toutes les catégories, cf. 0008).
  label: text('label').notNull().unique(),
  accountingCategoryId: integer('accounting_category_id').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const productsTable = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  productCategoryId: integer('product_category_id').notNull().references(() => productCategoriesTable.id),
  priceCents: integer('price_cents').notNull(),
  stock: integer('stock').notNull().default(0),
  trackStock: integer('track_stock', { mode: 'boolean' }).notNull().default(false),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  /*
    Une déclinaison est un produit rattaché à un parent et distingué par un libellé
    (« L », « 12 ans »). Elle garde son prix, son stock et son état — c'est elle que la
    commande référence. Le parent porte le nom, la catégorie, la description et l'image ;
    `name` et `product_category_id` lui sont recopiés sur chaque déclinaison, pour que
    tout ce qui lit un produit par son identifiant continue d'y trouver un nom.
  */
  parentId: integer('parent_id').references((): AnySQLiteColumn => productsTable.id),
  variantLabel: text('variant_label'),
  description: text('description'),
  /** Clé de la médiathèque (`media/<empreinte>/<fichier>`), servie par le site public. */
  imageKey: text('image_key'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => [index('products_parent_id_idx').on(table.parentId)]);

export const ordersTable = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: integer('season_id').notNull(),
  // Adhésion (`memberships.id`), et non personne : une commande, une dépense, une écriture
  // ou une inscription appartient à la saison où elle a eu lieu. La colonne garde son nom
  // `member_id` — la renommer aurait imposé deux migrations de plus et la réécriture de
  // cinq tables, pour un gain de vocabulaire.
  memberId: integer('member_id').notNull(),
  productId: integer('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull().default(1),
  totalAmountCents: integer('total_amount_cents').notNull(),
  paymentMethodId: integer('payment_method_id').notNull(),
  // created → awaiting_payment → paid. `rejected` ferme une demande non validée,
  // `cancelled` une commande validée que le règlement n'a jamais suivie.
  status: text('status', {
    enum: ['created', 'awaiting_payment', 'paid', 'rejected', 'cancelled']
  }).notNull().default('created'),
  /** Date de mise en attente de règlement : point de départ des relances. */
  awaitingPaymentSince: text('awaiting_payment_since'),
  paidAt: text('paid_at'),
  ledgerEntryId: integer('ledger_entry_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
