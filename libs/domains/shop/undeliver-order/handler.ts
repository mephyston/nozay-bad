import { type Db } from '@nba/db';
import { UndeliverOrderRepository } from './repository';
import { Order } from '../shared/order';
import {
  OrderNotFoundError,
  OrderInvalidOrProcessedError,
  ConcurrentModificationError
} from '../shared/errors';
import { UndeliverOrderInput, UndeliverOrderOutput } from './dto';

/**
 * Annulation d'une remise : la commande livrée redevient « à livrer ».
 *
 * Le cas d'usage est la mauvaise ligne cochée — le maillot du voisin. La commande
 * reste payée, sa recette au grand livre n'est pas touchée. Pour défaire aussi
 * l'encaissement, il faut repasser par là : un pas en arrière à la fois.
 */
export async function undeliverOrder(db: Db, id: UndeliverOrderInput): Promise<UndeliverOrderOutput> {
  const repo = new UndeliverOrderRepository();

  const orderData = await repo.getOrderById(db, id);
  if (!orderData) {
    throw new OrderNotFoundError();
  }
  const order = new Order(orderData as any);

  if (!order.canBeUndelivered()) {
    throw new OrderInvalidOrProcessedError('Seule une commande livrée peut voir sa remise annulée.');
  }

  const [result]: any[] = await db.batch([repo.buildUndeliverOrderStatement(db, id)] as any);

  if (!result?.meta?.changes) {
    throw new ConcurrentModificationError();
  }

  const updated = await repo.getOrderById(db, id);
  return updated as UndeliverOrderOutput;
}
