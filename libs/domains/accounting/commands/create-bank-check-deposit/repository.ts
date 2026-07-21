import { eq, inArray } from 'drizzle-orm';
import { checksTable, checkDepositsTable, bankTransactionsTable } from '../../shared/schema';

export class CreateBankCheckDepositRepository {
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
