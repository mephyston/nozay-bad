import { type Db, type DbOrTx } from '@nba/db';
import { and, eq, isNull, lte, sql } from 'drizzle-orm';
import { cashHandoversTable, cashReceiptsTable, categoriesTable, seasonsTable } from '../../shared/schema';

export class OpenCashHandoverRepository {
  async activeSeasonId(db: DbOrTx): Promise<number | undefined> {
    return (await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.active, true)).get())?.id;
  }

  async categoryExists(db: DbOrTx, id: number): Promise<boolean> {
    return !!(await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.id, id)).get());
  }

  async pendingHandoverOf(db: DbOrTx, collectorEmail: string) {
    return db.select({ id: cashHandoversTable.id }).from(cashHandoversTable)
      .where(and(eq(cashHandoversTable.collectorEmail, collectorEmail), eq(cashHandoversTable.status, 'pending'))).get();
  }

  /** Les reçus détenus, arrêtés au plus récent : la remise ne prend que ceux-là. */
  async held(db: DbOrTx, collectorEmail: string) {
    return db.get<{ maxId: number | null; total: number | null }>(sql`
      SELECT MAX(id) AS maxId, SUM(amount_cents) AS total FROM cash_receipts
      WHERE collector_email = ${collectorEmail} AND status = 'sealed' AND handover_id IS NULL
    `);
  }

  /**
   * La remise et le rattachement de ses reçus, d'un seul lot : `last_insert_rowid()` y
   * désigne la remise, insérée juste avant (seul INSERT du lot).
   */
  async insert(db: Db, values: typeof cashHandoversTable.$inferInsert, maxReceiptId: number) {
    const [rows] = await db.batch([
      db.insert(cashHandoversTable).values(values).returning(),
      db.update(cashReceiptsTable).set({ handoverId: sql`last_insert_rowid()` as any }).where(and(
        eq(cashReceiptsTable.collectorEmail, values.collectorEmail),
        eq(cashReceiptsTable.status, 'sealed'),
        isNull(cashReceiptsTable.handoverId),
        lte(cashReceiptsTable.id, maxReceiptId)
      ))
    ]);
    return rows[0];
  }
}
