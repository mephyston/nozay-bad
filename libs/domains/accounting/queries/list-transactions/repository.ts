import { type DbOrTx } from '@metacult/shared-db';
import { and, or, eq, sql, inArray, isNull, desc } from 'drizzle-orm';
import { transactionsTable, categoriesTable } from '../../shared/schema';
import { getMembersByIds } from '@metacult/features-members-api';
import type { ListTransactionsFilters } from './dto';

export class ListTransactionsRepository {
  private buildConditions(filters: ListTransactionsFilters) {
    const conditions = [];
    if (filters.seasonId) {
      conditions.push(eq(transactionsTable.seasonId, filters.seasonId));
    }
    if (filters.accountId) {
      conditions.push(or(eq(transactionsTable.accountId, filters.accountId as any), eq(transactionsTable.destinationAccountId, filters.accountId as any)) as any);
    }
    if (filters.type) {
      conditions.push(eq(transactionsTable.type, filters.type as any));
    }
    if (filters.category) {
      conditions.push(eq(transactionsTable.category, parseInt(filters.category)));
    }
    if (filters.memberId) {
      conditions.push(eq(transactionsTable.memberId, parseInt(filters.memberId)));
    }
    if (filters.unreconciledChequesOnly) {
      conditions.push(
        eq(transactionsTable.paymentMethod, 'cheque'),
        isNull(transactionsTable.bankTransactionId)
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
        conditions.push(inArray(transactionsTable.category, catIds));
      } else {
        conditions.push(sql`1 = 0`);
      }
    }
    const countRes = await db.select({ count: sql<number>`count(*)` })
      .from(transactionsTable)
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
        conditions.push(inArray(transactionsTable.category, catIds));
      } else {
        conditions.push(sql`1 = 0`);
      }
    }
    const txs = await db.select({
      id: transactionsTable.id,
      seasonId: transactionsTable.seasonId,
      type: transactionsTable.type,
      accountId: transactionsTable.accountId,
      destinationAccountId: transactionsTable.destinationAccountId,
      category: transactionsTable.category,
      amount: transactionsTable.amount,
      date: transactionsTable.date,
      paymentMethod: transactionsTable.paymentMethod,
      description: transactionsTable.description,
      reference: transactionsTable.reference,
      memberId: transactionsTable.memberId,
      bankTransactionId: transactionsTable.bankTransactionId
    })
      .from(transactionsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(transactionsTable.date), desc(transactionsTable.id))
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
