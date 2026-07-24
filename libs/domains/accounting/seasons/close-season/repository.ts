import { type DbOrTx, type Db } from '@nba/db';
import { eq, and, gte, lte, or, inArray } from 'drizzle-orm';
import {
  seasonsTable,
  ledgerEntriesTable,
  bankStatementLinesTable,
  checkDepositsTable,
  checksTable,
  seasonBalancesTable,
  accountsTable,
  seasonCategoryBudgetsTable
} from '../../shared/schema';

export interface CloseSeasonRepositoryInterface {
  getSeasonById(db: DbOrTx, id: string | number): Promise<any | undefined>;
  getNextSeason(db: DbOrTx, currentSeason: any): Promise<any | undefined>;
  getPendingBankTransactions(db: DbOrTx, seasonId: number | string): Promise<any[]>;
  getUnresolvedCheckDeposits(db: DbOrTx, seasonId: number | string): Promise<any[]>;
  getInVaultChecks(db: DbOrTx, seasonId: number | string): Promise<any[]>;
  getPendingDebitTransactions(db: DbOrTx, seasonId: number | string): Promise<any[]>;
  getSeasonBalances(db: DbOrTx, seasonId: number | string): Promise<any[]>;
  getTransactionsForSeason(db: DbOrTx, seasonId: number | string): Promise<any[]>;
  getAccounts(db: DbOrTx): Promise<any[]>;
  getLatestReconciledBankTransaction(db: DbOrTx, seasonId: number | string, accountId: number): Promise<any | undefined>;
  getCategoryBudgets(db: DbOrTx, seasonId: number | string): Promise<any[]>;
  closeSeasonWithRollover(db: Db, seasonId: number | string, nextSeasonId: number | null, balancesToRollover: { accountId: number; finalBalanceCents: number }[], copyBudgets: boolean): Promise<any>;
  reopenSeason(db: Db, seasonId: number | string, nextSeasonId: number | null): Promise<any>;
}

export class CloseSeasonRepository implements CloseSeasonRepositoryInterface {
  async getSeasonById(db: DbOrTx, id: string | number): Promise<any | undefined> {
    const numId = Number(id);
    const cond = !isNaN(numId)
      ? or(eq(seasonsTable.id, numId), eq(seasonsTable.code, id as any))
      : eq(seasonsTable.code, id as any);
    return db.select().from(seasonsTable).where(cond).get();
  }

  async getNextSeason(db: DbOrTx, currentSeason: any): Promise<any | undefined> {
    const allSeasons = await db.select().from(seasonsTable).all();
    return allSeasons.find(s => s.startDate >= currentSeason.endDate && s.id !== currentSeason.id);
  }

  async getPendingBankTransactions(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const season = await this.getSeasonById(db, seasonId);
    if (!season) return [];
    return db.select()
      .from(bankStatementLinesTable)
      .where(and(
        gte(bankStatementLinesTable.date, season.startDate),
        lte(bankStatementLinesTable.date, season.endDate),
        eq(bankStatementLinesTable.status, 'pending')
      ))
      .all();
  }

  async getUnresolvedCheckDeposits(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const season = await this.getSeasonById(db, seasonId);
    if (!season) return [];
    return db.select()
      .from(checkDepositsTable)
      .where(and(
        eq(checkDepositsTable.seasonId, season.id),
        inArray(checkDepositsTable.status, ['pending', 'deposited'])
      ))
      .all();
  }

  async getInVaultChecks(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const season = await this.getSeasonById(db, seasonId);
    if (!season) return [];
    const checks = await db.select()
      .from(checksTable)
      .where(and(
        eq(checksTable.seasonId, season.id),
        eq(checksTable.status, 'received')
      ))
      .all();

    const inVaultLedgerEntries = await db.select()
      .from(ledgerEntriesTable)
      .where(and(
        eq(ledgerEntriesTable.seasonId, season.id),
        eq(ledgerEntriesTable.status, 'in_vault')
      ))
      .all();

    return [...checks, ...inVaultLedgerEntries];
  }

  async getPendingDebitTransactions(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const season = await this.getSeasonById(db, seasonId);
    if (!season) return [];
    return db.select()
      .from(ledgerEntriesTable)
      .where(and(
        eq(ledgerEntriesTable.seasonId, season.id),
        eq(ledgerEntriesTable.status, 'pending_debit')
      ))
      .all();
  }

