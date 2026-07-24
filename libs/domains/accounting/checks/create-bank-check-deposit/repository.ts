import { type DbOrTx } from '@nba/db';
import { eq, inArray } from 'drizzle-orm';
import { checksTable, checkDepositsTable, bankStatementLinesTable, seasonsTable } from '../../shared/schema';

export class CreateBankCheckDepositRepository {
  async resolveSeasonId(db: DbOrTx, seasonIdOrCode: string | number): Promise<number> {
    if (typeof seasonIdOrCode === 'number') return seasonIdOrCode;
    const num = Number(seasonIdOrCode);
    if (!isNaN(num)) return num;
    const row = await db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, seasonIdOrCode)).get();
    return row?.id || 1;
  }
  async getChecksByIds(db: DbOrTx, ids: number[]): Promise<any[]> {
    if (ids.length === 0) return [];
    return db.select().from(checksTable).where(inArray(checksTable.id, ids)).all();
  }

  buildCreateCheckDepositStatement(db: DbOrTx, values: any): any {
    return db.insert(checkDepositsTable).values({
      seasonId: typeof values.seasonId === 'number' ? values.seasonId : Number(values.seasonId),
      reference: values.reference,
      date: values.date,
      amountCents: values.amountCents ?? (values.amount !== undefined ? Math.round(values.amount) : 0),
      status: values.status || 'deposited',
      createdAt: values.createdAt || new Date()
    });
  }

  buildUpdateChecksDepositStatement(db: DbOrTx, checkIds: number[], depositId: any, status: string): any {
    return db.update(checksTable)
      .set({ checkDepositId: depositId, status: status as any })
      .where(inArray(checksTable.id, checkIds));
  }

  buildUpdateCheckDepositStatement(db: DbOrTx, id: number, values: any): any {
    return db.update(checkDepositsTable).set(values).where(eq(checkDepositsTable.id, id));
  }

  buildUpdateBankStatementLineStatusStatement(db: DbOrTx, id: number, status: string): any {
    return db.update(bankStatementLinesTable).set({ status: status as any }).where(eq(bankStatementLinesTable.id, id));
  }

  buildUnlinkChecksForDepositStatement(db: DbOrTx, depositId: number): any {
    return db.update(checksTable)
      .set({ checkDepositId: null, status: 'received' })
      .where(eq(checksTable.checkDepositId, depositId));
  }

  buildDeleteCheckDepositStatement(db: DbOrTx, id: number): any {
    return db.delete(checkDepositsTable).where(eq(checkDepositsTable.id, id));
  }

  async createCheckDeposit(db: DbOrTx, values: any): Promise<any> {
    return db.insert(checkDepositsTable).values({
      seasonId: typeof values.seasonId === 'number' ? values.seasonId : Number(values.seasonId),
      reference: values.reference,
      date: values.date,
      amountCents: values.amountCents ?? (values.amount !== undefined ? Math.round(values.amount) : 0),
      status: values.status || 'deposited',
      createdAt: values.createdAt || new Date()
    }).returning().get();
  }

  async updateChecksDeposit(db: DbOrTx, checkIds: number[], depositId: number | null, status: string): Promise<void> {
    await db.update(checksTable)
      .set({ checkDepositId: depositId, status: status as any })
      .where(inArray(checksTable.id, checkIds))
      .run();
  }

  async getCheckDepositById(db: DbOrTx, id: number): Promise<any | undefined> {
    const dep = await db.select().from(checkDepositsTable).where(eq(checkDepositsTable.id, id)).get();
    if (!dep) return undefined;
    return {
      ...dep,
      amount: dep.amountCents
    };
  }

  async updateCheckDeposit(db: DbOrTx, id: number, values: any): Promise<void> {
    await db.update(checkDepositsTable).set(values).where(eq(checkDepositsTable.id, id)).run();
  }

  async updateBankStatementLineStatus(db: DbOrTx, id: number, status: string): Promise<void> {
    await db.update(bankStatementLinesTable).set({ status: status as any }).where(eq(bankStatementLinesTable.id, id)).run();
  }

  async unlinkChecksForDeposit(db: DbOrTx, depositId: number): Promise<void> {
    await db.update(checksTable)
      .set({ checkDepositId: null, status: 'received' })
      .where(eq(checksTable.checkDepositId, depositId))
      .run();
  }

  async deleteCheckDeposit(db: DbOrTx, id: number): Promise<void> {
    await db.delete(checkDepositsTable).where(eq(checkDepositsTable.id, id)).run();
  }
}
