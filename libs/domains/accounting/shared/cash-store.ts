import { type DbOrTx } from '@nba/db';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { cashHandoversTable, cashReceiptsTable, categoriesTable } from './schema';

/**
 * Lectures et écritures communes aux tranches de `cash/` (RF-ACC-003).
 *
 * Un reçu s'ouvre, se signe et se remet par des tranches distinctes : ce qu'elles
 * partagent — relire un reçu, le présenter, le sceller — vit ici, une fois.
 */
export type CashReceiptRow = typeof cashReceiptsTable.$inferSelect;
export type CashHandoverRow = typeof cashHandoversTable.$inferSelect;

/** Ce qu'on montre d'un reçu : jamais ses jetons, ni le code, ni la signature. */
export interface CashReceiptView {
  id: number;
  status: CashReceiptRow['status'];
  collectorEmail: string;
  collectorName: string;
  payerMemberId: number | null;
  payerName: string;
  /** L'adresse est masquée : on dit où part le code sans la livrer. */
  payerEmailHint: string | null;
  amountCents: number;
  categoryId: number;
  categoryLabel: string;
  description: string;
  signatureMethod: CashReceiptRow['signatureMethod'];
  signedAt: string | null;
  handoverId: number | null;
  createdAt: string;
}

export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [user, domain] = email.split('@');
  if (!domain) return null;
  return `${user.slice(0, 2)}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function toReceiptView(row: CashReceiptRow, categoryLabel: string): CashReceiptView {
  return {
    id: row.id,
    status: row.status,
    collectorEmail: row.collectorEmail,
    collectorName: row.collectorName,
    payerMemberId: row.payerMemberId,
    payerName: row.payerName,
    payerEmailHint: maskEmail(row.payerEmail),
    amountCents: row.amountCents,
    categoryId: row.categoryId,
    categoryLabel,
    description: row.description,
    signatureMethod: row.signatureMethod,
    signedAt: iso(row.signedAt),
    handoverId: row.handoverId,
    createdAt: row.createdAt.toISOString()
  };
}

export async function findReceipt(db: DbOrTx, id: number) {
  return db
    .select({ receipt: cashReceiptsTable, categoryLabel: categoriesTable.adherentLabel })
    .from(cashReceiptsTable)
    .innerJoin(categoriesTable, eq(categoriesTable.id, cashReceiptsTable.categoryId))
    .where(eq(cashReceiptsTable.id, id))
    .get();
}

export async function findReceiptByToken(db: DbOrTx, tokenHash: string) {
  return db
    .select({ receipt: cashReceiptsTable, categoryLabel: categoriesTable.adherentLabel })
    .from(cashReceiptsTable)
    .innerJoin(categoriesTable, eq(categoriesTable.id, cashReceiptsTable.categoryId))
    .where(eq(cashReceiptsTable.tokenHash, tokenHash))
    .get();
}

export async function updateReceipt(db: DbOrTx, id: number, values: Partial<CashReceiptRow>) {
  await db.update(cashReceiptsTable).set(values).where(eq(cashReceiptsTable.id, id)).run();
}

/**
 * Scelle un reçu encore en attente. La condition sur le statut fait de l'écriture une
 * bascule unique : deux signatures simultanées (QR et code) n'en scellent qu'une.
 * Renvoie vrai si c'est cet appel qui a scellé.
 */
export async function sealReceipt(
  db: DbOrTx,
  id: number,
  values: { signatureMethod: CashReceiptRow['signatureMethod']; signedBy: string; signatureData?: string | null; signedAt: Date }
): Promise<boolean> {
  const rows = await db
    .update(cashReceiptsTable)
    .set({ ...values, status: 'sealed', tokenHash: null, tokenExpiresAt: null, codeHash: null, codeExpiresAt: null })
    .where(and(eq(cashReceiptsTable.id, id), eq(cashReceiptsTable.status, 'pending')))
    .returning({ id: cashReceiptsTable.id })
    .all();
  return rows.length === 1;
}

/** Annule un reçu encore en attente ; faux s'il a été signé entre-temps. */
export async function cancelPendingReceipt(db: DbOrTx, id: number): Promise<boolean> {
  const rows = await db
    .update(cashReceiptsTable)
    .set({ status: 'cancelled', tokenHash: null, tokenExpiresAt: null, codeHash: null, codeExpiresAt: null })
    .where(and(eq(cashReceiptsTable.id, id), eq(cashReceiptsTable.status, 'pending')))
    .returning({ id: cashReceiptsTable.id })
    .all();
  return rows.length === 1;
}

/** Les reçus scellés qu'un encaisseur détient encore : pas encore remis. */
export async function heldReceipts(db: DbOrTx, collectorEmail: string) {
  return db
    .select({ receipt: cashReceiptsTable, categoryLabel: categoriesTable.adherentLabel })
    .from(cashReceiptsTable)
    .innerJoin(categoriesTable, eq(categoriesTable.id, cashReceiptsTable.categoryId))
    .where(and(
      eq(cashReceiptsTable.collectorEmail, collectorEmail),
      eq(cashReceiptsTable.status, 'sealed'),
      isNull(cashReceiptsTable.handoverId)
    ))
    .orderBy(cashReceiptsTable.signedAt)
    .all();
}

/** Les espèces en circulation, par encaisseur. */
export async function cashInHand(db: DbOrTx) {
  return db.all<{ collectorEmail: string; collectorName: string; count: number; totalCents: number; oldest: number }>(sql`
    SELECT collector_email AS collectorEmail, MAX(collector_name) AS collectorName,
      COUNT(*) AS count, SUM(amount_cents) AS totalCents, MIN(signed_at) AS oldest
    FROM cash_receipts
    WHERE status = 'sealed' AND handover_id IS NULL
    GROUP BY collector_email
    ORDER BY oldest
  `);
}

export async function findHandover(db: DbOrTx, id: number) {
  return db.select().from(cashHandoversTable).where(eq(cashHandoversTable.id, id)).get();
}

export async function findHandoverByToken(db: DbOrTx, tokenHash: string) {
  return db.select().from(cashHandoversTable).where(eq(cashHandoversTable.tokenHash, tokenHash)).get();
}

export async function handoverReceipts(db: DbOrTx, handoverId: number) {
  return db
    .select({ receipt: cashReceiptsTable, categoryLabel: categoriesTable.adherentLabel })
    .from(cashReceiptsTable)
    .innerJoin(categoriesTable, eq(categoriesTable.id, cashReceiptsTable.categoryId))
    .where(eq(cashReceiptsTable.handoverId, handoverId))
    .orderBy(cashReceiptsTable.signedAt)
    .all();
}
