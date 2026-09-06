import { listAccounts, type AccountSummary } from '../../config/queries';
import { ledgerEntriesTable, categoriesTable } from '@nba/accounting/schema';
import { type DbOrTx } from '@nba/db';
import { eq, and, gte, lte, or, inArray, lt } from 'drizzle-orm';
import { seasonBalancesTable, seasonCategoryBudgetsTable, accountsTable, seasonsTable, bankStatementBalancesTable } from '../../shared/schema';


export class GetSeasonReportsRepository {
  async getBalances(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const numericId = Number(seasonId);
    const cond = !isNaN(numericId)
      ? or(eq(seasonBalancesTable.seasonId, numericId), eq(seasonBalancesTable.seasonId, seasonId as any))
      : eq(seasonBalancesTable.seasonId, seasonId as any);
    return db.select().from(seasonBalancesTable).where(cond).all();
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

  async getTransactionsForSeason(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const numericId = Number(seasonId);
    const cond = !isNaN(numericId)
      ? or(eq(ledgerEntriesTable.seasonId, numericId), eq(ledgerEntriesTable.seasonId, seasonId as any))
      : eq(ledgerEntriesTable.seasonId, seasonId as any);
    return db.select().from(ledgerEntriesTable).where(cond).all();
  }


  // Trésorerie = filtre par DATE (relevé bancaire), PAS par saison : les produits/charges
  // constatés d'avance encaissés/décaissés pendant la période de l'exercice sont physiquement
  // sur le compte, même si leur `seasonId` pointe l'exercice de rattachement (souvent futur).
  async getDeferredTransactions(db: DbOrTx, startDate: string, cutoffDate: string): Promise<any[]> {
    return db.select()
      .from(ledgerEntriesTable)
      .where(and(
        gte(ledgerEntriesTable.date, startDate),
        lte(ledgerEntriesTable.date, cutoffDate),
        inArray(ledgerEntriesTable.accrualType, ['produit_constate_avance', 'charge_constatee_avance'])
      ))
      .all();
  }

  async getCategoryBudgets(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const numericId = Number(seasonId);
    const cond = !isNaN(numericId)
      ? or(eq(seasonCategoryBudgetsTable.seasonId, numericId), eq(seasonCategoryBudgetsTable.seasonId, seasonId as any))
      : eq(seasonCategoryBudgetsTable.seasonId, seasonId as any);
    return db.select().from(seasonCategoryBudgetsTable).where(cond).all();
  }

  async getAllCategories(db: DbOrTx): Promise<any[]> {
    return db.select().from(categoriesTable).all();
  }

  /**
   * Le dernier solde annoncé par la banque pour chaque compte, à la date d'arrêté.
   *
   * C'est le seul des trois soldes que la comptabilité ne fabrique pas : il vient du
   * `<LEDGERBAL>` du relevé. Aucune écriture ne le déplace — d'où son intérêt à côté du solde
   * comptable, qu'une saisie déplace toujours.
   *
   * Le tri se fait en mémoire : un club a trois comptes et un arrêté par relevé, et une
   * fonction de fenêtrage coûterait ici plus de lecture qu'elle n'en économise.
   */
  async getLatestStatementBalances(db: DbOrTx, asOfDate: string): Promise<Map<number, { date: string; balanceCents: number }>> {
    const rows = await db.select({
        accountId: bankStatementBalancesTable.accountId,
        date: bankStatementBalancesTable.date,
        balanceCents: bankStatementBalancesTable.balanceCents
      })
      .from(bankStatementBalancesTable)
      .where(lte(bankStatementBalancesTable.date, asOfDate))
      .all();

    const latest = new Map<number, { date: string; balanceCents: number }>();
    for (const row of rows) {
      const known = latest.get(row.accountId);
      if (!known || row.date > known.date) {
        latest.set(row.accountId, { date: row.date, balanceCents: row.balanceCents });
      }
    }
    return latest;
  }

  /** Tous les comptes avec leur classe : c'est elle qui dit lesquels sont des comptes de tiers. */
  async getAccounts(db: DbOrTx): Promise<AccountSummary[]> {
    return listAccounts(db);
  }

  async getPastSeasons(db: DbOrTx, currentSeasonStartDate: string): Promise<any[]> {
    return db.select()
      .from(seasonsTable)
      .where(lt(seasonsTable.startDate, currentSeasonStartDate))
      .all();
  }

  async getPastTransactions(db: DbOrTx, currentSeasonStartDate: string): Promise<any[]> {
    return db.select()
      .from(ledgerEntriesTable)
      .where(lt(ledgerEntriesTable.date, currentSeasonStartDate))
      .all();
  }
}

