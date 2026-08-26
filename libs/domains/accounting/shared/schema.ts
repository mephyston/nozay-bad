import { sqliteTable, text, integer, uniqueIndex, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const seasonsTable = sqliteTable('seasons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
});


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
  // Unique : rend `INSERT OR IGNORE` du seed de référence réellement idempotent
  // (un rejeu de migration avait dupliqué toutes les catégories, cf. 0008).
  adminLabel: text('admin_label').notNull().unique(),
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

/*
 * Le solde que la banque, elle, annonce — la seule chose qu'une écriture ne peut pas
 * bouger.
 *
 * `bank_statement_lines` porte les mouvements du relevé ; il y manquait le `<LEDGERBAL>`
 * du fichier OFX, c'est-à-dire le solde arrêté par la banque à une date. Sans lui on
 * pouvait pointer les opérations une à une, mais jamais boucler un état de rapprochement :
 * il n'y avait aucun nombre extérieur auquel confronter le solde des livres.
 *
 * Une ligne par compte et par arrêté (`account_id`, `date`) : réimporter deux fois le même
 * relevé écrase la ligne au lieu d'en empiler une seconde.
 */
export const bankStatementBalancesTable = sqliteTable('bank_statement_balances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accountsTable.id),
  date: text('date').notNull(),
  balanceCents: integer('balance_cents').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  accountDateIdx: uniqueIndex('bank_statement_balance_account_date_idx').on(table.accountId, table.date),
}));

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

/**
 * Un virement interne : de l'argent qui passe d'un compte du club à un autre.
 *
 * Il ne s'agit **pas** d'une écriture, mais de ce qui relie les deux qu'il produit. Le modèle
 * précédent tenait en une seule ligne portant ses deux comptes ; c'était juste comptablement, mais
 * `ledger_entries.bank_statement_line_id` est scalaire alors qu'un virement courant↔livret produit
 * deux lignes de relevé. Une écriture ne pouvait en pointer qu'une, et le rapprochement ne bouclait
 * jamais sur le second compte.
 *
 * `reference` est en UNIQUE parce qu'elle sert de **clé naturelle** au batch D1 :
 * `last_insert_rowid()` ne vaut que pour un seul enfant, et un virement en a deux.
 */
export const internalTransfersTable = sqliteTable('internal_transfers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: integer('season_id').notNull().references(() => seasonsTable.id),
  reference: text('reference').notNull().unique(),
  amountCents: integer('amount_cents').notNull(),
  description: text('description').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  amountCheck: check('internal_transfers_amount_cents_check', sql`${table.amountCents} > 0`)
}));

export const ledgerEntriesTable = sqliteTable('ledger_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: integer('season_id').notNull().references(() => seasonsTable.id),
  type: text('type', { enum: ['recette', 'depense', 'transfert'] }).notNull(),
  accountId: integer('account_id').notNull().references(() => accountsTable.id),
  /*
   * Les deux jambes d'un virement interne. `transferLeg` dit de quel côté se tient l'écriture :
   * `source` retire l'argent de `accountId`, `destination` l'y verse. Chaque jambe porte donc sa
   * propre date de valeur, son propre statut et son propre pointage bancaire — c'est tout l'objet
   * du modèle à deux jambes, et ce que l'ancienne colonne `destination_account_id` interdisait.
   */
  transferId: integer('transfer_id').references(() => internalTransfersTable.id),
  transferLeg: text('transfer_leg', { enum: ['source', 'destination'] }),
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
  // Adhésion (`memberships.id`), et non personne : une commande, une dépense, une écriture
  // ou une inscription appartient à la saison où elle a eu lieu. La colonne garde son nom
  // `member_id` — la renommer aurait imposé deux migrations de plus et la réécriture de
  // cinq tables, pour un gain de vocabulaire.
  memberId: integer('member_id'),
  bankStatementLineId: integer('bank_statement_line_id').references(() => bankStatementLinesTable.id),
  invoiceId: integer('invoice_id').references(() => invoicesTable.id),
  status: text('status', { enum: ['pending_debit', 'in_vault', 'cleared'] }).notNull().default('cleared'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  amountCheck: check('ledger_entries_amount_cents_check', sql`${table.amountCents} > 0`),
  /*
   * Une écriture de virement est une jambe, et rien d'autre : elle appartient à un virement, se
   * situe d'un côté, et ne porte jamais de catégorie — un virement ne change pas le résultat.
   */
  transfertCheck: check(
    'ledger_entries_transfert_check',
    sql`(${table.type} = 'transfert' AND ${table.transferId} IS NOT NULL AND ${table.transferLeg} IN ('source', 'destination') AND ${table.categoryId} IS NULL) OR (${table.type} <> 'transfert' AND ${table.transferId} IS NULL AND ${table.transferLeg} IS NULL)`
  ),
  /*
   * « Au plus une jambe de chaque sens par virement ». Que la paire soit **complète** et de
   * montants égaux ne se contraint pas en SQLite : c'est gardé en applicatif et vérifié par
   * `scripts/check-schema-integrity.js`.
   */
  transferLegIdx: uniqueIndex('internal_transfer_leg_idx').on(table.transferId, table.transferLeg)
}));

export const checksTable = sqliteTable('checks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  checkDepositId: integer('check_deposit_id').references(() => checkDepositsTable.id),
  seasonId: integer('season_id').notNull().references(() => seasonsTable.id),
  number: text('number').notNull(),
  amountCents: integer('amount_cents').notNull(),
  emitter: text('emitter').notNull(),
  bank: text('bank'),
  memberId: integer('member_id'),
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
