import { type DbOrTx } from '@nba/db';
import { ordersTable } from './shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

export async function getUnvalidatedPaidOrders(db: DbOrTx, seasonId: number): Promise<any[]> {
  return db.select()
    .from(ordersTable)
    .where(and(
      eq(ordersTable.seasonId, seasonId),
      eq(ordersTable.status, 'pending'),
      isNotNull(ordersTable.paidAt)
    ))
    .all();
}
