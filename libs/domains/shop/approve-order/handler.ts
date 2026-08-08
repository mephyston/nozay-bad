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
import { getContactEmailsForMember, isSeasonClosed } from '@nba/members-api';
import { notifyContacts } from '@nba/notifications-api';
import { ApproveOrderInput, ApproveOrderOutput } from "./dto";

export async function approveOrder(db: Db, input: ApproveOrderInput): Promise<ApproveOrderOutput> {
  const repo = new ApproveOrderRepository();
  const id = typeof input === 'number' ? input : input.id;
  const requestedPaidAt = typeof input === 'object' ? input.paidAt : undefined;

  // Phase 1 : Lecture (hors batch)
  const orderData = await repo.getOrderById(db, id);
  if (!orderData) {
    throw new OrderNotFoundError();
  }
  const order = new Order(orderData);

  if (!order.canBeApproved()) {
    throw new OrderInvalidOrProcessedError();
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const paidAt = requestedPaidAt || orderData.paidAt || todayStr;

  if (paidAt > todayStr) {
    throw new AppError("La date de paiement ne peut pas être postérieure à la date du jour.", 400);
  }

  // Resolve target accounting season from paidAt
  const allSeasons = await repo.getAllSeasons(db);
  const targetSeason = allSeasons.find(s => paidAt >= s.startDate && paidAt <= s.endDate);

  let effectiveSeasonId = order.seasonId;
  let accrualType: string | null = null;
  let accrualNote: string | null = null;

  if (targetSeason) {
    if (targetSeason.closedAt !== null && targetSeason.closedAt !== undefined) {
      const activeSeason = allSeasons.find(s => s.active || s.closedAt === null) || allSeasons[0];
      effectiveSeasonId = activeSeason.id;
      accrualType = 'recette_exercice_anterieur';
      accrualNote = `Régularisation recette commande boutique #${order.id} payée le ${paidAt} sur l'exercice arrêté ${targetSeason.code}`;
    } else {
      effectiveSeasonId = targetSeason.id;
    }
  }

  if (await isSeasonClosed(db, effectiveSeasonId)) {
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

  const description = `Achat boutique - ${member.lastName} ${member.firstName} - ${product.name} x${order.quantity}`;

  // Phase 2 : Décision (en mémoire)
  const stmt1 = repo.buildRecetteTransactionStatement(db, {
    seasonId: effectiveSeasonId,
    paymentMethodId: order.paymentMethodId,
    categoryId: productCategory.accountingCategoryId,
    amountCents: order.totalAmountCents,
    description,
    memberId: member.id,
    date: paidAt,
    accrualType,
    accrualNote
  });

  const stmt2 = repo.buildApproveOrderStatement(db, id, paidAt);

  const stmts: any[] = [stmt1, stmt2];
  if (product.trackStock) {
    stmts.push(repo.buildDecrementStockStatement(db, product.id, order.quantity));
  }

  // Phase 3 : Écriture (db.batch)
  const results = await db.batch(stmts as any);

  // Détection d'échec du verrou optimiste (status !== 'pending' au moment de l'écriture)
  const changes = results[1]?.meta?.changes;
  if (!changes) {
    throw new ConcurrentModificationError();
  }

  await notifyContacts(db, await getContactEmailsForMember(db, member.id), {
    title: 'Commande validée',
    body: `Votre commande ${product.name} ×${order.quantity} est validée.`,
    url: '/mon-compte',
    source: 'order:approved',
    category: 'order'
  });

  const updated = await repo.getOrderById(db, id);
  return updated as any;
}
