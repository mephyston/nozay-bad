import { sqliteTable, text, integer, check, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';


export const expensesTable = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  seasonId: integer('season_id').notNull(),
  description: text('description').notNull(),
  categoryId: integer('category_id').notNull(),
  amountCents: integer('amount_cents').notNull(),
  /**
   * L'ancien justificatif unique, recopié dans `expense_attachments` par la migration
   * 0045. Il reçoit encore une copie de la première pièce à chaque écriture, le temps
   * qu'un retour arrière reste possible (expand/contract) : l'ancien code ne lit que lui.
   * Plus rien ne le lit.
   */
  photoUrl: text('photo_url'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  emitterName: text('emitter_name').notNull(),
  // Adhésion (`memberships.id`), et non personne : une commande, une dépense, une écriture
  // ou une inscription appartient à la saison où elle a eu lieu. La colonne garde son nom
  // `member_id` — la renommer aurait imposé deux migrations de plus et la réécriture de
  // cinq tables, pour un gain de vocabulaire.
  memberId: integer('member_id'),
  ledgerEntryId: integer('ledger_entry_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  amountCheck: check('expenses_amount_cents_check', sql`${table.amountCents} > 0`)
}));

/**
 * Les pièces jointes d'une note (cinq au plus) : une ligne par pièce, et non une liste
 * dans la note. Une pièce pèse jusqu'à ~1,1 Mo en base64 et D1 plafonne une ligne à
 * 2 Mo : deux pièces dans la même ligne ne passaient déjà plus.
 *
 * `media_type` est tiré de l'adresse `data:` à l'écriture, pour que la liste dise
 * « photo » ou « PDF » sans lire le contenu.
 */
export const expenseAttachmentsTable = sqliteTable('expense_attachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  expenseId: integer('expense_id').notNull().references(() => expensesTable.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  mediaType: text('media_type').notNull(),
  dataUrl: text('data_url').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => ({
  expenseIdx: index('expense_attachments_expense_id_idx').on(table.expenseId, table.position)
}));
