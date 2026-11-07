import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardAttemptsTable, buvetteCardMovementsTable, buvetteCardsTable, buvetteOrdersTable, buvetteSalesTable } from '../shared/schema';
import type { BuvetteCardAttempt, BuvetteSale } from '../shared/schema';

export class CardAttemptRepository {
  findByForeignId(db: DbOrTx, foreignTxId: string) {
    return db.select().from(buvetteCardAttemptsTable).where(eq(buvetteCardAttemptsTable.foreignTxId, foreignTxId)).get();
  }

  getSale(db: DbOrTx, id: number) {
    return db.select().from(buvetteSalesTable).where(eq(buvetteSalesTable.id, id)).get();
  }

  listForSale(db: DbOrTx, saleId: number) {
    return db.select().from(buvetteCardAttemptsTable).where(eq(buvetteCardAttemptsTable.saleId, saleId)).orderBy(desc(buvetteCardAttemptsTable.id)).all();
  }

  /**
   * Bornée : le cron relit quelques tentatives à chaque passage, jamais tout l'historique. Une
   * tentative expirée se relit encore 24 h, le temps qu'un paiement tardif apparaisse.
   */
  listPending(db: DbOrTx, olderThan: Date, expiredSince: Date, limit: number) {
    const sec = (d: Date) => Math.floor(d.getTime() / 1000);
    return db.select().from(buvetteCardAttemptsTable)
      .where(sql`${buvetteCardAttemptsTable.createdAt} <= ${sec(olderThan)} AND (${buvetteCardAttemptsTable.status} = 'pending' OR (${buvetteCardAttemptsTable.status} = 'expired' AND ${buvetteCardAttemptsTable.createdAt} >= ${sec(expiredSince)}))`)
      .orderBy(asc(buvetteCardAttemptsTable.id))
      .limit(limit)
      .all();
  }

  markAttempt(db: DbOrTx, id: number, values: Partial<BuvetteCardAttempt>) {
    return db.update(buvetteCardAttemptsTable).set({ ...values, checkedAt: new Date() }).where(eq(buvetteCardAttemptsTable.id, id));
  }

  createAttempt(db: DbOrTx, saleId: number, foreignTxId: string, amountCents: number) {
    return db.insert(buvetteCardAttemptsTable).values({ saleId, foreignTxId, amountCents, createdAt: new Date() }).returning().get();
  }

  buildAttemptStatement(db: DbOrTx, id: number, values: Partial<BuvetteCardAttempt>): any {
    return db.update(buvetteCardAttemptsTable).set({ ...values, checkedAt: new Date() }).where(eq(buvetteCardAttemptsTable.id, id));
  }

  buildSaleStatusStatement(db: DbOrTx, saleId: number, status: 'paid' | 'cancelled', by: string | null): any {
    return db.update(buvetteSalesTable)
      .set(status === 'cancelled' ? { status, cancelledByEmail: by, cancelledAt: new Date() } : { status })
      .where(and(eq(buvetteSalesTable.id, saleId), eq(buvetteSalesTable.status, 'in_progress')));
  }

  /**
   * La vente abandonnée rend sa commande au client. S'il en a repassé une entre-temps, l'ancienne
   * s'annule : l'index d'une commande par carte ferait sinon échouer l'abandon, et le solde
   * resterait réservé.
   */
  buildReopenOrderStatement(db: DbOrTx, orderId: number): any {
    return db.update(buvetteOrdersTable)
      .set({
        status: sql`CASE WHEN EXISTS (SELECT 1 FROM buvette_orders o WHERE o.card_id = buvette_orders.card_id AND o.status = 'pending') THEN 'cancelled' ELSE 'pending' END` as any
      })
      .where(eq(buvetteOrdersTable.id, orderId));
  }

  /** La réservation devient un débit, tant que la vente attend encore : jamais sur une vente abandonnée. */
  buildCaptureStatement(db: DbOrTx, saleId: number, cardId: number, amountCents: number): any {
    return db.update(buvetteCardsTable)
      .set({
        balanceCents: sql`${buvetteCardsTable.balanceCents} - ${amountCents}`,
        reservedCents: sql`${buvetteCardsTable.reservedCents} - ${amountCents}`
      })
      .where(and(eq(buvetteCardsTable.id, cardId), sql`EXISTS (SELECT 1 FROM ${buvetteSalesTable} WHERE ${buvetteSalesTable.id} = ${saleId} AND ${buvetteSalesTable.status} = 'in_progress')`));
  }

  buildReleaseStatement(db: DbOrTx, saleId: number, cardId: number, amountCents: number): any {
    return db.update(buvetteCardsTable)
      .set({ reservedCents: sql`${buvetteCardsTable.reservedCents} - ${amountCents}` })
      .where(and(eq(buvetteCardsTable.id, cardId), sql`EXISTS (SELECT 1 FROM ${buvetteSalesTable} WHERE ${buvetteSalesTable.id} = ${saleId} AND ${buvetteSalesTable.status} = 'in_progress')`));
  }

  buildCreditStatement(db: DbOrTx, saleId: number, cardId: number, amountCents: number): any {
    return db.update(buvetteCardsTable)
      .set({ balanceCents: sql`${buvetteCardsTable.balanceCents} + ${amountCents}` })
      .where(and(eq(buvetteCardsTable.id, cardId), sql`EXISTS (SELECT 1 FROM ${buvetteSalesTable} WHERE ${buvetteSalesTable.id} = ${saleId} AND ${buvetteSalesTable.status} = 'in_progress')`));
  }

  /**
   * La clé du mouvement fait échouer une seconde confirmation : rien n'est débité deux fois. La
   * session relue exige que la vente attende encore : sinon le NOT NULL annule le lot entier.
   */
  buildMovementStatement(db: DbOrTx, sale: BuvetteSale, type: 'debit' | 'recharge', cardId: number, amountCents: number): any {
    return db.insert(buvetteCardMovementsTable).values({
      clientId: `${type}-${sale.clientId}`,
      cardId,
      sessionId: sql`(SELECT ${buvetteSalesTable.sessionId} FROM ${buvetteSalesTable} WHERE ${buvetteSalesTable.id} = ${sale.id} AND ${buvetteSalesTable.status} = 'in_progress')` as any,
      saleId: sale.id,
      type,
      amountCents,
      createdByEmail: sale.createdByEmail,
      createdAt: new Date()
    });
  }
}
