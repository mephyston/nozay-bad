import { type DbOrTx } from '@nba/db';
import { and, eq, gte, lte, ne } from 'drizzle-orm';
import {
  accountsTable,
  bankStatementBalancesTable,
  bankStatementLinesTable,
  ledgerEntriesTable,
  seasonBalancesTable
} from '../../shared/schema';

export class GetReconciliationStatementRepository {
  async getAccountByCode(db: DbOrTx, code: string): Promise<{ id: number; code: string; label: string } | undefined> {
    return db.select({ id: accountsTable.id, code: accountsTable.code, label: accountsTable.label })
      .from(accountsTable)
      .where(eq(accountsTable.code, code))
      .get();
  }

  /**
   * Les comptes pour lesquels un relevé a déjà été importé.
   *
   * La caisse d'une buvette n'a pas de banque : elle n'a donc rien à rapprocher, et la faire
   * figurer dans l'état afficherait un écart permanent égal à son solde. Plutôt que de coder
   * en dur « tout sauf la caisse », on part de ce qui a réellement été importé.
   */
  async getAccountsWithStatements(db: DbOrTx): Promise<{ id: number; code: string; label: string }[]> {
    return db.selectDistinct({ id: accountsTable.id, code: accountsTable.code, label: accountsTable.label })
      .from(accountsTable)
      .innerJoin(bankStatementBalancesTable, eq(bankStatementBalancesTable.accountId, accountsTable.id))
      .all();
  }

  async getInitialBalanceCents(db: DbOrTx, seasonId: number, accountId: number): Promise<number> {
    const row = await db.select({ initialBalanceCents: seasonBalancesTable.initialBalanceCents })
      .from(seasonBalancesTable)
      .where(and(eq(seasonBalancesTable.seasonId, seasonId), eq(seasonBalancesTable.accountId, accountId)))
      .get();
    return row?.initialBalanceCents ?? 0;
  }

  /**
   * Toutes les écritures de la période, pas seulement celles du compte : un virement interne
   * n'est rattaché qu'à son compte d'origine, et le lire depuis le compte de destination
   * demande de l'avoir sous la main.
   */
  async getEntriesForPeriod(db: DbOrTx, startDate: string, asOfDate: string): Promise<any[]> {
    return db.select()
      .from(ledgerEntriesTable)
      .where(and(gte(ledgerEntriesTable.date, startDate), lte(ledgerEntriesTable.date, asOfDate)))
      .all();
  }

  /**
   * Les lignes de relevé du compte que rien ne rapproche : `pending` (à traiter) et `ignored`
   * (masquées). Les masquées comptent dans l'écart au même titre que les autres — la banque a
   * bougé l'argent, que le trésorier ait choisi de ne pas regarder la ligne ou non.
   */
  async getUnreconciledBankLines(db: DbOrTx, accountId: number, startDate: string, asOfDate: string): Promise<any[]> {
    return db.select()
      .from(bankStatementLinesTable)
      .where(and(
        eq(bankStatementLinesTable.accountId, accountId),
        gte(bankStatementLinesTable.date, startDate),
        lte(bankStatementLinesTable.date, asOfDate),
        ne(bankStatementLinesTable.status, 'reconciled')
      ))
      .all();
  }

  async getLatestBankStatementBalance(db: DbOrTx, accountId: number, asOfDate: string): Promise<{ date: string; balanceCents: number } | undefined> {
    const rows = await db.select({
        date: bankStatementBalancesTable.date,
        balanceCents: bankStatementBalancesTable.balanceCents
      })
      .from(bankStatementBalancesTable)
      .where(and(
        eq(bankStatementBalancesTable.accountId, accountId),
        lte(bankStatementBalancesTable.date, asOfDate)
      ))
      .all();
    if (rows.length === 0) return undefined;
    return rows.sort((a, b) => b.date.localeCompare(a.date))[0];
  }

  /** Le dernier arrêté connu du compte, toutes dates confondues : la date d'arrêté par défaut. */
  async getLatestBankStatementDate(db: DbOrTx, accountId: number): Promise<string | undefined> {
    const rows = await db.select({ date: bankStatementBalancesTable.date })
      .from(bankStatementBalancesTable)
      .where(eq(bankStatementBalancesTable.accountId, accountId))
      .all();
    if (rows.length === 0) return undefined;
    return rows.sort((a, b) => b.date.localeCompare(a.date))[0].date;
  }
}
