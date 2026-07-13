import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const usersTable = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role', { enum: ['admin', 'ca', 'member'] }).notNull().default('member'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const seasonsTable = sqliteTable('seasons', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const membersTable = sqliteTable('members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  licence: text('licence').notNull(),
  season: text('season').notNull().default('25-26').references(() => seasonsTable.id),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  gender: text('gender', { enum: ['M', 'F'] }).notNull(),
  birthDate: text('birth_date').notNull(),
  email: text('email'),
  phone: text('phone'),
  status: text('status').notNull().default('valide'),
  type: text('type').notNull(),
  importedAt: integer('imported_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  licenceSeasonUnq: uniqueIndex('members_licence_season_idx').on(table.licence, table.season),
}));

export const seasonBalancesTable = sqliteTable('season_balances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  accountId: text('account_id', { enum: ['current', 'savings', 'cash'] }).notNull(),
  initialBalance: integer('initial_balance').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  seasonAccountUnq: uniqueIndex('season_account_idx').on(table.seasonId, table.accountId),
}));

export const transactionsTable = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  type: text('type', { enum: ['recette', 'depense', 'transfert'] }).notNull(),
  accountId: text('account_id', { enum: ['current', 'savings', 'cash'] }).notNull(),
  destinationAccountId: text('destination_account_id', { enum: ['current', 'savings', 'cash'] }),
  category: text('category'),
  amount: integer('amount').notNull(),
  date: text('date').notNull(), // Format YYYY-MM-DD
  paymentMethod: text('payment_method', { 
    enum: ['virement', 'cheque', 'especes', 'labaz', 'ancv', 'pass_sport', 'ticket_loisir', 'up_loisir'] 
  }).notNull(),
  description: text('description').notNull(),
  reference: text('reference'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const bankTransactionsTable = sqliteTable('bank_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fitid: text('fitid').notNull().unique(),
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  accountId: text('account_id', { enum: ['current', 'savings', 'cash'] }).notNull(),
  amount: integer('amount').notNull(),
  date: text('date').notNull(),
  name: text('name').notNull(),
  memo: text('memo'),
  status: text('status', { enum: ['pending', 'reconciled', 'ignored'] }).notNull().default('pending'),
  transactionId: integer('transaction_id').references(() => transactionsTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});



