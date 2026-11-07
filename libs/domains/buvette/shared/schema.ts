import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** Ce que vend la buvette. Distinct de la boutique, qui suit un parcours de commande. */
export const buvetteItemsTable = sqliteTable('buvette_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull(),
  /** Catégorie comptable (`categories.id`), résolue à la clôture de caisse. */
  accountingCategoryId: integer('accounting_category_id').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => [
  check('buvette_items_price_check', sql`${table.priceCents} >= 0`)
]);

/** Réglages du club, sur une seule ligne. */
export const buvetteSettingsTable = sqliteTable('buvette_settings', {
  id: integer('id').primaryKey(),
  maxBalanceCents: integer('max_balance_cents').notNull().default(10000),
  /** Moyen de paiement des espèces : son compte par défaut est la caisse. */
  cashPaymentMethodId: integer('cash_payment_method_id'),
  /** Moyen de paiement de la carte : son compte par défaut est le compte de dette. */
  prepaidPaymentMethodId: integer('prepaid_payment_method_id'),
  /** Moyen de paiement de la CB : son compte par défaut porte ce que SumUp doit au club. */
  cardPaymentMethodId: integer('card_payment_method_id'),
  /** Catégorie des écarts de caisse. */
  gapCategoryId: integer('gap_category_id'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

/**
 * Une carte, une adresse vérifiée.
 *
 * Le CHECK porte la règle du solde jamais négatif : dans un `db.batch()`, un débit de trop
 * fait échouer l'instruction et annule toute la vente, là où un `UPDATE … WHERE` conditionnel
 * n'aurait rien fait et laissé passer les écritures suivantes.
 */
export const buvetteCardsTable = sqliteTable('buvette_cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  balanceCents: integer('balance_cents').notNull().default(0),
  /** La part du solde bloquée par une vente qui attend sa CB. */
  reservedCents: integer('reserved_cents').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  /** Carte supprimée par son titulaire : un remboursement ne peut plus s'y faire. */
  deletedAt: integer('deleted_at', { mode: 'timestamp' })
}, (table) => [
  check('buvette_cards_balance_check', sql`${table.balanceCents} >= 0`),
  check('buvette_cards_reserved_check', sql`${table.reservedCents} >= 0 AND ${table.reservedCents} <= ${table.balanceCents}`)
]);

/** Un navigateur ou un téléphone où la carte est ouverte. */
export const buvetteCardDevicesTable = sqliteTable('buvette_card_devices', {
  id: text('id').primaryKey(),
  cardId: integer('card_id').notNull().references(() => buvetteCardsTable.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp' })
}, (table) => [index('buvette_card_devices_card_idx').on(table.cardId)]);

/** Un tiroir d'espèces, de l'ouverture à la clôture. */
export const buvetteSessionsTable = sqliteTable('buvette_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  status: text('status', { enum: ['open', 'closed'] }).notNull().default('open'),
  /** Date comptable : celle de l'ouverture, dans le fuseau du club (AAAA-MM-JJ). */
  businessDate: text('business_date').notNull(),
  openingFloatCents: integer('opening_float_cents').notNull(),
  openedByEmail: text('opened_by_email').notNull(),
  openedAt: integer('opened_at', { mode: 'timestamp' }).notNull()
}, (table) => [
  // Une session ouverte à la fois : l'index partiel tranche deux ouvertures simultanées.
  uniqueIndex('buvette_sessions_one_open_idx').on(table.status).where(sql`${table.status} = 'open'`),
  check('buvette_sessions_float_check', sql`${table.openingFloatCents} >= 0`)
]);

/**
 * La clôture, à part de la session : sa clé primaire fait échouer une seconde clôture, et le
 * `db.batch()` annule alors les écritures comptables qui l'accompagnent.
 */
export const buvetteSessionClosuresTable = sqliteTable('buvette_session_closures', {
  sessionId: integer('session_id').primaryKey().references(() => buvetteSessionsTable.id),
  expectedCashCents: integer('expected_cash_cents').notNull(),
  countedCashCents: integer('counted_cash_cents').notNull(),
  gapCents: integer('gap_cents').notNull(),
  closedByEmail: text('closed_by_email').notNull(),
  closedAt: integer('closed_at', { mode: 'timestamp' }).notNull()
});

/**
 * Une commande passée depuis l'app buvette. Elle ne porte pas de prix : la caisse le recalcule
 * à l'encaissement. Rien n'est réservé ni débité tant qu'elle n'est pas encaissée.
 */
export const buvetteOrdersTable = sqliteTable('buvette_orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cardId: integer('card_id').notNull().references(() => buvetteCardsTable.id),
  status: text('status', { enum: ['pending', 'collected', 'cancelled'] }).notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => [
  // Une commande en cours par carte : le QR code du client désigne sans ambiguïté la sienne.
  uniqueIndex('buvette_orders_one_pending_idx').on(table.cardId).where(sql`${table.status} = 'pending'`),
  index('buvette_orders_status_idx').on(table.status)
]);

export const buvetteOrderLinesTable = sqliteTable('buvette_order_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => buvetteOrdersTable.id),
  itemId: integer('item_id').notNull().references(() => buvetteItemsTable.id),
  quantity: integer('quantity').notNull()
}, (table) => [
  index('buvette_order_lines_order_idx').on(table.orderId),
  check('buvette_order_lines_quantity_check', sql`${table.quantity} > 0`)
]);

export const buvetteSalesTable = sqliteTable('buvette_sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Généré par la caisse : un double appui ou un nouvel essai réseau n'encaisse qu'une fois. */
  clientId: text('client_id').notNull().unique(),
  sessionId: integer('session_id').notNull().references(() => buvetteSessionsTable.id),
  /** La commande du client, si la vente en vient. */
  orderId: integer('order_id').references(() => buvetteOrdersTable.id),
  status: text('status', { enum: ['in_progress', 'paid', 'cancelled'] }).notNull().default('paid'),
  itemsCents: integer('items_cents').notNull(),
  rechargeCents: integer('recharge_cents').notNull().default(0),
  rechargeCardId: integer('recharge_card_id').references(() => buvetteCardsTable.id),
  prepaidCents: integer('prepaid_cents').notNull().default(0),
  prepaidCardId: integer('prepaid_card_id').references(() => buvetteCardsTable.id),
  cashCents: integer('cash_cents').notNull().default(0),
  cardCents: integer('card_cents').notNull().default(0),
  createdByEmail: text('created_by_email').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  cancelledByEmail: text('cancelled_by_email'),
  cancelledAt: integer('cancelled_at', { mode: 'timestamp' })
}, (table) => [
  index('buvette_sales_session_idx').on(table.sessionId),
  // Deux caisses ne peuvent pas encaisser la même commande. Abandonnée, elle se rencaisse.
  uniqueIndex('buvette_sales_one_per_order_idx').on(table.orderId).where(sql`${table.orderId} IS NOT NULL AND ${table.status} <> 'cancelled'`),
  check('buvette_sales_amounts_check', sql`${table.itemsCents} >= 0 AND ${table.rechargeCents} >= 0 AND ${table.prepaidCents} >= 0 AND ${table.cashCents} >= 0 AND ${table.cardCents} >= 0`),
  // Tout est réglé, et la carte ne paie jamais une recharge.
  check('buvette_sales_total_check', sql`${table.prepaidCents} + ${table.cashCents} + ${table.cardCents} = ${table.itemsCents} + ${table.rechargeCents} AND ${table.prepaidCents} <= ${table.itemsCents}`)
]);

