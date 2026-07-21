import { ApproveOrderRepository } from './repository';
import { Order } from '../shared/order';
import {
  OrderNotFoundError,
  OrderInvalidOrProcessedError,
  SeasonClosedError,
  MemberNotFoundError,
  ProductNotFoundError,
  ConcurrentModificationError
} from '../shared/errors';
import { isSeasonClosed } from '@metacult/features-members-api';
import { ApproveOrderInput, ApproveOrderOutput } from "./dto";

export async function approveOrder(db: any, id: ApproveOrderInput): Promise<ApproveOrderOutput> {
  const repo = new ApproveOrderRepository();

  return db.transaction(async (tx: any) => {
    const orderData = await repo.getOrderById(tx, id);
    if (!orderData) {
      throw new OrderNotFoundError();
    }
    const order = new Order(orderData);

    if (!order.canBeApproved()) {
      throw new OrderInvalidOrProcessedError();
    }

    if (await isSeasonClosed(tx, order.seasonId)) {
      throw new SeasonClosedError();
    }

    const member = await repo.getMemberById(tx, order.memberId);
    if (!member) {
      throw new MemberNotFoundError();
    }

    const product = await repo.getProductById(tx, order.productId);
    if (!product) {
      throw new ProductNotFoundError();
    }

    const boutiqueCatId = await repo.getBoutiqueCategory(tx);
    const description = `Achat boutique - ${member.lastName} ${member.firstName} - ${product.name} x${order.quantity}`;

    // 1. Créer la transaction de recette
    const recipeTx = await repo.createRecetteTransaction(tx, {
      seasonId: order.seasonId,
      category: boutiqueCatId,
      amount: order.totalAmount,
      description,
      memberId: member.id,
      paymentMethod: order.paymentMethod,
    });

    // 2. Mettre à jour la commande avec optimistic locking
    const updated = await repo.approveWithLock(tx, id, recipeTx.id);
    if (!updated) {
      throw new ConcurrentModificationError();
    }

    return updated;
  });
}
