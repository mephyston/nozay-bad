import { and, or, eq, ne, sql, inArray, isNull, desc } from 'drizzle-orm';
import {
  transactionsTable,
  bankTransactionsTable,
  categoriesTable,
} from '../data-access/src/schema';
import { membersTable } from '@metacult/features-members-data-access';

export class TransactionsRepository {
  private buildConditions(filters: {
    seasonId?: string;
    accountId?: string;
    type?: string;
    category?: string;
    classCode?: string;
    memberId?: string;
    unreconciledChequesOnly?: boolean;
  }) {
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

  async count(db: any, filters: any): Promise<number> {
    const conditions = this.buildConditions(filters);
    if (filters.classCode) {
      const matchingCats = await db.select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(or(eq(categoriesTable.receiptCode, filters.classCode), eq(categoriesTable.expenseCode, filters.classCode)))
        .all();
      const catIds = matchingCats.map((cat: any) => cat.id);
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

  async list(db: any, filters: any, pagination: { limit: number; offset: number }): Promise<any[]> {
    const conditions = this.buildConditions(filters);
    if (filters.classCode) {
      const matchingCats = await db.select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(or(eq(categoriesTable.receiptCode, filters.classCode), eq(categoriesTable.expenseCode, filters.classCode)))
        .all();
      const catIds = matchingCats.map((cat: any) => cat.id);
      if (catIds.length > 0) {
        conditions.push(inArray(transactionsTable.category, catIds));
      } else {
        conditions.push(sql`1 = 0`);
      }
    }
    return db.select({
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
      bankTransactionId: transactionsTable.bankTransactionId,
      memberName: sql<string | null>`members.last_name || ' ' || members.first_name`,
      memberLicence: sql<string | null>`members.licence`
    })
      .from(transactionsTable)
      .leftJoin(membersTable, eq(transactionsTable.memberId, membersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(transactionsTable.date), desc(transactionsTable.id))
      .limit(pagination.limit)
      .offset(pagination.offset)
      .all();
  }

  async getById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).get();
  }

  async create(db: any, values: any): Promise<any> {
    return db.insert(transactionsTable).values(values).returning().get();
  }

  async update(db: any, id: number, values: any): Promise<any | undefined> {
    return db.update(transactionsTable).set(values).where(eq(transactionsTable.id, id)).returning().get();
  }

  async delete(db: any, id: number): Promise<void> {
    await db.delete(transactionsTable).where(eq(transactionsTable.id, id)).run();
  }

  async getBankTransactionById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(bankTransactionsTable).where(eq(bankTransactionsTable.id, id)).get();
  }

  async getRemainingTransactionsForBankTx(db: any, bankTxId: number, excludeTxId: number): Promise<any[]> {
    return db.select()
      .from(transactionsTable)
      .where(and(
        eq(transactionsTable.bankTransactionId, bankTxId),
        ne(transactionsTable.id, excludeTxId)
      ))
      .all();
  }

  async updateBankTransactionStatus(db: any, id: number, status: string): Promise<void> {
    await db.update(bankTransactionsTable).set({ status }).where(eq(bankTransactionsTable.id, id)).run();
  }

  async getMemberById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(membersTable).where(eq(membersTable.id, id)).get();
  }

  async updateMemberPayment(db: any, id: number, values: any): Promise<void> {
    await db.update(membersTable).set(values).where(eq(membersTable.id, id)).run();
  }

  async resetExpenseStatusByTxId(db: any, txId: number): Promise<void> {
    await db.run(sql`
      UPDATE expenses SET status = 'pending', transaction_id = NULL WHERE transaction_id = ${txId}
    `);
  }
}
