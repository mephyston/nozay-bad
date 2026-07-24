import { sqliteTable, text, integer, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { seasonsTable, membersTable } from '@nba/members/schema';
import { categoriesTable, ledgerEntriesTable } from '@nba/accounting/schema';

export { seasonsTable, membersTable, categoriesTable, ledgerEntriesTable };

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
  ledgerEntryId: integer('ledger_entry_id').references(() => ledgerEntriesTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  amountCheck: check('expenses_amount_cents_check', sql`${table.amountCents} > 0`)
}));
