import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import {
  buvetteCardAttemptsTable,
  buvetteCardMovementsTable,
  buvetteSaleLinesTable,
  buvetteSalesTable,
  buvetteSessionClosuresTable,
  buvetteSessionsTable
} from '../shared/schema';

const paid = sql`${buvetteSalesTable.status} = 'paid'`;

export class SessionHistoryRepository {
  sessions(db: DbOrTx, limit: number, sessionId?: number) {
    return db
      .select({
        id: buvetteSessionsTable.id,
        businessDate: buvetteSessionsTable.businessDate,
        status: buvetteSessionsTable.status,
        accountingCategoryId: buvetteSessionsTable.accountingCategoryId,
        openedByEmail: buvetteSessionsTable.openedByEmail,
        openingFloatCents: buvetteSessionsTable.openingFloatCents,
        closedByEmail: buvetteSessionClosuresTable.closedByEmail,
        countedCashCents: buvetteSessionClosuresTable.countedCashCents,
        gapCents: buvetteSessionClosuresTable.gapCents
      })
      .from(buvetteSessionsTable)
      .leftJoin(buvetteSessionClosuresTable, eq(buvetteSessionClosuresTable.sessionId, buvetteSessionsTable.id))
      .where(sessionId ? eq(buvetteSessionsTable.id, sessionId) : undefined)
      .orderBy(desc(buvetteSessionsTable.id))
      .limit(limit)
      .all();
  }

  /** Les totaux des ventes payées, par session. */
  salesTotals(db: DbOrTx, sessionIds: number[]) {
    return db
      .select({
        sessionId: buvetteSalesTable.sessionId,
        salesCount: sql<number>`COUNT(*)`,
        itemsCents: sql<number>`COALESCE(SUM(${buvetteSalesTable.itemsCents}), 0)`,
        rechargeCents: sql<number>`COALESCE(SUM(${buvetteSalesTable.rechargeCents}), 0)`,
        cashCents: sql<number>`COALESCE(SUM(${buvetteSalesTable.cashCents}), 0)`,
        cardCents: sql<number>`COALESCE(SUM(${buvetteSalesTable.cardCents}), 0)`,
        prepaidCents: sql<number>`COALESCE(SUM(${buvetteSalesTable.prepaidCents}), 0)`
      })
      .from(buvetteSalesTable)
      .where(and(inArray(buvetteSalesTable.sessionId, sessionIds), paid))
      .groupBy(buvetteSalesTable.sessionId)
      .all();
  }

  /** Les soldes de carte rendus, en espèces ou sur CB, par session. */
  refundTotals(db: DbOrTx, sessionIds: number[]) {
    return db
      .select({
        sessionId: buvetteCardMovementsTable.sessionId,
        cash: sql<number>`COALESCE(SUM(CASE WHEN ${buvetteCardMovementsTable.sumupAttemptId} IS NULL THEN -${buvetteCardMovementsTable.amountCents} END), 0)`,
        card: sql<number>`COALESCE(SUM(CASE WHEN ${buvetteCardMovementsTable.sumupAttemptId} IS NOT NULL THEN -${buvetteCardMovementsTable.amountCents} END), 0)`
      })
      .from(buvetteCardMovementsTable)
      .where(and(inArray(buvetteCardMovementsTable.sessionId, sessionIds), eq(buvetteCardMovementsTable.type, 'refund'), isNull(buvetteCardMovementsTable.saleId)))
      .groupBy(buvetteCardMovementsTable.sessionId)
      .all();
  }

  sales(db: DbOrTx, sessionId: number) {
    return db
      .select({
        id: buvetteSalesTable.id,
        status: buvetteSalesTable.status,
        createdAt: buvetteSalesTable.createdAt,
        createdByEmail: buvetteSalesTable.createdByEmail,
        itemsCents: buvetteSalesTable.itemsCents,
        rechargeCents: buvetteSalesTable.rechargeCents,
        prepaidCents: buvetteSalesTable.prepaidCents,
        cashCents: buvetteSalesTable.cashCents,
        cardCents: buvetteSalesTable.cardCents,
        transactionCode: sql<string | null>`(SELECT ${buvetteCardAttemptsTable.transactionCode} FROM ${buvetteCardAttemptsTable} WHERE ${buvetteCardAttemptsTable.saleId} = ${buvetteSalesTable.id} AND ${buvetteCardAttemptsTable.status} = 'successful' LIMIT 1)`
      })
      .from(buvetteSalesTable)
      .where(eq(buvetteSalesTable.sessionId, sessionId))
      .orderBy(desc(buvetteSalesTable.id))
      .all();
  }

  lines(db: DbOrTx, saleIds: number[]) {
    return db
      .select({ saleId: buvetteSaleLinesTable.saleId, name: buvetteSaleLinesTable.name, quantity: buvetteSaleLinesTable.quantity, unitPriceCents: buvetteSaleLinesTable.unitPriceCents })
      .from(buvetteSaleLinesTable)
      .where(inArray(buvetteSaleLinesTable.saleId, saleIds))
      .all();
  }

  cardRefunds(db: DbOrTx, sessionId: number) {
    return db
      .select({
        id: buvetteCardMovementsTable.id,
        createdAt: buvetteCardMovementsTable.createdAt,
        amountCents: buvetteCardMovementsTable.amountCents,
        sumupAttemptId: buvetteCardMovementsTable.sumupAttemptId,
        createdByEmail: buvetteCardMovementsTable.createdByEmail
      })
      .from(buvetteCardMovementsTable)
      .where(and(eq(buvetteCardMovementsTable.sessionId, sessionId), eq(buvetteCardMovementsTable.type, 'refund'), isNull(buvetteCardMovementsTable.saleId)))
      .orderBy(desc(buvetteCardMovementsTable.id))
      .all();
  }

  /** Les ventes payées par article, une session ou toutes : le nom figé à la vente fait foi. */
  itemsReport(db: DbOrTx, sessionId?: number) {
    return db
      .select({
        name: buvetteSaleLinesTable.name,
        quantity: sql<number>`SUM(${buvetteSaleLinesTable.quantity})`,
        amountCents: sql<number>`SUM(${buvetteSaleLinesTable.quantity} * ${buvetteSaleLinesTable.unitPriceCents})`
      })
      .from(buvetteSaleLinesTable)
      .innerJoin(buvetteSalesTable, eq(buvetteSaleLinesTable.saleId, buvetteSalesTable.id))
      .where(and(paid, sessionId ? eq(buvetteSalesTable.sessionId, sessionId) : undefined))
      .groupBy(buvetteSaleLinesTable.name)
      .orderBy(desc(sql`SUM(${buvetteSaleLinesTable.quantity})`))
      .all();
  }
}
