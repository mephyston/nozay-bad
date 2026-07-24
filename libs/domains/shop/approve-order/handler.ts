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

  // Phase 1 : Lecture (hors batch)
  const orderData = await repo.getOrderById(db, id);
  if (!orderData) {
    throw new OrderNotFoundError();
  }
  const order = new Order(orderData);

  if (!order.canBeApproved()) {
    throw new OrderInvalidOrProcessedError();
  }

  if (await isSeasonClosed(db, order.seasonId)) {
    throw new SeasonClosedError();
  }

  const member = await repo.getMemberById(db, order.memberId);
  if (!member) {
    throw new MemberNotFoundError();
  }

  const product = await repo.getProductById(db, order.productId);
  if (!product) {
    throw new ProductNotFoundError();
  }

  const productCategory = await repo.getProductCategoryById(db, product.productCategoryId);
  if (!productCategory || !productCategory.accountingCategoryId) {
    throw new ShopCategoryNotConfiguredError(productCategory?.label);
  }

  const paymentMethod = await repo.getPaymentMethodById(db, order.paymentMethodId);
  const targetAccountCode = paymentMethod?.code === 'especes' ? 'cash' : 'current';
  const account = await repo.getAccountByCode(db, targetAccountCode);
  if (!account) {
    throw new AppError(`Compte de trésorerie '${targetAccountCode}' introuvable.`, 400);
  }

  const description = `Achat boutique - ${member.lastName} ${member.firstName} - ${product.name} x${order.quantity}`;

  // Phase 2 : Décision (en mémoire)
  const stmt1 = repo.buildRecetteTransactionStatement(db, {
    seasonId: order.seasonId,
    accountId: account.id,
    paymentMethodId: order.paymentMethodId,
    categoryId: productCategory.accountingCategoryId,
    amountCents: order.totalAmountCents,
    description,
    memberId: member.id,
  });

  const stmt2 = repo.buildApproveOrderStatement(db, id);
  const stmt3 = repo.buildDecrementStockStatement(db, product.id, order.quantity);

  // Phase 3 : Écriture (db.batch)
  const results = await db.batch([stmt1, stmt2, stmt3]);

  // Détection d'échec du verrou optimiste (status !== 'pending' au moment de l'écriture)
  const changes = results[1]?.meta?.changes;
  if (!changes) {
    throw new ConcurrentModificationError();
  }

  const updated = await repo.getOrderById(db, id);
  return updated as any;
}
