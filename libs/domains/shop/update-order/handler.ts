import { type Db, AppError } from '@nba/db';
import { isSeasonClosed } from '@nba/members-api';
import { productDisplayName } from '../shared/product';
import { Order } from '../shared/order';
import {
  ConcurrentModificationError,
  InsufficientStockError,
  MemberNotEligibleError,
  MemberNotFoundError,
  OrderInvalidOrProcessedError,
  OrderNotFoundError,
  ProductNotFoundError,
  SeasonClosedError
} from '../shared/errors';
import { UpdateOrderRepository } from './repository';
import type { UpdateOrderInput, UpdateOrderOutput } from './dto';

/**
 * Le bureau corrige une commande : l'adhérent, l'article (une autre taille, le plus
 * souvent), la quantité ou le moyen de paiement.
 *
 * **Tant qu'elle n'est pas réglée, et seulement.** Une commande créée n'a encore rien
 * engagé ; une commande en attente de paiement a réservé du stock, qu'on rend à l'ancien
 * article avant de le reprendre sur le nouveau. Une commande payée a écrit sa recette au
 * grand livre, peut-être déjà pointée sur le relevé : la modifier ici changerait une
 * écriture comptable en douce. Le chemin existe et se dit — annuler l'encaissement,
 * corriger, encaisser de nouveau. Une commande refusée ou annulée est close.
 *
 * Le montant se recalcule sur le prix **actuel** de l'article, comme à la création : la
 * commande n'a pas de prix figé à part.
 */
export async function updateOrder(db: Db, id: number, body: UpdateOrderInput): Promise<UpdateOrderOutput> {
  const repo = new UpdateOrderRepository();

  // Phase 1 : Lecture (hors batch)
  const orderData = await repo.getOrderById(db, id);
  if (!orderData) throw new OrderNotFoundError();
  const order = new Order(orderData as any);

  if (order.status !== 'created' && order.status !== 'awaiting_payment') {
    throw new OrderInvalidOrProcessedError(
      order.status === 'paid'
        ? "Cette commande est réglée : annulez d'abord l'encaissement pour la modifier."
        : 'Une commande refusée ou annulée ne se modifie plus.'
    );
  }

  if (await isSeasonClosed(db, order.seasonId)) throw new SeasonClosedError();

  // L'adhérent n'est revérifié que s'il change : une commande ne devient pas invalide
  // parce que le statut de son acheteur a bougé depuis.
  if (body.memberId !== order.memberId) {
    const member = await repo.getMemberById(db, body.memberId);
    if (!member) throw new MemberNotFoundError();
    if (member.seasonId !== order.seasonId) {
      throw new MemberNotEligibleError("L'adhérent n'est pas inscrit sur la saison de cette commande.");
    }
    if (member.status !== 'valide') {
      throw new MemberNotEligibleError(
        `L'adhérent n'a pas un statut validé (statut actuel : ${member.status}). Seuls les adhérents au statut validé peuvent commander en boutique.`
      );
    }
  }

  const product = await repo.getProductById(db, body.productId);
  if (!product) throw new ProductNotFoundError();
  if (await repo.hasVariants(db, product.id)) {
    throw new AppError(`« ${productDisplayName(product)} » se décline : choisissez l'une de ses déclinaisons.`, 400);
  }
  if (product.id !== order.productId && product.active === false) {
    throw new AppError(`« ${productDisplayName(product)} » n'est plus proposé.`, 400);
  }

  const paymentMethod = await repo.getPaymentMethodByCode(db, body.paymentMethod);
  if (!paymentMethod) throw new AppError(`Le moyen de paiement '${body.paymentMethod}' n'existe pas.`, 400);
  if (paymentMethod.id !== order.paymentMethodId && (paymentMethod.active === false || paymentMethod.kind === 'internal')) {
    throw new AppError(`Le moyen de paiement « ${paymentMethod.label} » n'est plus proposé.`, 400);
  }

  /*
   * Le stock. Une commande créée n'a rien réservé : on vérifie seulement qu'il y en a,
   * comme à la création. Une commande en attente de paiement tient déjà sa réservation :
   * sur le même article, elle compte dans ce qui est disponible pour elle.
   */
  const reserved = order.status === 'awaiting_payment';
  const sameProduct = product.id === order.productId;
  const available = product.stock + (reserved && sameProduct ? order.quantity : 0);
  if (product.trackStock && available < body.quantity) {
    throw new InsufficientStockError(productDisplayName(product));
  }

  // Phase 2 : Décision (en mémoire)
  const stmts: any[] = [
    repo.buildUpdateOrderStatement(db, id, order.status, {
      memberId: body.memberId,
      productId: product.id,
      quantity: body.quantity,
      totalAmountCents: product.priceCents * body.quantity,
      paymentMethodId: paymentMethod.id
    })
  ];

  if (reserved) {
    if (sameProduct) {
      const delta = order.quantity - body.quantity;
      if (product.trackStock && delta !== 0) stmts.push(repo.buildAdjustStockStatement(db, product.id, delta));
    } else {
      // L'ancien article reprend ce qui lui avait été retiré ; il a pu disparaître depuis.
      const previous = await repo.getProductById(db, order.productId);
      if (previous?.trackStock) stmts.push(repo.buildAdjustStockStatement(db, previous.id, order.quantity));
      if (product.trackStock) stmts.push(repo.buildAdjustStockStatement(db, product.id, -body.quantity));
    }
  }

  // Phase 3 : Écriture (db.batch)
  const results = await db.batch(stmts as any);
  if (!results[0]?.meta?.changes) throw new ConcurrentModificationError();

  return (await repo.getOrderById(db, id)) as UpdateOrderOutput;
}
