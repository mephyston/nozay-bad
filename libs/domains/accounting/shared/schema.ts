import { sqliteTable, text, integer, uniqueIndex, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { seasonsTable, membersTable } from '@nba/members/schema';

export { seasonsTable, membersTable };

export const accountClassesTable = sqliteTable('account_classes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  type: text('type', { enum: ['recette', 'depense', 'tresorerie'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const accountsTable = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  accountClassId: integer('account_class_id').notNull().references(() => accountClassesTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const paymentMethodsTable = sqliteTable('payment_methods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  label: text('label').notNull(),
  defaultAccountId: integer('default_account_id').notNull().references(() => accountsTable.id),
  defaultEntryStatus: text('default_entry_status', { enum: ['cleared', 'in_vault', 'pending_debit'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const categoriesTable = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  adminLabel: text('admin_label').notNull(),
  adherentLabel: text('adherent_label').notNull(),
  hideInExpenses: integer('hide_in_expenses', { mode: 'boolean' }).notNull().default(false),
  receiptAccountClassId: integer('receipt_account_class_id').references(() => accountClassesTable.id),
  expenseAccountClassId: integer('expense_account_class_id').references(() => accountClassesTable.id),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const seasonBalancesTable = sqliteTable('season_balances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: integer('season_id').notNull().references(() => seasonsTable.id),
  accountId: integer('account_id').notNull().references(() => accountsTable.id),
  initialBalanceCents: integer('initial_balance_cents').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  seasonAccountIdx: uniqueIndex('season_account_idx').on(table.seasonId, table.accountId),
}));

export const bankStatementLinesTable = sqliteTable('bank_statement_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fitid: text('fitid').notNull().unique(),
  accountId: integer('account_id').notNull().references(() => accountsTable.id),
  amountCents: integer('amount_cents').notNull(),
  date: text('date').notNull(),
  name: text('name').notNull(),
  memo: text('memo'),
  status: text('status', { enum: ['pending', 'reconciled', 'ignored'] }).notNull().default('pending'),
  aiSuggestions: text('ai_suggestions'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const checkDepositsTable = sqliteTable('check_deposits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: integer('season_id').notNull().references(() => seasonsTable.id),
  reference: text('reference').notNull().unique(),
  date: text('date').notNull(),
  amountCents: integer('amount_cents').notNull(),
  status: text('status', { enum: ['pending', 'deposited', 'cleared'] }).notNull().default('pending'),
  bankStatementLineId: integer('bank_statement_line_id').references(() => bankStatementLinesTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const invoicesTable = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceNumber: text('invoice_number').notNull().unique(),
  seasonId: integer('season_id').notNull().references(() => seasonsTable.id),
  date: text('date').notNull(),
  dueDate: text('due_date').notNull(),
  clientName: text('client_name').notNull(),
  clientAddress: text('client_address'),
  clientEmail: text('client_email'),
  subject: text('subject'),
  location: text('location'),
  period: text('period'),
  attendees: text('attendees'),
  status: text('status', { enum: ['draft', 'sent', 'paid', 'cancelled'] }).notNull().default('draft'),
  totalAmountCents: integer('total_amount_cents').notNull(),
  bankStatementLineId: integer('bank_statement_line_id').references(() => bankStatementLinesTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const invoiceItemsTable = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => invoicesTable.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPriceCents: integer('unit_price_cents').notNull(),
  totalPriceCents: integer('total_price_cents').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const ledgerEntriesTable = sqliteTable('ledger_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: integer('season_id').notNull().references(() => seasonsTable.id),
  type: text('type', { enum: ['recette', 'depense', 'transfert'] }).notNull(),
  accountId: integer('account_id').notNull().references(() => accountsTable.id),
  destinationAccountId: integer('destination_account_id').references(() => accountsTable.id),
  categoryId: integer('category_id').references(() => categoriesTable.id),
  amountCents: integer('amount_cents').notNull(),
  date: text('date').notNull(),
  paymentMethodId: integer('payment_method_id').notNull().references(() => paymentMethodsTable.id),
  description: text('description').notNull(),
  reference: text('reference'),
  accrualType: text('accrual_type', {
    enum: ['normal', 'produit_constate_avance', 'charge_constatee_avance', 'charge_a_payer', 'produit_a_recevoir']
  }).notNull().default('normal'),
  accrualNote: text('accrual_note'),
  memberId: integer('member_id').references(() => membersTable.id),
  bankStatementLineId: integer('bank_statement_line_id').references(() => bankStatementLinesTable.id),
  invoiceId: integer('invoice_id').references(() => invoicesTable.id),
  status: text('status', { enum: ['pending_debit', 'in_vault', 'cleared'] }).notNull().default('cleared'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  amountCheck: check('ledger_entries_amount_cents_check', sql`${table.amountCents} > 0`),
  transfertCheck: check(
    'ledger_entries_transfert_check',
    sql`(${table.type} = 'transfert' AND ${table.destinationAccountId} IS NOT NULL AND ${table.destinationAccountId} <> ${table.accountId} AND ${table.categoryId} IS NULL) OR (${table.type} <> 'transfert' AND ${table.destinationAccountId} IS NULL)`
  )
}));

export const checksTable = sqliteTable('checks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  checkDepositId: integer('check_deposit_id').references(() => checkDepositsTable.id),
  seasonId: integer('season_id').notNull().references(() => seasonsTable.id),
  number: text('number').notNull(),
  amountCents: integer('amount_cents').notNull(),
  emitter: text('emitter').notNull(),
  bank: text('bank'),
  memberId: integer('member_id').references(() => membersTable.id),
  ledgerEntryId: integer('ledger_entry_id').references(() => ledgerEntriesTable.id),
  status: text('status', { enum: ['received', 'deposited'] }).notNull().default('received'),
  photoUrl: text('photo_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const seasonCategoryBudgetsTable = sqliteTable('season_category_budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: integer('season_id').notNull().references(() => seasonsTable.id),
  categoryId: integer('category_id').notNull().references(() => categoriesTable.id),
  type: text('type', { enum: ['recette', 'depense'] }).notNull(),
  amountCents: integer('amount_cents').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  seasonCategoryIdx: uniqueIndex('season_category_idx').on(table.seasonId, table.categoryId, table.type),
}));
