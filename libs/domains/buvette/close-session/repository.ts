import { and, asc, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  buvetteCardMovementsTable,
  buvetteSaleLinesTable,
  buvetteSalesTable,
  buvetteSessionClosuresTable,
  buvetteSessionsTable
} from '../shared/schema';
import type { ClosingSale } from '../shared/closing';

export interface SessionFingerprint {
  paidSales: number;
  movements: number;
}

export class CloseSessionRepository {
  getSession(db: DbOrTx, id: number) {
    return db.select().from(buvetteSessionsTable).where(eq(buvetteSessionsTable.id, id)).get();
  }

  async paidSales(db: DbOrTx, sessionId: number): Promise<ClosingSale[]> {
    const sales = await db.select().from(buvetteSalesTable)
      .where(and(eq(buvetteSalesTable.sessionId, sessionId), eq(buvetteSalesTable.status, 'paid')))
      .all();
    const lines = await db
      .select({
        saleId: buvetteSaleLinesTable.saleId,
        accountingCategoryId: buvetteSaleLinesTable.accountingCategoryId,
        amountCents: sql<number>`${buvetteSaleLinesTable.unitPriceCents} * ${buvetteSaleLinesTable.quantity}`
      })
      .from(buvetteSaleLinesTable)
      .innerJoin(buvetteSalesTable, eq(buvetteSaleLinesTable.saleId, buvetteSalesTable.id))
      .where(and(eq(buvetteSalesTable.sessionId, sessionId), eq(buvetteSalesTable.status, 'paid')))
      .orderBy(asc(buvetteSaleLinesTable.id))
      .all();
    return sales.map((sale) => ({
      prepaidCents: sale.prepaidCents,
      cashCents: sale.cashCents,
      cardCents: sale.cardCents,
      rechargeCents: sale.rechargeCents,
      lines: lines.filter((l) => l.saleId === sale.id).map((l) => ({
        accountingCategoryId: l.accountingCategoryId,
        amountCents: Number(l.amountCents)
      }))
    }));
  }

  async inProgressCount(db: DbOrTx, sessionId: number): Promise<number> {
    const row = await db.select({ total: sql<number>`COUNT(*)` }).from(buvetteSalesTable)
      .where(and(eq(buvetteSalesTable.sessionId, sessionId), eq(buvetteSalesTable.status, 'in_progress')))
      .get();
    return Number(row?.total ?? 0);
  }

  async refundsCents(db: DbOrTx, sessionId: number): Promise<number> {
    const row = await db
      .select({ total: sql<number>`COALESCE(SUM(-${buvetteCardMovementsTable.amountCents}), 0)` })
      .from(buvetteCardMovementsTable)
      .where(and(eq(buvetteCardMovementsTable.sessionId, sessionId), eq(buvetteCardMovementsTable.type, 'refund')))
      .get();
    return Number(row?.total ?? 0);
  }

  /** Ce qui bouge dès qu'une vente, une annulation ou un remboursement a lieu dans la session. */
  async fingerprint(db: DbOrTx, sessionId: number): Promise<SessionFingerprint> {
    const row = await db
      .select({
        paidSales: sql<number>`(SELECT COUNT(*) FROM ${buvetteSalesTable} WHERE ${buvetteSalesTable.sessionId} = ${sessionId} AND ${buvetteSalesTable.status} <> 'cancelled')`,
        movements: sql<number>`(SELECT COUNT(*) FROM ${buvetteCardMovementsTable} WHERE ${buvetteCardMovementsTable.sessionId} = ${sessionId})`
      })
      .from(buvetteSessionsTable)
      .where(eq(buvetteSessionsTable.id, sessionId))
      .get();
    return { paidSales: Number(row?.paidSales ?? 0), movements: Number(row?.movements ?? 0) };
  }

  /**
   * La clôture ne vaut que pour ce qui a été lu. Si une écriture de la session est passée entre
   * la lecture et ce lot, le CASE rend NULL, le NOT NULL échoue et rien n'est posé en comptabilité.
   */
  buildClosureStatement(db: DbOrTx, seen: SessionFingerprint, values: typeof buvetteSessionClosuresTable.$inferInsert): any {
    const { sessionId, expectedCashCents } = values;
    return db.insert(buvetteSessionClosuresTable).values({
      ...values,
      expectedCashCents: sql`CASE WHEN
        (SELECT COUNT(*) FROM ${buvetteSalesTable} WHERE ${buvetteSalesTable.sessionId} = ${sessionId} AND ${buvetteSalesTable.status} <> 'cancelled') = ${seen.paidSales}
        AND (SELECT COUNT(*) FROM ${buvetteCardMovementsTable} WHERE ${buvetteCardMovementsTable.sessionId} = ${sessionId}) = ${seen.movements}
        THEN ${expectedCashCents} END` as any
    });
  }

  buildCloseStatement(db: DbOrTx, sessionId: number): any {
    return db.update(buvetteSessionsTable).set({ status: 'closed' }).where(eq(buvetteSessionsTable.id, sessionId));
  }
}
