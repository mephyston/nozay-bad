import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { membersTable, seasonsTable } from '@metacult/features-members-data-access';


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
  category: integer('category'),
  amount: integer('amount').notNull(),
  date: text('date').notNull(), // Format YYYY-MM-DD
  paymentMethod: text('payment_method', { 
    enum: ['virement', 'cheque', 'especes', 'labaz', 'ancv', 'pass_sport', 'ticket_loisir', 'up_loisir'] 
  }).notNull(),
  description: text('description').notNull(),
  reference: text('reference'),
  memberId: integer('member_id').references(() => membersTable.id),
  bankTransactionId: integer('bank_transaction_id').references(() => bankTransactionsTable.id),
  invoiceId: integer('invoice_id').references(() => invoicesTable.id),
  status: text('status', { enum: ['pending_debit', 'in_vault', 'cleared'] }).notNull().default('cleared'),
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
  aiSuggestions: text('ai_suggestions'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const checkDepositsTable = sqliteTable('check_deposits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  reference: text('reference').notNull().unique(),
  date: text('date').notNull(),
  amount: integer('amount').notNull(),
  status: text('status', { enum: ['pending', 'deposited', 'cleared'] }).notNull().default('pending'),
  bankTransactionId: integer('bank_transaction_id').references(() => bankTransactionsTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const checksTable = sqliteTable('checks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  checkDepositId: integer('check_deposit_id').references(() => checkDepositsTable.id),
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  number: text('number').notNull(),
  amount: integer('amount').notNull(),
  emitter: text('emitter').notNull(),
  bank: text('bank'),
  memberId: integer('member_id').references(() => membersTable.id),
  transactionId: integer('transaction_id').references(() => transactionsTable.id),
  status: text('status', { enum: ['received', 'deposited'] }).notNull().default('received'),
  photoUrl: text('photo_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const categoriesTable = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  adminLabel: text('admin_label').notNull(),
  adherentLabel: text('adherent_label').notNull(),
  hideInExpenses: integer('hide_in_expenses', { mode: 'boolean' }).notNull().default(false),
  receiptCode: text('receipt_code'),
  expenseCode: text('expense_code'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const accountClassesTable = sqliteTable('account_classes', {
  code: text('code').primaryKey(), // e.g. '60', '70'
  label: text('label').notNull(),  // e.g. '60 - Achats'
  type: text('type', { enum: ['recette', 'depense'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const seasonCategoryBudgetsTable = sqliteTable('season_category_budgets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  categoryId: integer('category_id').notNull().references(() => categoriesTable.id),
  type: text('type', { enum: ['recette', 'depense'] }).notNull(),
  amount: integer('amount').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const invoicesTable = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceNumber: text('invoice_number').notNull().unique(), // FAC-2526-NBA91-0001
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  date: text('date').notNull(), // YYYY-MM-DD
  dueDate: text('due_date').notNull(), // YYYY-MM-DD
  clientName: text('client_name').notNull(),
  clientAddress: text('client_address'),
  clientEmail: text('client_email'),
  subject: text('subject'),      // Objet de la facture
  location: text('location'),    // Lieu de l'activité
  period: text('period'),        // Dates / Période concernée
  attendees: text('attendees'),  // Personnes concernées
  status: text('status', { enum: ['draft', 'sent', 'paid', 'cancelled'] }).notNull().default('draft'),
  totalAmount: integer('total_amount').notNull(),
  bankTransactionId: integer('bank_transaction_id').references(() => bankTransactionsTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const invoiceItemsTable = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => invoicesTable.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(),
  totalPrice: integer('total_price').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
