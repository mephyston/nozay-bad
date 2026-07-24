import { eq, or } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { seasonBalancesTable, seasonsTable } from '../../shared/schema';
import { type UpdateSeasonBalancesItem } from './dto';

export class UpdateSeasonBalancesRepository {
  async resolveSeasonId(db: DbOrTx, id: string | number): Promise<number | null> {
    if (typeof id === 'number') return id;
    const num = Number(id);
    if (!isNaN(num) && Number.isInteger(num)) return num;

    const season = await db.select({ id: seasonsTable.id })
      .from(seasonsTable)
      .where(or(eq(seasonsTable.code, id), eq(seasonsTable.id, num || -1)))
      .get();

    return season ? season.id : null;
  }

  buildUpdateBalanceStatement(db: DbOrTx, seasonId: number, item: UpdateSeasonBalancesItem) {
    return db.insert(seasonBalancesTable)
      .values({
        seasonId,
        accountId: item.accountId,
        initialBalanceCents: item.initialBalanceCents,
        createdAt: new Date()
      })
      .onConflictDoUpdate({
        target: [seasonBalancesTable.seasonId, seasonBalancesTable.accountId],
        set: { initialBalanceCents: item.initialBalanceCents }
      });
  }

  async updateBalances(db: DbOrTx, seasonId: number, balances: UpdateSeasonBalancesItem[]): Promise<void> {
    if (balances.length === 0) return;
    const statements = balances.map(item => this.buildUpdateBalanceStatement(db, seasonId, item));
    await db.batch(statements as any);
  }
}

