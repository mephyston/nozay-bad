import { listAccountsWithStatements } from '../../config/queries';
import { type DbOrTx } from '@nba/db';
import { and, desc, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm';
import { resolveOpeningBalances, type OpeningBalances } from '../../shared/opening-balances';
import {
  accountsTable,
  bankStatementBalancesTable,
  bankStatementLinesTable,
  ledgerEntriesTable
} from '../../shared/schema';

export class GetReconciliationStatementRepository {
  async getAccountByCode(db: DbOrTx, code: string): Promise<{ id: number; code: string; label: string } | undefined> {
    return db.select({ id: accountsTable.id, code: accountsTable.code, label: accountsTable.label })
      .from(accountsTable)
      .where(eq(accountsTable.code, code))
      .get();
  }

  /** Délégué à `config/queries.ts`, où la clôture lit la même liste. */
  async getAccountsWithStatements(db: DbOrTx): Promise<{ id: number; code: string; label: string }[]> {
    return listAccountsWithStatements(db);
  }

  /**
   * Les soldes d'ouverture des comptes demandés : le report figé s'il existe, le calcul sinon.
   *
   * Les deux méthodes que celle-ci remplace lisaient `season_balances` et rendaient `0` quand
   * la ligne manquait. Or ce report n'est écrit qu'à la clôture : au 1er septembre, tant que
   * l'exercice précédent restait ouvert, l'écart de rapprochement affiché valait toute la
   * trésorerie d'ouverture — sans qu'aucun des décalages que l'écran sait nommer ne l'explique.
   *
   * Le calcul vit dans `shared/opening-balances.ts`, partagé avec le bilan de trésorerie et le
   * grand livre : trois écrans qui donnaient trois réponses différentes à la même question.
   * Il passe par le dépôt, et non par un appel direct depuis le handler, pour rester
   * bouchonnable comme le reste de la lecture.
   */
  async getOpeningBalances(
    db: DbOrTx,
    season: { id: number; startDate: string },
    accountIds: number[]
  ): Promise<OpeningBalances> {
    return resolveOpeningBalances(db, season, accountIds);
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
   * Les lignes de relevé du compte que rien ne rapproche.
   *
   * Le filtre porte sur « pas rapprochée » plutôt que sur « en attente » : c'est la seule
   * formulation qui reste juste si un état venait à s'ajouter. Elle a d'ailleurs survécu au
   * retrait du masquage, qui était le troisième état — une ligne masquée comptait déjà dans
   * l'écart, la banque ayant bougé l'argent que le trésorier regarde la ligne ou non.
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

  /**
   * La dernière opération que les relevés du compte détaillent, toutes dates confondues.
   *
   * Volontairement non bornée par la date d'arrêté : elle ne sert qu'à répondre « l'arrêté
   * est-il en avance sur son propre détail ? », c'est-à-dire à se comparer à la date de
   * l'arrêté, jamais à la date de consultation. Une borne haute ne pourrait que retirer des
   * lignes postérieures à l'arrêté — dont la présence prouve justement qu'il n'est pas en
   * avance. Sans borne, la réponse est exacte dans les deux sens.
   */
  async getLatestBankLineDate(db: DbOrTx, accountId: number): Promise<string | undefined> {
    const row = await db.select({ date: bankStatementLinesTable.date })
      .from(bankStatementLinesTable)
      .where(eq(bankStatementLinesTable.accountId, accountId))
      .orderBy(desc(bankStatementLinesTable.date))
      .limit(1)
      .get();
    return row?.date;
  }

  /** La même date pour plusieurs comptes, en une lecture. */
  async getLatestBankLineDates(db: DbOrTx, accountIds: number[]): Promise<Map<number, string>> {
    if (accountIds.length === 0) return new Map();

    const rows = await db.select({
        accountId: bankStatementLinesTable.accountId,
        date: sql<string>`MAX(${bankStatementLinesTable.date})`
      })
      .from(bankStatementLinesTable)
      .where(inArray(bankStatementLinesTable.accountId, accountIds))
      .groupBy(bankStatementLinesTable.accountId)
      .all();
    return new Map(rows.map((r) => [r.accountId, r.date]));
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
