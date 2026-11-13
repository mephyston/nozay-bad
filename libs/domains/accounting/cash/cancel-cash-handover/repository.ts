import { type Db } from '@nba/db';
import { and, eq, sql } from 'drizzle-orm';
import { cashHandoversTable, cashReceiptsTable } from '../../shared/schema';

export class CancelCashHandoverRepository {
  /**
   * Les reçus redeviennent détenus par l'encaisseur, dans le même lot — à condition que
   * la remise soit encore en attente. Sans cette condition, une remise scellée entre la
   * lecture et le lot (QR code scanné pendant qu'on annule) rendait ses reçus « détenus »
   * alors que leurs recettes étaient passées : une nouvelle remise les aurait doublées.
   * Renvoie vrai si c'est cet appel qui a annulé.
   */
  async cancel(db: Db, id: number): Promise<boolean> {
    const pending = sql`EXISTS (SELECT 1 FROM cash_handovers WHERE id = ${id} AND status = 'pending')`;
    const [, rows] = await db.batch([
      db.update(cashReceiptsTable).set({ handoverId: null }).where(and(eq(cashReceiptsTable.handoverId, id), pending)),
      db.update(cashHandoversTable).set({ status: 'cancelled', tokenHash: null, tokenExpiresAt: null })
        .where(and(eq(cashHandoversTable.id, id), eq(cashHandoversTable.status, 'pending')))
        .returning({ id: cashHandoversTable.id })
    ]);
    return rows.length === 1;
  }
}
