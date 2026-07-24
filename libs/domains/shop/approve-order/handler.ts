import { type Db, type Tx, AppError } from '@nba/db';
import { ApproveOrderRepository } from './repository';
import { Order } from '../shared/order';
import {
  OrderNotFoundError,
  OrderInvalidOrProcessedError,
  SeasonClosedError,
  MemberNotFoundError,
  ProductNotFoundError,
  ConcurrentModificationError,
  ShopCategoryNotConfiguredError
} from '../shared/errors';
import { isSeasonClosed } from '@nba/members-api';
import { ApproveOrderInput, ApproveOrderOutput } from "./dto";

export async function approveOrder(db: Db, id: ApproveOrderInput): Promise<ApproveOrderOutput> {
  const repo = new ApproveOrderRepository();

  return db.transaction(async (tx: Tx) => {
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

    const productCategory = await repo.getProductCategoryById(tx, product.productCategoryId);
    if (!productCategory || !productCategory.accountingCategoryId) {
      throw new ShopCategoryNotConfiguredError(productCategory?.label);
    }

    const paymentMethod = await repo.getPaymentMethodById(tx, order.paymentMethodId);
    const targetAccountCode = paymentMethod?.code === 'especes' ? 'cash' : 'current';
    const account = await repo.getAccountByCode(tx, targetAccountCode);
    if (!account) {
      throw new AppError(`Compte de trésorerie '${targetAccountCode}' introuvable.`, 400);
    }

    const description = `Achat boutique - ${member.lastName} ${member.firstName} - ${product.name} x${order.quantity}`;

    // 1. Créer la transaction de recette
    const recipeTx = await repo.createRecetteTransaction(tx, {
      seasonId: order.seasonId,
      accountId: account.id,
      paymentMethodId: order.paymentMethodId,
      categoryId: productCategory.accountingCategoryId,
      amountCents: order.totalAmountCents,
      description,
      memberId: member.id,
    });

    // 2. Mettre à jour la commande avec optimistic locking
    const updated = await repo.approveWithLock(tx, id, recipeTx.id);
    if (!updated) {
      throw new ConcurrentModificationError();
    }

    return updated;
  });
}
