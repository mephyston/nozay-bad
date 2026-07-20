import { and, eq, inArray, desc, sql } from 'drizzle-orm';
import {
  transactionsTable,
  bankTransactionsTable,
  checksTable,
  checkDepositsTable,
} from '../data-access/src/schema';
import { getAllMembers, getMembersByIds, getMemberById } from '@metacult/features-members-api';

export class ChecksRepository {
  async getAllMembers(db: any): Promise<any[]> {
    return getAllMembers(db);
  }

  async listChecks(db: any, seasonId: string, status?: string): Promise<any[]> {
    const conditions = [eq(checksTable.seasonId, seasonId)];
    if (status) {
      conditions.push(eq(checksTable.status, status as any));
    }
    const checks = await db.select({
      id: checksTable.id,
      checkDepositId: checksTable.checkDepositId,
      seasonId: checksTable.seasonId,
      number: checksTable.number,
      amount: checksTable.amount,
      emitter: checksTable.emitter,
      bank: checksTable.bank,
      memberId: checksTable.memberId,
      transactionId: checksTable.transactionId,
      status: checksTable.status,
      photoUrl: checksTable.photoUrl,
      createdAt: checksTable.createdAt
    })
      .from(checksTable)
      .where(and(...conditions))
      .orderBy(desc(checksTable.createdAt))
      .all();

    const memberIds = Array.from(new Set(checks.map((c: any) => c.memberId).filter((id: any) => id !== null))) as number[];
    const members = await getMembersByIds(db, memberIds);
    const membersMap = new Map(members.map((m: any) => [m.id, m]));

    return checks.map((c: any) => {
      const m = c.memberId ? membersMap.get(c.memberId) : null;
      return {
        ...c,
        memberName: m ? `${m.lastName} ${m.firstName}` : null,
        memberLicence: m ? m.licence : null
      };
    });
  }

  async createTransaction(db: any, values: any): Promise<any> {
    return db.insert(transactionsTable).values(values).returning().get();
  }

  async createCheck(db: any, values: any): Promise<any> {
    return db.insert(checksTable).values(values).returning().get();
  }

  async getMemberById(db: any, id: number): Promise<any | undefined> {
    return getMemberById(db, id);
  }

  async getCheckById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(checksTable).where(eq(checksTable.id, id)).get();
  }

  async getTransactionById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).get();
  }

  async unlinkCheckTransaction(db: any, id: number): Promise<void> {
    await db.update(checksTable).set({ transactionId: null }).where(eq(checksTable.id, id)).run();
  }

  async deleteTransaction(db: any, id: number): Promise<void> {
    await db.delete(transactionsTable).where(eq(transactionsTable.id, id)).run();
  }

  async deleteCheck(db: any, id: number): Promise<void> {
    await db.delete(checksTable).where(eq(checksTable.id, id)).run();
  }

  async getChecksByIds(db: any, ids: number[]): Promise<any[]> {
    if (ids.length === 0) return [];
    return db.select().from(checksTable).where(inArray(checksTable.id, ids)).all();
  }

  async createCheckDeposit(db: any, values: any): Promise<any> {
    return db.insert(checkDepositsTable).values(values).returning().get();
  }

  async updateChecksDeposit(db: any, checkIds: number[], depositId: number | null, status: string): Promise<void> {
    await db.update(checksTable)
      .set({ checkDepositId: depositId, status: status as any })
      .where(inArray(checksTable.id, checkIds))
      .run();
  }

  async listCheckDeposits(db: any, seasonId: string): Promise<any[]> {
    return db.select()
      .from(checkDepositsTable)
      .where(eq(checkDepositsTable.seasonId, seasonId))
      .orderBy(desc(checkDepositsTable.date), desc(checkDepositsTable.id))
      .all();
  }

  async getCheckDepositById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(checkDepositsTable).where(eq(checkDepositsTable.id, id)).get();
  }

  async updateCheckDeposit(db: any, id: number, values: any): Promise<void> {
    await db.update(checkDepositsTable).set(values).where(eq(checkDepositsTable.id, id)).run();
  }

  async updateBankTransactionStatus(db: any, id: number, status: string): Promise<void> {
    await db.update(bankTransactionsTable).set({ status: status as any }).where(eq(bankTransactionsTable.id, id)).run();
  }

  async unlinkChecksForDeposit(db: any, depositId: number): Promise<void> {
    await db.update(checksTable)
      .set({ checkDepositId: null, status: 'received' })
      .where(eq(checksTable.checkDepositId, depositId))
      .run();
  }

  async deleteCheckDeposit(db: any, id: number): Promise<void> {
    await db.delete(checkDepositsTable).where(eq(checkDepositsTable.id, id)).run();
  }
}
