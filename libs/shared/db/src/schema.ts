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
  closed: integer('closed', { mode: 'boolean' }).notNull().default(false),
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
  importedAt: integer('imported_at', { mode: 'timestamp' }).notNull(),
  amountDue: integer('amount_due').notNull().default(0),
  amountReceived: integer('amount_received').notNull().default(0),
  amountRemaining: integer('amount_remaining').notNull().default(0),
  paid: integer('paid', { mode: 'boolean' }).notNull().default(false),
  parent1Name: text('parent1_name'),
  parent1Email: text('parent1_email'),
  parent1Phone: text('parent1_phone'),
  parent2Name: text('parent2_name'),
  parent2Email: text('parent2_email'),
  parent2Phone: text('parent2_phone')
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

export const productsTable = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category', { enum: ['shuttlecock', 'string', 'other'] }).notNull(),
  price: integer('price').notNull(),
  stock: integer('stock').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const ordersTable = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  memberId: integer('member_id').notNull().references(() => membersTable.id),
  productId: integer('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull().default(1),
  totalAmount: integer('total_amount').notNull(),
  paymentMethod: text('payment_method', { 
    enum: ['virement', 'cheque', 'especes', 'labaz', 'ancv', 'pass_sport', 'ticket_loisir', 'up_loisir'] 
  }).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  transactionId: integer('transaction_id').references(() => transactionsTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const expensesTable = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: text('season_id').notNull().references(() => seasonsTable.id),
  description: text('description').notNull(),
  category: integer('category').notNull(),
  amount: integer('amount').notNull(),
  photoUrl: text('photo_url'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  emitterName: text('emitter_name').notNull(),
  memberId: integer('member_id').references(() => membersTable.id),
  transactionId: integer('transaction_id').references(() => transactionsTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});

export const categoriesTable = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  adminLabel: text('admin_label').notNull(),
  adherentLabel: text('adherent_label').notNull(),
  hideInExpenses: integer('hide_in_expenses', { mode: 'boolean' }).notNull().default(false),
  codeRecette: text('code_recette'),
  codeDepense: text('code_depense'),
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





