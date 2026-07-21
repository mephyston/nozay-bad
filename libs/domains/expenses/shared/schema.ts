import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const expensesTable = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: text('season_id').notNull(),
  description: text('description').notNull(),
  category: integer('category').notNull(),
  amount: integer('amount').notNull(),
  photoUrl: text('photo_url'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  emitterName: text('emitter_name').notNull(),
  memberId: integer('member_id'),
  transactionId: integer('transaction_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
