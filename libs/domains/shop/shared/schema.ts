import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';


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
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

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
