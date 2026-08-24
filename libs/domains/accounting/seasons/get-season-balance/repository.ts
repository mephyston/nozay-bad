import { seasonsTable } from '@nba/accounting/schema';
import { ledgerEntriesTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { seasonBalancesTable, accountsTable, accountClassesTable } from '../../shared/schema';
import { type AccountRef } from '../../shared/balances';

export class GetSeasonBalanceRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  async getBalances(db: DbOrTx, seasonId: string | number): Promise<any[]> {
    const seasonIdInt = await this.resolveSeasonId(db, seasonId);
    return db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonIdInt)).all();
  }

  /**
   * Les comptes de trésorerie, lus de la base.
   *
   * Ils étaient auparavant codés en dur (`{ current: 1, savings: 2, cash: 3 }`) : la
   * correspondance ne valait que pour l'ordre du seed d'origine, et un compte ajouté depuis
   * l'écran de configuration disparaissait purement et simplement du solde total.
   */
  async getTreasuryAccounts(db: DbOrTx): Promise<AccountRef[]> {
    return db
      .select({ id: accountsTable.id, code: accountsTable.code, label: accountsTable.label })
      .from(accountsTable)
      .innerJoin(accountClassesTable, eq(accountsTable.accountClassId, accountClassesTable.id))
      .where(eq(accountClassesTable.type, 'tresorerie'))
      .all();
  }

  async getTransactionsForPeriod(db: DbOrTx, startDate: string, endDate: string): Promise<any[]> {
    return db.select()
      .from(ledgerEntriesTable)
      .where(and(
        gte(ledgerEntriesTable.date, startDate),
        lte(ledgerEntriesTable.date, endDate)
      ))
      .all();
  }
}
