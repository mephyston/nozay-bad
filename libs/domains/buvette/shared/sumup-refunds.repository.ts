import { and, desc, eq, gt, isNull, lt } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { buvetteCardAttemptsTable, buvetteSalesTable, buvetteSumUpRefundsTable } from './schema';

type RefundValues = Pick<typeof buvetteSumUpRefundsTable.$inferInsert, 'attemptId' | 'reason' | 'requestedCents' | 'requestedByEmail' | 'requestedAt' | 'refundClientId'>;

/** Les remboursements de CB par l'API SumUp : une ligne par paiement, réservée avant tout envoi. */
export class SumUpRefundsRepository {
  getAttempt(db: DbOrTx, attemptId: number) {
    return db
      .select({
        id: buvetteCardAttemptsTable.id,
        foreignTxId: buvetteCardAttemptsTable.foreignTxId,
        status: buvetteCardAttemptsTable.status,
        anomaly: buvetteCardAttemptsTable.anomaly,
        amountCents: buvetteCardAttemptsTable.amountCents,
        transactionCode: buvetteCardAttemptsTable.transactionCode,
        saleStatus: buvetteSalesTable.status
      })
      .from(buvetteCardAttemptsTable)
      .innerJoin(buvetteSalesTable, eq(buvetteCardAttemptsTable.saleId, buvetteSalesTable.id))
      .where(eq(buvetteCardAttemptsTable.id, attemptId))
      .get();
  }

  getRefund(db: DbOrTx, attemptId: number) {
    return db.select().from(buvetteSumUpRefundsTable).where(eq(buvetteSumUpRefundsTable.attemptId, attemptId)).get();
  }

  buildClaimStatement(db: DbOrTx, values: RefundValues): any {
    return db.insert(buvetteSumUpRefundsTable).values({ ...values, status: 'pending' });
  }

  /** La clé unique fait foi : de deux demandes simultanées, une seule crée la ligne. */
  async claim(db: DbOrTx, values: RefundValues): Promise<boolean> {
    try {
      await this.buildClaimStatement(db, values);
      return true;
    } catch (error) {
      if (/UNIQUE/i.test(String(error))) return false;
      throw error;
    }
  }

  /** Une relance après un échec : seule celle qui fait passer la ligne à `pending` envoie. */
  async reclaim(db: DbOrTx, attemptId: number, by: string, now: Date): Promise<boolean> {
    const result: any = await db.update(buvetteSumUpRefundsTable)
      .set({ status: 'pending', error: null, requestedByEmail: by, requestedAt: now })
      .where(and(eq(buvetteSumUpRefundsTable.attemptId, attemptId), eq(buvetteSumUpRefundsTable.status, 'failed')));
    return Boolean(result?.meta?.changes ?? result?.changes);
  }

  markDone(db: DbOrTx, attemptId: number, amountCents: number, now: Date) {
    return db.update(buvetteSumUpRefundsTable)
      .set({ status: 'done', amountCents, error: null, doneAt: now })
      .where(eq(buvetteSumUpRefundsTable.attemptId, attemptId));
  }

  /** Rendue en espèces à la place : la part est close, plus rien n'est dû sur la CB. */
  markCash(db: DbOrTx, attemptId: number, error: string | null) {
    return db.update(buvetteSumUpRefundsTable).set({ status: 'cash', error }).where(eq(buvetteSumUpRefundsTable.attemptId, attemptId));
  }

  /** Les parts d'un remboursement de carte, pour le reprendre là où il s'est arrêté. */
  partsOf(db: DbOrTx, refundClientId: string) {
    return db
      .select({
        attemptId: buvetteSumUpRefundsTable.attemptId,
        status: buvetteSumUpRefundsTable.status,
        requestedCents: buvetteSumUpRefundsTable.requestedCents,
        requestedAt: buvetteSumUpRefundsTable.requestedAt,
        error: buvetteSumUpRefundsTable.error,
        foreignTxId: buvetteCardAttemptsTable.foreignTxId,
        transactionCode: buvetteCardAttemptsTable.transactionCode
      })
      .from(buvetteSumUpRefundsTable)
      .innerJoin(buvetteCardAttemptsTable, eq(buvetteSumUpRefundsTable.attemptId, buvetteCardAttemptsTable.id))
      .where(eq(buvetteSumUpRefundsTable.refundClientId, refundClientId))
      .all();
  }

