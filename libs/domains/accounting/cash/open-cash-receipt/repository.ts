import { type DbOrTx } from '@nba/db';
import { and, eq } from 'drizzle-orm';
import { cashReceiptsTable, categoriesTable, seasonsTable } from '../../shared/schema';

export class OpenCashReceiptRepository {
  async activeSeasonId(db: DbOrTx): Promise<number | undefined> {
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.active, true)).get();
    return row?.id;
  }

  async activeCategory(db: DbOrTx, id: number) {
    return db.select({ id: categoriesTable.id, label: categoriesTable.adherentLabel })
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.active, true)))
      .get();
  }

  async insert(db: DbOrTx, values: typeof cashReceiptsTable.$inferInsert) {
    return (await db.insert(cashReceiptsTable).values(values).returning().all())[0];
  }
}