  async getSeasonBalances(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const season = await this.getSeasonById(db, seasonId);
    if (!season) return [];
    return db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, season.id)).all();
  }

  async getTransactionsForSeason(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const season = await this.getSeasonById(db, seasonId);
    if (!season) return [];
    return db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.seasonId, season.id)).all();
  }

  async getAccounts(db: DbOrTx): Promise<any[]> {
    return db.select().from(accountsTable).all();
  }

  async getLatestReconciledBankTransaction(db: DbOrTx, seasonId: number | string, accountId: number): Promise<any | undefined> {
    const season = await this.getSeasonById(db, seasonId);
    if (!season) return undefined;
    const txs = await db.select()
      .from(bankStatementLinesTable)
      .where(and(
        gte(bankStatementLinesTable.date, season.startDate),
        lte(bankStatementLinesTable.date, season.endDate),
        eq(bankStatementLinesTable.accountId, accountId),
        eq(bankStatementLinesTable.status, 'reconciled')
      ))
      .all();
    if (txs.length === 0) return undefined;
    return txs.sort((a, b) => b.date.localeCompare(a.date))[0];
  }

  async getCategoryBudgets(db: DbOrTx, seasonId: number | string): Promise<any[]> {
    const season = await this.getSeasonById(db, seasonId);
    if (!season) return [];
    return db.select().from(seasonCategoryBudgetsTable).where(eq(seasonCategoryBudgetsTable.seasonId, season.id)).all();
  }


  async closeSeasonWithRollover(
    db: Db,
    seasonIdInput: number | string,
    nextSeasonId: number | null,
    balancesToRollover: { accountId: number; finalBalanceCents: number }[],
    copyBudgets: boolean
  ): Promise<any> {
    const season = await this.getSeasonById(db, seasonIdInput);
    if (!season) throw new Error('Saison introuvable');
    const sId = season.id;
    const now = new Date();

    const statements: any[] = [];
    const rolledOver: { accountId: number; accountCode: string; initialBalanceCents: number }[] = [];
    let budgetsCopiedCount = 0;

    // 1. Rollover balances to next season if next season exists (INSERT ... ON CONFLICT DO UPDATE)
    if (nextSeasonId) {
      const dbAccounts = await this.getAccounts(db);
      for (const b of balancesToRollover) {
        const acc = dbAccounts.find(a => a.id === b.accountId);
        const accCode = acc ? acc.code : String(b.accountId);

        statements.push(
          db.insert(seasonBalancesTable).values({
            seasonId: nextSeasonId,
            accountId: b.accountId,
            initialBalanceCents: b.finalBalanceCents,
            createdAt: now
          }).onConflictDoUpdate({
            target: [seasonBalancesTable.seasonId, seasonBalancesTable.accountId],
            set: { initialBalanceCents: b.finalBalanceCents }
          })
        );

        rolledOver.push({
          accountId: b.accountId,
          accountCode: accCode,
          initialBalanceCents: b.finalBalanceCents
        });
      }

      // 2. Copy budgets if requested (INSERT ... ON CONFLICT DO UPDATE)
      if (copyBudgets) {
        const currentBudgets = await this.getCategoryBudgets(db, sId);

        for (const cb of currentBudgets) {
          statements.push(
            db.insert(seasonCategoryBudgetsTable).values({
              seasonId: nextSeasonId,
              categoryId: cb.categoryId,
              type: cb.type,
              amountCents: cb.amountCents ?? 0,
              createdAt: now
            }).onConflictDoUpdate({
              target: [seasonCategoryBudgetsTable.seasonId, seasonCategoryBudgetsTable.categoryId, seasonCategoryBudgetsTable.type],
              set: { amountCents: cb.amountCents ?? 0 }
            })
          );
          budgetsCopiedCount++;
        }
      }
    }

    // 3. Close current season (LAST: act of commit)
    statements.push(
      db.update(seasonsTable)
        .set({ closedAt: now })
        .where(eq(seasonsTable.id, sId))
    );

    // Group all statements in a single batch
    await db.batch(statements as any);

    const updatedSeason = await this.getSeasonById(db, sId);

    return {
      season: updatedSeason,
      rolledOverBalances: rolledOver,
      nextSeasonId,
      budgetsCopied: budgetsCopiedCount
    };
  }

  async reopenSeason(db: Db, seasonIdInput: number | string, nextSeasonId: number | null): Promise<any> {
    const season = await this.getSeasonById(db, seasonIdInput);
    if (!season) throw new Error('Saison introuvable');
    const sId = season.id;

    // 1. Reopen season
    const updatedSeason = await db.update(seasonsTable)
      .set({ closedAt: null })
      .where(eq(seasonsTable.id, sId))
      .returning()
      .get();


    // 2. Clear or reset rolled over initial balances on next season if it exists
    let cancelledRolloverCount = 0;
    if (nextSeasonId) {
      const nextBal = await db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, nextSeasonId)).all();
      cancelledRolloverCount = nextBal.length;
    }

    return {
      season: updatedSeason,
      cancelledRolloverCount
    };
  }
}