  /** Les actes de remboursement de carte qui ont réservé des parts sur les recharges de cette carte. */
  async refundClientIdsOf(db: DbOrTx, cardId: number): Promise<string[]> {
    const rows = await db
      .selectDistinct({ id: buvetteSumUpRefundsTable.refundClientId })
      .from(buvetteSumUpRefundsTable)
      .innerJoin(buvetteCardAttemptsTable, eq(buvetteSumUpRefundsTable.attemptId, buvetteCardAttemptsTable.id))
      .innerJoin(buvetteSalesTable, eq(buvetteCardAttemptsTable.saleId, buvetteSalesTable.id))
      .where(and(eq(buvetteSalesTable.rechargeCardId, cardId), eq(buvetteSumUpRefundsTable.reason, 'card_balance')))
      .all();
    return rows.flatMap((r) => (r.id ? [r.id] : []));
  }

  /** Une part de ce paiement a déjà servi à rembourser un solde de carte. */
  async hasCardBalanceRefund(db: DbOrTx, saleId: number): Promise<boolean> {
    const row = await db.select({ id: buvetteSumUpRefundsTable.id }).from(buvetteSumUpRefundsTable)
      .innerJoin(buvetteCardAttemptsTable, eq(buvetteSumUpRefundsTable.attemptId, buvetteCardAttemptsTable.id))
      .where(and(eq(buvetteCardAttemptsTable.saleId, saleId), eq(buvetteSumUpRefundsTable.reason, 'card_balance')))
      .get();
    return Boolean(row);
  }

  markFailed(db: DbOrTx, attemptId: number, error: string) {
    return db.update(buvetteSumUpRefundsTable).set({ status: 'failed', error }).where(eq(buvetteSumUpRefundsTable.attemptId, attemptId));
  }

  pendingBefore(db: DbOrTx, before: Date) {
    return db.select({ attemptId: buvetteSumUpRefundsTable.attemptId }).from(buvetteSumUpRefundsTable)
      .where(and(eq(buvetteSumUpRefundsTable.status, 'pending'), lt(buvetteSumUpRefundsTable.requestedAt, before)))
      .all();
  }

  /**
   * Les recharges d'une carte payées par CB et jamais remboursées, de la plus récente à la plus
   * ancienne : ce que le remboursement du solde peut rendre sur la carte bancaire. La part
   * remboursable d'une transaction est sa part recharge, la CB ayant pu payer aussi des articles.
   */
  cardRechargePayments(db: DbOrTx, cardId: number) {
    return db
      .select({
        attemptId: buvetteCardAttemptsTable.id,
        foreignTxId: buvetteCardAttemptsTable.foreignTxId,
        transactionCode: buvetteCardAttemptsTable.transactionCode,
        rechargeCents: buvetteSalesTable.rechargeCents,
        cardCents: buvetteSalesTable.cardCents
      })
      .from(buvetteCardAttemptsTable)
      .innerJoin(buvetteSalesTable, eq(buvetteCardAttemptsTable.saleId, buvetteSalesTable.id))
      .leftJoin(buvetteSumUpRefundsTable, eq(buvetteSumUpRefundsTable.attemptId, buvetteCardAttemptsTable.id))
      .where(and(
        eq(buvetteSalesTable.rechargeCardId, cardId),
        eq(buvetteSalesTable.status, 'paid'),
        gt(buvetteSalesTable.rechargeCents, 0),
        eq(buvetteCardAttemptsTable.status, 'successful'),
        isNull(buvetteCardAttemptsTable.anomaly),
        isNull(buvetteSumUpRefundsTable.id)
      ))
      .orderBy(desc(buvetteCardAttemptsTable.id))
      .all();
  }

  /** Les parts rendues sur CB au remboursement d'une carte, que SumUp n'a pas pu passer. */
  failedCardBalanceRefunds(db: DbOrTx) {
    return db
      .select({
        attemptId: buvetteSumUpRefundsTable.attemptId,
        requestedCents: buvetteSumUpRefundsTable.requestedCents,
        transactionCode: buvetteCardAttemptsTable.transactionCode,
        status: buvetteSumUpRefundsTable.status
      })
      .from(buvetteSumUpRefundsTable)
      .innerJoin(buvetteCardAttemptsTable, eq(buvetteSumUpRefundsTable.attemptId, buvetteCardAttemptsTable.id))
      .where(and(eq(buvetteSumUpRefundsTable.reason, 'card_balance'), eq(buvetteSumUpRefundsTable.status, 'failed')))
      .all();
  }
}
