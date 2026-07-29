import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';


export const productCategoriesTable = sqliteTable('product_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
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
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const ordersTable = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: integer('season_id').notNull(),
  memberId: integer('member_id').notNull(),
  productId: integer('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull().default(1),
  totalAmountCents: integer('total_amount_cents').notNull(),
  paymentMethodId: integer('payment_method_id').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  paidAt: text('paid_at'),
  ledgerEntryId: integer('ledger_entry_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
