import { seasonBalancesTable } from '../../data-access/src/schema';

export class UpdateSeasonBalancesRepository {
  async updateBalances(db: any, seasonId: string, balances: { accountId: 'current' | 'savings' | 'cash'; initialBalance: number }[]): Promise<void> {
    for (const item of balances) {
      await db.insert(seasonBalancesTable)
        .values({
          seasonId,
          accountId: item.accountId,
          initialBalance: item.initialBalance,
          createdAt: new Date()
        })
        .onConflictDoUpdate({
          target: [seasonBalancesTable.seasonId, seasonBalancesTable.accountId],
          set: { initialBalance: item.initialBalance }
        })
        .run();
    }
  }
}
