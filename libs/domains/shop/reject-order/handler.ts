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

/**
 * Refuse une commande encore au statut « créée ».
 *
 * Le motif est facultatif. Donné, il est gardé sur la commande et remplace, dans la
 * notification, le renvoi vers le bureau : l'adhérent n'a plus à demander pourquoi.
 */
export async function rejectOrder(db: Db, { id, reason }: RejectOrderInput): Promise<RejectOrderOutput> {
  const motif = reason?.trim() || null;
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

  const updated = await repo.rejectWithLock(db, id, motif);
  if (!updated) {
    throw new ConcurrentModificationError();
  }

  await notifyContacts(db, await getContactEmailsForMember(db, order.memberId), {
    title: 'Commande refusée',
    body: motif
      ? `Votre commande boutique n'a pas été retenue. Motif : ${motif}`
      : "Votre commande boutique n'a pas été retenue. Rapprochez-vous du bureau pour en savoir plus.",
    url: '/mon-compte/commandes',
    source: 'order:rejected',
    category: 'order'
  });

  return updated;
}
