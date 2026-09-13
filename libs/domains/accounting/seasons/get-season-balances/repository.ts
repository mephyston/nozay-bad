import { seasonsTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq } from 'drizzle-orm';
import { accountsTable, seasonBalancesTable } from '../../shared/schema';

export interface SeasonBalanceRow {
  id: number;
  seasonId: number;
  accountId: number;
  accountCode: string;
  accountLabel: string;
  initialBalanceCents: number;
  createdAt: Date;
}

export class GetSeasonBalancesRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  /** L'exercice, avec sa date d'ouverture : ce dont l'à-nouveau a besoin. */
  async findSeason(db: DbOrTx, seasonId: string | number): Promise<{ id: number; startDate: string } | undefined> {
    const seasonIdInt = await this.resolveSeasonId(db, seasonId);
    return db
      .select({ id: seasonsTable.id, startDate: seasonsTable.startDate })
      .from(seasonsTable)
      .where(eq(seasonsTable.id, seasonIdInt))
      .get();
  }

  /** Tous les comptes du club, dans l'ordre du seed. */
  async listAccounts(db: DbOrTx): Promise<{ id: number; code: string; label: string }[]> {
    return db
      .select({ id: accountsTable.id, code: accountsTable.code, label: accountsTable.label })
      .from(accountsTable)
      .orderBy(accountsTable.id)
      .all();
  }

  /** Une ligne par compte reporté, avec le code et le libellé du compte lus de `accounts`. */
  async getBalances(db: DbOrTx, seasonId: string | number): Promise<SeasonBalanceRow[]> {
    const seasonIdInt = await this.resolveSeasonId(db, seasonId);
    return db
      .select({
        id: seasonBalancesTable.id,
        seasonId: seasonBalancesTable.seasonId,
        accountId: seasonBalancesTable.accountId,
        accountCode: accountsTable.code,
        accountLabel: accountsTable.label,
        initialBalanceCents: seasonBalancesTable.initialBalanceCents,
        createdAt: seasonBalancesTable.createdAt
      })
      .from(seasonBalancesTable)
      .innerJoin(accountsTable, eq(accountsTable.id, seasonBalancesTable.accountId))
      .where(eq(seasonBalancesTable.seasonId, seasonIdInt))
      .all();
  }
}
