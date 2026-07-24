import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { seasonsTable, membersTable } from '../../members/shared/schema';
import { paymentMethodsTable, transactionsTable } from '../../accounting/shared/schema';

export { seasonsTable, membersTable, paymentMethodsTable, transactionsTable };

export const productsTable = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category', { enum: ['shuttlecock', 'string', 'other'] }).notNull(),
  priceCents: integer('price_cents').notNull(),
  stock: integer('stock').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const ordersTable = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: integer('season_id').notNull().references(() => seasonsTable.id),
  memberId: integer('member_id').notNull().references(() => membersTable.id),
  productId: integer('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull().default(1),
  totalAmountCents: integer('total_amount_cents').notNull(),
  paymentMethodId: integer('payment_method_id').notNull().references(() => paymentMethodsTable.id),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  transactionId: integer('transaction_id').references(() => transactionsTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