/** Le nom, le prix et la catégorie sont recopiés : la vente ne suit pas le catalogue. */
export const buvetteSaleLinesTable = sqliteTable('buvette_sale_lines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  saleId: integer('sale_id').notNull().references(() => buvetteSalesTable.id),
  itemId: integer('item_id').notNull().references(() => buvetteItemsTable.id),
  name: text('name').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  quantity: integer('quantity').notNull(),
  accountingCategoryId: integer('accounting_category_id').notNull()
}, (table) => [
  index('buvette_sale_lines_sale_idx').on(table.saleId),
  check('buvette_sale_lines_quantity_check', sql`${table.quantity} > 0`)
]);

/**
 * Un envoi d'un montant vers l'application SumUp. Une vente peut en compter plusieurs, chacune
 * sous son propre identifiant : SumUp refuse celui d'une tentative déjà faite.
 */
export const buvetteCardAttemptsTable = sqliteTable('buvette_card_attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  foreignTxId: text('foreign_tx_id').notNull().unique(),
  saleId: integer('sale_id').notNull().references(() => buvetteSalesTable.id),
  amountCents: integer('amount_cents').notNull(),
  /*
   * `expired` : SumUp ne la connaît pas 2 minutes après l'envoi. On peut relancer, mais elle
   * reste relue pendant 24 h : un paiement terminé tard ne doit jamais passer inaperçu.
   */
 
  status: text('status', { enum: ['pending', 'expired', 'successful', 'failed'] }).notNull().default('pending'),
  transactionCode: text('transaction_code'),
  /** `late` : réussie sur une vente qui n'attendait plus. `amount` : montant différent. À rembourser. */
  anomaly: text('anomaly', { enum: ['late', 'amount'] }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  checkedAt: integer('checked_at', { mode: 'timestamp' })
}, (table) => [
  index('buvette_card_attempts_sale_idx').on(table.saleId),
  index('buvette_card_attempts_status_idx').on(table.status)
]);

export const BUVETTE_MOVEMENT_TYPES = ['recharge', 'debit', 'refund', 'cancel'] as const;
export type BuvetteMovementType = (typeof BUVETTE_MOVEMENT_TYPES)[number];

/** L'historique d'une carte. Le montant est signé, du point de vue du solde. */
export const buvetteCardMovementsTable = sqliteTable('buvette_card_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Identifiant unique de l'acte : un remboursement ou une annulation rejoués sont refusés. */
  clientId: text('client_id').notNull().unique(),
  cardId: integer('card_id').notNull().references(() => buvetteCardsTable.id),
  sessionId: integer('session_id').notNull().references(() => buvetteSessionsTable.id),
  saleId: integer('sale_id').references(() => buvetteSalesTable.id),
  type: text('type', { enum: BUVETTE_MOVEMENT_TYPES }).notNull(),
  amountCents: integer('amount_cents').notNull(),
  createdByEmail: text('created_by_email').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
}, (table) => [
  index('buvette_card_movements_card_idx').on(table.cardId),
  index('buvette_card_movements_session_idx').on(table.sessionId)
]);

export type BuvetteItem = typeof buvetteItemsTable.$inferSelect;
export type BuvetteSale = typeof buvetteSalesTable.$inferSelect;
export type BuvetteSession = typeof buvetteSessionsTable.$inferSelect;
export type BuvetteSettings = typeof buvetteSettingsTable.$inferSelect;
export type BuvetteCardAttempt = typeof buvetteCardAttemptsTable.$inferSelect;
