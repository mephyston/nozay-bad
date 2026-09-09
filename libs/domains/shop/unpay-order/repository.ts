import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { ordersTable } from '../shared/schema';
import { ledgerEntriesTable } from '@nba/accounting/schema';

export class UnpayOrderRepository {
  async getOrderById(db: DbOrTx, id: number): Promise<typeof ordersTable.$inferSelect | undefined> {
    return db.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
  }

  /** La recette que l'encaissement a écrite, si elle existe encore. */
  async getLedgerEntryById(db: DbOrTx, id: number): Promise<typeof ledgerEntriesTable.$inferSelect | undefined> {
    return db.select().from(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id)).get();
  }

  buildDeleteLedgerEntryStatement(db: DbOrTx, id: number): any {
    return db.delete(ledgerEntriesTable).where(eq(ledgerEntriesTable.id, id));
  }

  /**
   * La commande redevient « en attente de paiement », comme avant l'encaissement.
   *
   * `awaiting_payment_since` est repris tel quel : l'encaissement ne l'efface pas, et
   * c'est la date de la validation qui compte pour les relances. Le verrou optimiste
   * porte sur `paid` : deux annulations concurrentes n'en font qu'une.
   */
  buildUnpayOrderStatement(db: DbOrTx, id: number, awaitingPaymentSince: string): any {
    return db.update(ordersTable)
      .set({ status: 'awaiting_payment', paidAt: null, ledgerEntryId: null, awaitingPaymentSince })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'paid')));
  }
}
