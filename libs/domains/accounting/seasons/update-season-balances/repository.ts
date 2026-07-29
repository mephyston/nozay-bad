import { seasonsTable } from '@nba/accounting/schema';
import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { seasonBalancesTable } from '../../shared/schema';

export class UpdateSeasonBalancesRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  async updateBalances(db: DbOrTx, seasonId: number, balances: any[]): Promise<void> {
    const accountIdMap: Record<string, number> = { current: 1, savings: 2, cash: 3 };
    for (const item of balances) {
      const numericAccId = typeof item.accountId === 'number' ? item.accountId : accountIdMap[item.accountId] || Number(item.accountId) || 1;
      const balCents = item.initialBalanceCents ?? 0;

      await db.insert(seasonBalancesTable)
        .values({
          seasonId,
          accountId: numericAccId,
          initialBalanceCents: balCents,
          createdAt: new Date()
        })
        .onConflictDoUpdate({
          target: [seasonBalancesTable.seasonId, seasonBalancesTable.accountId],
          set: { initialBalanceCents: balCents }
        })
        .run();
    }
  }
}
