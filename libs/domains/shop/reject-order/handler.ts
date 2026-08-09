import { type Db } from '@nba/db';
import { RejectOrderRepository } from './repository';
import { Order } from '../shared/order';
import {
  OrderNotFoundError,
  OrderInvalidOrProcessedError,
  SeasonClosedError,
  ConcurrentModificationError
} from '../shared/errors';
import { getContactEmailsForMember, isSeasonClosed } from '@nba/members-api';
import { notifyContacts } from '@nba/notifications-api';
import { RejectOrderInput, RejectOrderOutput } from "./dto";

export async function rejectOrder(db: Db, id: RejectOrderInput): Promise<RejectOrderOutput> {
  const repo = new RejectOrderRepository();

  const orderData = await repo.getOrderById(db, id);
  if (!orderData) {
    throw new OrderNotFoundError();
  }
  const order = new Order(orderData as any);

  if (!order.canBeRejected()) {
    throw new OrderInvalidOrProcessedError(
      "Seule une commande au statut « créée » peut être refusée. Une commande déjà validée s'annule."
    );
  }

  if (await isSeasonClosed(db, order.seasonId)) {
    throw new SeasonClosedError();
  }

  const updated = await repo.rejectWithLock(db, id);
  if (!updated) {
    throw new ConcurrentModificationError();
  }

  await notifyContacts(db, await getContactEmailsForMember(db, order.memberId), {
    title: 'Commande refusée',
    body: "Votre commande boutique n'a pas été retenue. Rapprochez-vous du bureau pour en savoir plus.",
    url: '/mon-compte',
    source: 'order:rejected',
    category: 'order'
  });

  return updated;
}
