import { type Db } from '@nba/db';
import { CancelOrderRepository } from './repository';
import { Order } from '../shared/order';
import {
  OrderNotFoundError,
  OrderInvalidOrProcessedError,
  SeasonClosedError,
  ConcurrentModificationError
} from '../shared/errors';
import { getContactEmailsForMember, isSeasonClosed } from '@nba/members-api';
import { notifyContacts } from '@nba/notifications-api';
import { CancelOrderInput, CancelOrderOutput } from './dto';

/**
 * Annule une commande validée que le règlement n'a jamais suivie.
 *
 * Le stock réservé à la validation est rendu. Rien à défaire côté comptabilité :
 * une commande non payée n'y est jamais entrée.
 */
export async function cancelOrder(db: Db, id: CancelOrderInput): Promise<CancelOrderOutput> {
  const repo = new CancelOrderRepository();

  const orderData = await repo.getOrderById(db, id);
  if (!orderData) {
    throw new OrderNotFoundError();
  }
  const order = new Order(orderData as any);

  if (!order.canBeCancelled()) {
    throw new OrderInvalidOrProcessedError(
      "Seule une commande en attente de paiement peut être annulée."
    );
  }

  if (await isSeasonClosed(db, order.seasonId)) {
    throw new SeasonClosedError();
  }

  const product = await repo.getProductById(db, order.productId);

  const stmts: any[] = [repo.buildCancelOrderStatement(db, id)];
  // Produit supprimé entre-temps : il n'y a plus de stock à rendre, l'annulation reste due.
  if (product?.trackStock) {
    stmts.push(repo.buildRestoreStockStatement(db, product.id, order.quantity));
  }

  const results = await db.batch(stmts as any);

  // Sans ligne touchée, la commande a été réglée entre-temps : ne rien rendre au stock.
  if (!results[0]?.meta?.changes) {
    throw new ConcurrentModificationError();
  }

  await notifyContacts(db, await getContactEmailsForMember(db, order.memberId), {
    title: 'Commande annulée',
    body: "Votre commande boutique a été annulée faute de règlement. Rapprochez-vous du bureau pour la repasser.",
    url: '/mon-compte',
    source: 'order:cancelled',
    category: 'order'
  });

  const updated = await repo.getOrderById(db, id);
  return updated as CancelOrderOutput;
}
