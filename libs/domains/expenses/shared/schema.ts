import { sqliteTable, text, integer, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { seasonsTable, membersTable } from '@nba/members/schema';
import { categoriesTable, transactionsTable } from '@nba/accounting/schema';

export { seasonsTable, membersTable, categoriesTable, transactionsTable };

export const expensesTable = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: integer('season_id').notNull().references(() => seasonsTable.id),
  description: text('description').notNull(),
  categoryId: integer('category_id').notNull().references(() => categoriesTable.id),
  amountCents: integer('amount_cents').notNull(),
  photoUrl: text('photo_url'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  emitterName: text('emitter_name').notNull(),
  memberId: integer('member_id').references(() => membersTable.id),
  transactionId: integer('transaction_id').references(() => transactionsTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  amountCheck: check('expenses_amount_cents_check', sql`${table.amountCents} > 0`)
}));
