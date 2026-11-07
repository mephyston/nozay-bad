import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardDevicesTable, buvetteCardMovementsTable } from '../shared/schema';

export class CardWalletRepository {
  movements(db: DbOrTx, cardId: number) {
    return db
      .select({
        id: buvetteCardMovementsTable.id,
        type: buvetteCardMovementsTable.type,
        amountCents: buvetteCardMovementsTable.amountCents,
        createdAt: buvetteCardMovementsTable.createdAt
      })
      .from(buvetteCardMovementsTable)
      .where(eq(buvetteCardMovementsTable.cardId, cardId))
      .orderBy(desc(buvetteCardMovementsTable.id))
      .limit(30)
      .all();
  }

  revokeOthers(db: DbOrTx, cardId: number, keepDeviceId: string) {
    return db.update(buvetteCardDevicesTable)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(buvetteCardDevicesTable.cardId, cardId),
        ne(buvetteCardDevicesTable.id, keepDeviceId),
        sql`${buvetteCardDevicesTable.revokedAt} IS NULL`
      ));
  }
}
