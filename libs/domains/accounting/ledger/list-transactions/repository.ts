import { type DbOrTx } from '@nba/db';
import { and, or, eq, sql, inArray, isNull, desc } from 'drizzle-orm';
import { ledgerEntriesTable, categoriesTable } from '../../shared/schema';
import { getMembersByIds } from '@nba/members-api';
import type { ListTransactionsFilters } from './dto';

export class ListTransactionsRepository {
  private buildConditions(filters: ListTransactionsFilters) {
    const conditions = [];
    if (filters.seasonId) {
      conditions.push(eq(ledgerEntriesTable.seasonId, filters.seasonId));
    }
    if (filters.accountId) {
      conditions.push(or(eq(ledgerEntriesTable.accountId, filters.accountId as any), eq(ledgerEntriesTable.destinationAccountId, filters.accountId as any)) as any);
    }
    if (filters.type) {
      conditions.push(eq(ledgerEntriesTable.type, filters.type as any));
    }
    if (filters.category) {
      conditions.push(eq(ledgerEntriesTable.category, parseInt(filters.category)));
    }
    if (filters.memberId) {
      conditions.push(eq(ledgerEntriesTable.memberId, parseInt(filters.memberId)));
    }
    if (filters.unreconciledChequesOnly) {
      conditions.push(
        eq(ledgerEntriesTable.paymentMethod, 'cheque'),
        isNull(ledgerEntriesTable.bankStatementLineId)
      );
    }
    return conditions;
  }

  async count(db: DbOrTx, filters: ListTransactionsFilters): Promise<number> {
    const conditions = this.buildConditions(filters);
    if (filters.classCode) {
      const matchingCats = await db.select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(or(eq(categoriesTable.receiptCode, filters.classCode), eq(categoriesTable.expenseCode, filters.classCode)))
        .all();
      const catIds = matchingCats.map((cat) => cat.id);
      if (catIds.length > 0) {
        conditions.push(inArray(ledgerEntriesTable.category, catIds));
      } else {
        conditions.push(sql`1 = 0`);
      }
    }
    const countRes = await db.select({ count: sql<number>`count(*)` })
      .from(ledgerEntriesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .get();
    return countRes?.count || 0;
  }

  async list(db: DbOrTx, filters: ListTransactionsFilters, pagination: { limit: number; offset: number }): Promise<any[]> {
    const conditions = this.buildConditions(filters);
    if (filters.classCode) {
      const matchingCats = await db.select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(or(eq(categoriesTable.receiptCode, filters.classCode), eq(categoriesTable.expenseCode, filters.classCode)))
        .all();
      const catIds = matchingCats.map((cat) => cat.id);
      if (catIds.length > 0) {
        conditions.push(inArray(ledgerEntriesTable.category, catIds));
      } else {
        conditions.push(sql`1 = 0`);
      }
    }
    const txs = await db.select({
      id: ledgerEntriesTable.id,
      seasonId: ledgerEntriesTable.seasonId,
      type: ledgerEntriesTable.type,
      accountId: ledgerEntriesTable.accountId,
      destinationAccountId: ledgerEntriesTable.destinationAccountId,
      category: ledgerEntriesTable.category,
      amount: ledgerEntriesTable.amount,
      date: ledgerEntriesTable.date,
      paymentMethod: ledgerEntriesTable.paymentMethod,
      description: ledgerEntriesTable.description,
      reference: ledgerEntriesTable.reference,
      memberId: ledgerEntriesTable.memberId,
      bankStatementLineId: ledgerEntriesTable.bankStatementLineId
    })
      .from(ledgerEntriesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ledgerEntriesTable.date), desc(ledgerEntriesTable.id))
      .limit(pagination.limit)
      .offset(pagination.offset)
      .all();

    const memberIds = Array.from(new Set(txs.map((t) => t.memberId).filter((id) => id !== null))) as number[];
    const members = await getMembersByIds(db, memberIds);
    const membersMap = new Map(members.map((m) => [m.id, m]));

    return txs.map((t) => {
      const m = t.memberId ? membersMap.get(t.memberId) : null;
      return {
        ...t,
        memberName: m ? `${m.lastName} ${m.firstName}` : null,
        memberLicence: m ? m.licence : null
      };
    });
  }
}
