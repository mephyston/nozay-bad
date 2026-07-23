import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

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
  seasonId: text('season_id').notNull(),
  memberId: integer('member_id').notNull(),
  productId: integer('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull().default(1),
  totalAmount: integer('total_amount').notNull(),
  paymentMethod: text('payment_method', { 
    enum: ['virement', 'cheque', 'especes', 'labaz', 'ancv', 'pass_sport', 'ticket_loisir', 'up_loisir'] 
  }).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  transactionId: integer('transaction_id'),
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

export const transactionsTable = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: text('season_id').notNull(),
  type: text('type', { enum: ['recette', 'depense', 'transfert'] }).notNull(),
  accountId: text('account_id').notNull(),
  destinationAccountId: text('destination_account_id'),
  category: integer('category'),
  amount: integer('amount').notNull(),
  date: text('date').notNull(),
  paymentMethod: text('payment_method').notNull(),
  description: text('description').notNull(),
  reference: text('reference'),
  memberId: integer('member_id'),
  bankTransactionId: integer('bank_transaction_id'),
  invoiceId: integer('invoice_id'),
  status: text('status').notNull().default('cleared'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});
