import { type Db } from '@nba/db';
import { ValidateOrderRepository } from './repository';
import { Order } from '../shared/order';
import {
  OrderNotFoundError,
  OrderInvalidOrProcessedError,
  SeasonClosedError,
  ProductNotFoundError,
  InsufficientStockError,
  ConcurrentModificationError
} from '../shared/errors';
import { getContactEmailsForMember, isSeasonClosed } from '@nba/members-api';
import { notifyContacts } from '@nba/notifications-api';
import { ValidateOrderInput, ValidateOrderOutput } from './dto';

const eur = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

/**
 * Le bureau accepte la demande : la commande passe en attente de règlement.
 *
 * C'est ici que le stock est décrémenté, pas au paiement : entre la validation et
 * l'encaissement l'article est promis à cet adhérent, et deux commandes ne peuvent
 * pas se voir promettre la même dernière unité. Une annulation le rend au stock.
 *
 * Aucune écriture comptable n'est produite : la recette n'existe qu'au paiement.
 */
export async function validateOrder(db: Db, id: ValidateOrderInput): Promise<ValidateOrderOutput> {
  const repo = new ValidateOrderRepository();

  // Phase 1 : Lecture (hors batch)
  const orderData = await repo.getOrderById(db, id);
  if (!orderData) {
    throw new OrderNotFoundError();
  }
  const order = new Order(orderData as any);

  if (!order.canBeValidated()) {
    throw new OrderInvalidOrProcessedError(
      "Seule une commande au statut « créée » peut être mise en attente de paiement."
    );
  }

  if (await isSeasonClosed(db, order.seasonId)) {
    throw new SeasonClosedError();
  }

  const product = await repo.getProductById(db, order.productId);
  if (!product) {
    throw new ProductNotFoundError();
  }

  // Le stock a pu fondre depuis la demande : on revérifie au moment de le réserver.
  if (product.trackStock && product.stock < order.quantity) {
    throw new InsufficientStockError(product.name);
  }

  // Phase 2 : Décision (en mémoire)
  const awaitingPaymentSince = new Date().toISOString().split('T')[0];
  const stmts: any[] = [repo.buildValidateOrderStatement(db, id, awaitingPaymentSince)];
  if (product.trackStock) {
    stmts.push(repo.buildDecrementStockStatement(db, product.id, order.quantity));
  }

  // Phase 3 : Écriture (db.batch)
  const results = await db.batch(stmts as any);

  // Verrou optimiste : sans ligne touchée, la commande a changé d'état entre-temps
  // et le stock ne doit surtout pas avoir été décrémenté pour rien.
  if (!results[0]?.meta?.changes) {
    throw new ConcurrentModificationError();
  }

  await notifyContacts(db, await getContactEmailsForMember(db, order.memberId), {
    title: 'Commande en attente de paiement',
    body: `Votre commande ${product.name} ×${order.quantity} est validée. Il reste ${eur(order.totalAmountCents)} € à régler.`,
    url: '/mon-compte',
    source: 'order:awaiting-payment',
    category: 'order'
  });

  const updated = await repo.getOrderById(db, id);
  return updated as ValidateOrderOutput;
}
