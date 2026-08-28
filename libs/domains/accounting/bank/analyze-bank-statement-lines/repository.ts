import { seasonsTable } from '@nba/accounting/schema';
import { categoriesTable, ledgerEntriesTable } from '@nba/accounting/schema';
import { and, eq, desc, sql, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { bankStatementLinesTable } from '../../shared/schema';
import { getMembersBySeason, getMembersByIds } from '@nba/members-api';

export class AnalyzeBankStatementLinesRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }

  /** Code de la saison analysée (« 25-26 »), pour le comparer à celle citée dans un libellé. */
  async getSeasonCode(db: DbOrTx, seasonIdOrCode: string | number): Promise<string | null> {
    const id = await this.resolveSeasonId(db, seasonIdOrCode);
    const row = await db.select({ code: seasonsTable.code }).from(seasonsTable).where(eq(seasonsTable.id, id)).get();
    return row?.code ?? null;
  }

  /** Les exercices avec leurs bornes, du plus ancien au plus récent. Trois lignes, une lecture. */
  async getSeasonsOrdered(db: DbOrTx): Promise<{ code: string; startDate: string; endDate: string }[]> {
    return db.select({
        code: seasonsTable.code,
        startDate: seasonsTable.startDate,
        endDate: seasonsTable.endDate
      })
      .from(seasonsTable)
      .orderBy(seasonsTable.startDate)
      .all();
  }

  async getCategories(db: DbOrTx): Promise<(typeof categoriesTable.$inferSelect)[]> {
    return db.select().from(categoriesTable).all();
  }

  async getPendingTransactions(db: DbOrTx, seasonId?: string, singleId?: number): Promise<(typeof bankStatementLinesTable.$inferSelect)[]> {
    const conditions = [
      eq(bankStatementLinesTable.status, 'pending')
    ];
    if (singleId) {
      conditions.push(eq(bankStatementLinesTable.id, singleId));
    }
    return db.select().from(bankStatementLinesTable).where(and(...conditions)).all();
  }

  async getMembersBySeason(db: DbOrTx, seasonId: string): Promise<any[]> {
    return getMembersBySeason(db, seasonId);
  }

  async getPastReconciledTransactions(db: DbOrTx): Promise<any[]> {
    const txs = await db.select({
      fitid: bankStatementLinesTable.fitid,
      name: bankStatementLinesTable.name,
      memo: bankStatementLinesTable.memo,
      amountCents: bankStatementLinesTable.amountCents,
      categoryId: ledgerEntriesTable.categoryId,
      memberId: ledgerEntriesTable.memberId
    })
      .from(bankStatementLinesTable)
      .innerJoin(ledgerEntriesTable, eq(ledgerEntriesTable.bankStatementLineId, bankStatementLinesTable.id))
      .where(eq(bankStatementLinesTable.status, 'reconciled'))
      .orderBy(desc(bankStatementLinesTable.id))
      .limit(20)
      .all();

    const memberIds = Array.from(new Set(txs.map((t) => t.memberId).filter((id) => id !== null))) as number[];
    const members = memberIds.length > 0 ? await getMembersByIds(db, memberIds) : [];
    const membersMap = new Map(members.map((m) => [m.id, m]));

    return txs.map((t) => {
      const m = t.memberId ? membersMap.get(t.memberId) : null;
      return {
        fitid: t.fitid,
        name: t.name,
        memo: t.memo,
        amountCents: t.amountCents,
        categoryId: t.categoryId,
        memberLastName: m ? m.lastName : null,
        memberFirstName: m ? m.firstName : null
      };
    });
  }

  async getActiveProducts(db: DbOrTx): Promise<any[]> {
    try {
      return await db.all(sql`
        SELECT id, name, category, price, stock, active, created_at as createdAt 
        FROM products WHERE active = 1
      `);
    } catch {
      return [];
    }
  }

  /** Relit un lot de lignes, une fois leurs suggestions écrites. */
  async getLinesByIds(db: DbOrTx, ids: number[]): Promise<(typeof bankStatementLinesTable.$inferSelect)[]> {
    if (ids.length === 0) return [];
    return db.select().from(bankStatementLinesTable).where(inArray(bankStatementLinesTable.id, ids)).all();
  }

  async updateAISuggestions(db: DbOrTx, id: number, suggestions: any): Promise<void> {
    await db.update(bankStatementLinesTable)
      .set({ aiSuggestions: JSON.stringify(suggestions) })
      .where(eq(bankStatementLinesTable.id, id))
      .run();
  }
}
