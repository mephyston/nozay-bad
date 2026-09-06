import { seasonsTable } from '@nba/accounting/schema';
import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { seasonBalancesTable } from '../../shared/schema';
import { resolveAccountId } from '../../config/queries';

export class UpdateSeasonBalancesRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  async updateBalances(db: DbOrTx, seasonId: number, balances: any[]): Promise<void> {
    for (const item of balances) {
      /*
       * Résolu en base, jamais par une table figée : celle-ci repliait tout code inconnu sur le
       * compte courant, si bien qu'un solde initial saisi pour un compte ajouté après le seed
       * aurait été écrit en silence sur le compte courant. Un code inconnu est refusé en 400.
       */
      const numericAccId = await resolveAccountId(db, item.accountId);
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
