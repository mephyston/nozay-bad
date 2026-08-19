import { type DbOrTx } from '@nba/db';
import { ordersTable } from './shared/schema';
import { eq, and, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { OPEN_ORDER_STATUSES } from './shared/order';

/**
 * Commandes encaissées mais jamais passées en comptabilité.
 *
 * Une date de règlement portée sur une commande qui n'est pas au statut `paid`
 * signale de l'argent reçu qui n'a produit aucune écriture : la saison ne peut pas
 * être arrêtée dessus.
 */
export async function getUnvalidatedPaidOrders(db: DbOrTx, seasonId: number): Promise<any[]> {
  return db.select()
    .from(ordersTable)
    .where(and(
      eq(ordersTable.seasonId, seasonId),
      inArray(ordersTable.status, [...OPEN_ORDER_STATUSES]),
      isNotNull(ordersTable.paidAt)
    ))
    .all();
}

export interface OrderAwaitingPayment {
  id: number;
  memberId: number;
  totalAmountCents: number;
  awaitingPaymentSince: string | null;
}

/**
 * Commandes en attente de règlement depuis au moins la date donnée.
 *
 * Alimente la relance programmée. Les commandes validées avant l'introduction du
 * suivi (`awaiting_payment_since` nul) sont incluses : elles attendent, par
 * construction, depuis plus longtemps que le seuil.
 */
export async function getOrdersAwaitingPaymentSince(
  db: DbOrTx,
  validatedBefore: string
): Promise<OrderAwaitingPayment[]> {
  const rows = await db
    .select({
      id: ordersTable.id,
      memberId: ordersTable.memberId,
      totalAmountCents: ordersTable.totalAmountCents,
      awaitingPaymentSince: ordersTable.awaitingPaymentSince
    })
    .from(ordersTable)
    .where(and(
      eq(ordersTable.status, 'awaiting_payment'),
      or(
        isNull(ordersTable.awaitingPaymentSince),
        lte(ordersTable.awaitingPaymentSince, validatedBefore)
      )
    ))
    .all();

  return rows as OrderAwaitingPayment[];
}
