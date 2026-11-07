import { and, eq, isNull } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardDevicesTable, buvetteCardsTable } from '../shared/schema';

export class ScanCardRepository {
  findByPaperHash(db: DbOrTx, hash: string) {
    return db.select().from(buvetteCardsTable).where(eq(buvetteCardsTable.paperCodeHash, hash)).get();
  }

  async activeDeviceIds(db: DbOrTx, cardId: number): Promise<string[]> {
    const rows = await db.select({ id: buvetteCardDevicesTable.id }).from(buvetteCardDevicesTable)
      .where(and(eq(buvetteCardDevicesTable.cardId, cardId), isNull(buvetteCardDevicesTable.revokedAt)));
    return rows.map((row) => row.id);
  }
}
