import { type Db } from '@nba/db';
import { DeliverOrderRepository } from './repository';
import { Order } from '../shared/order';
import {
  OrderNotFoundError,
  OrderInvalidOrProcessedError,
  ConcurrentModificationError
} from '../shared/errors';
import { DeliverOrderInput, DeliverOrderOutput } from './dto';

/**
 * Remise de l'article : la commande payée passe à « livrée ».
 *
 * Rien d'autre ne bouge. Le stock a été réservé à la validation, la recette écrite à
 * l'encaissement ; la remise dit seulement que l'adhérent est reparti avec, pour que
 * le bureau sache ce qui reste à distribuer.
 *
 * Pas de garde sur la clôture d'exercice, pour la même raison : aucune écriture n'est
 * produite, et un maillot réglé en août se remet encore en septembre. Pas de
 * notification non plus : l'adhérent est là, l'article à la main.
 */
export async function deliverOrder(db: Db, id: DeliverOrderInput): Promise<DeliverOrderOutput> {
  const repo = new DeliverOrderRepository();

  const orderData = await repo.getOrderById(db, id);
  if (!orderData) {
    throw new OrderNotFoundError();
  }
  const order = new Order(orderData as any);

  if (!order.canBeDelivered()) {
    throw new OrderInvalidOrProcessedError('Seule une commande payée peut être livrée.');
  }

  const deliveredAt = new Date().toISOString().split('T')[0];
  const [result]: any[] = await db.batch([repo.buildDeliverOrderStatement(db, id, deliveredAt)] as any);

  // Sans ligne touchée, la commande a changé entre-temps (livrée ou encaissement annulé).
  if (!result?.meta?.changes) {
    throw new ConcurrentModificationError();
  }

  const updated = await repo.getOrderById(db, id);
  return updated as DeliverOrderOutput;
}
