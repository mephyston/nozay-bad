import { type Db } from '@nba/db';
import { isSeasonClosed } from '@nba/members-api';
import { WithdrawOrderRepository } from './repository';
import { Order } from '../shared/order';
import {
  OrderNotFoundError,
  OrderInvalidOrProcessedError,
  SeasonClosedError,
  ConcurrentModificationError
} from '../shared/errors';
import { WithdrawOrderInput, WithdrawOrderOutput } from './dto';

/**
 * L'adhérent annule sa commande depuis son espace, tant que le bureau ne l'a pas validée.
 *
 * Rien n'était engagé : pas de stock réservé, pas d'écriture. La commande passe à
 * `cancelled`, comme une commande validée jamais réglée — dans les deux cas elle se
 * ferme sans que l'argent ait bougé. Pas de notification : c'est l'adhérent qui agit.
 *
 * Validée, elle ne s'annule plus d'ici : le stock est réservé, et c'est au bureau de le
 * rendre.
 */
export async function withdrawOrder(db: Db, { id, memberId }: WithdrawOrderInput): Promise<WithdrawOrderOutput> {
  const repo = new WithdrawOrderRepository();

  const orderData = await repo.getOrderById(db, id);
  // La commande d'un autre foyer est « introuvable » : on ne dit pas qu'elle existe.
  if (!orderData || orderData.memberId !== memberId) {
    throw new OrderNotFoundError();
  }
  const order = new Order(orderData as any);

  if (!order.canBeWithdrawn()) {
    throw new OrderInvalidOrProcessedError(
      'Cette commande a déjà été traitée par le club : rapprochez-vous du bureau pour l’annuler.'
    );
  }

  if (await isSeasonClosed(db, order.seasonId)) {
    throw new SeasonClosedError();
  }

  const [result]: any[] = await db.batch([repo.buildWithdrawOrderStatement(db, id)] as any);

  // Sans ligne touchée, le bureau l'a validée ou refusée entre-temps.
  if (!result?.meta?.changes) {
    throw new ConcurrentModificationError();
  }

  return (await repo.getOrderById(db, id)) as WithdrawOrderOutput;
}
