import { type DbOrTx } from '@nba/db';
import { and, desc, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm';
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
   * Les comptes pour lesquels un relevé a déjà été importé — lignes OU solde.
   *
   * La caisse d'une buvette n'a pas de banque : elle n'a donc rien à rapprocher, et la faire
   * figurer afficherait un écart permanent égal à son solde. Plutôt que de coder en dur « tout
   * sauf la caisse », on part de ce qui a réellement été importé.
   *
   * Les DEUX tables comptent, et c'est le point : n'exiger qu'un solde rendait l'état invisible
   * sur toute base alimentée avant que le `<LEDGERBAL>` ne soit capté. Les comptes déjà chargés
   * de centaines de lignes n'avaient aucun solde, donc aucun état — et l'écran, qui savait
   * pourtant dire « aucun solde de relevé importé », ne s'affichait tout simplement pas.
   */
  async getAccountsWithStatements(db: DbOrTx): Promise<{ id: number; code: string; label: string }[]> {
    const columns = { id: accountsTable.id, code: accountsTable.code, label: accountsTable.label };

    const withBalances = await db.selectDistinct(columns)
      .from(accountsTable)
      .innerJoin(bankStatementBalancesTable, eq(bankStatementBalancesTable.accountId, accountsTable.id))
      .all();

    const withLines = await db.selectDistinct(columns)
      .from(accountsTable)
      .innerJoin(bankStatementLinesTable, eq(bankStatementLinesTable.accountId, accountsTable.id))
      .all();

    const byId = new Map<number, { id: number; code: string; label: string }>();
    for (const account of [...withBalances, ...withLines]) byId.set(account.id, account);
    return [...byId.values()].sort((a, b) => a.id - b.id);
  }

  async getInitialBalanceCents(db: DbOrTx, seasonId: number, accountId: number): Promise<number> {
    const row = await db.select({ initialBalanceCents: seasonBalancesTable.initialBalanceCents })
      .from(seasonBalancesTable)
      .where(and(eq(seasonBalancesTable.seasonId, seasonId), eq(seasonBalancesTable.accountId, accountId)))
      .get();
    return row?.initialBalanceCents ?? 0;
  }

  /** Les à-nouveaux de tous les comptes de l'exercice, en une lecture. */
  async getInitialBalancesBySeason(db: DbOrTx, seasonId: number): Promise<Map<number, number>> {
    const rows = await db.select({
        accountId: seasonBalancesTable.accountId,
        initialBalanceCents: seasonBalancesTable.initialBalanceCents
      })
      .from(seasonBalancesTable)
      .where(eq(seasonBalancesTable.seasonId, seasonId))
      .all();
    return new Map(rows.map((r) => [r.accountId, r.initialBalanceCents]));
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

  /**
   * Les mêmes lignes, pour plusieurs comptes à la fois et jusqu'à la plus tardive des dates
   * d'arrêté. Chaque compte resserre ensuite sur la sienne : le tri par date est déjà fait ici,
   * et la borne haute d'un compte ne peut que retirer des lignes, jamais en ajouter.
   */
  async getUnreconciledBankLinesForAccounts(db: DbOrTx, accountIds: number[], startDate: string, maxAsOfDate: string): Promise<Map<number, any[]>> {
    const byAccount = new Map<number, any[]>();
    if (accountIds.length === 0) return byAccount;

    const rows = await db.select()
      .from(bankStatementLinesTable)
      .where(and(
        inArray(bankStatementLinesTable.accountId, accountIds),
        gte(bankStatementLinesTable.date, startDate),
        lte(bankStatementLinesTable.date, maxAsOfDate),
        ne(bankStatementLinesTable.status, 'reconciled')
      ))
      .all();

    for (const accountId of accountIds) byAccount.set(accountId, []);
    for (const row of rows) {
      const bucket = byAccount.get((row as any).accountId);
      if (bucket) bucket.push(row);
    }
    return byAccount;
  }

  /* Le tri et la coupe reviennent à SQLite : charger tous les arrêtés pour n'en garder qu'un
     faisait faire au Worker un travail que l'index fait mieux. */
  async getLatestBankStatementBalance(db: DbOrTx, accountId: number, asOfDate: string): Promise<{ date: string; balanceCents: number } | undefined> {
    return db.select({
        date: bankStatementBalancesTable.date,
        balanceCents: bankStatementBalancesTable.balanceCents
      })
      .from(bankStatementBalancesTable)
      .where(and(
        eq(bankStatementBalancesTable.accountId, accountId),
        lte(bankStatementBalancesTable.date, asOfDate)
      ))
      .orderBy(desc(bankStatementBalancesTable.date))
      .limit(1)
      .get();
  }

  /** Le dernier arrêté connu du compte, toutes dates confondues : la date d'arrêté par défaut. */
  async getLatestBankStatementDate(db: DbOrTx, accountId: number): Promise<string | undefined> {
    const row = await db.select({ date: bankStatementBalancesTable.date })
      .from(bankStatementBalancesTable)
      .where(eq(bankStatementBalancesTable.accountId, accountId))
      .orderBy(desc(bankStatementBalancesTable.date))
      .limit(1)
      .get();
    return row?.date;
  }

  /** La dernière date d'arrêté de chaque compte, en une lecture. */
  async getLatestBankStatementDates(db: DbOrTx): Promise<Map<number, string>> {
    const rows = await db.select({
        accountId: bankStatementBalancesTable.accountId,
        date: sql<string>`MAX(${bankStatementBalancesTable.date})`
      })
      .from(bankStatementBalancesTable)
      .groupBy(bankStatementBalancesTable.accountId)
      .all();
    return new Map(rows.map((r) => [r.accountId, r.date]));
  }

  /**
   * Tous les arrêtés des comptes demandés. Chaque compte y choisit ensuite le dernier qui
   * précède sa propre date d'arrêté : il y a une ligne par compte et par import de relevé,
   * soit quelques dizaines — les charger d'un bloc coûte moins qu'une requête par compte.
   */
  async getBankStatementBalancesForAccounts(db: DbOrTx, accountIds: number[]): Promise<Map<number, { date: string; balanceCents: number }[]>> {
    const byAccount = new Map<number, { date: string; balanceCents: number }[]>();
    if (accountIds.length === 0) return byAccount;

    const rows = await db.select({
        accountId: bankStatementBalancesTable.accountId,
        date: bankStatementBalancesTable.date,
        balanceCents: bankStatementBalancesTable.balanceCents
      })
      .from(bankStatementBalancesTable)
      .where(inArray(bankStatementBalancesTable.accountId, accountIds))
      .orderBy(desc(bankStatementBalancesTable.date))
      .all();

    for (const accountId of accountIds) byAccount.set(accountId, []);
    for (const row of rows) {
      const bucket = byAccount.get(row.accountId);
      if (bucket) bucket.push({ date: row.date, balanceCents: row.balanceCents });
    }
    return byAccount;
  }
}
