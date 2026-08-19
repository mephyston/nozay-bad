import { type Db, AppError } from '@nba/db';
import { PayOrderRepository } from './repository';
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
import { PayOrderInput, PayOrderOutput } from './dto';

/**
 * Encaissement d'une commande en attente de paiement.
 *
 * C'est le seul passage qui écrit en comptabilité : la recette est datée du
 * règlement, pas de la commande, et une commande jamais réglée ne laisse donc
 * aucune trace dans l'exercice. Le stock a déjà été réservé à la validation.
 */
export async function payOrder(db: Db, input: PayOrderInput): Promise<PayOrderOutput> {
  const repo = new PayOrderRepository();
  const id = typeof input === 'number' ? input : input.id;
  const requestedPaidAt = typeof input === 'object' ? input.paidAt : undefined;

  // Phase 1 : Lecture (hors batch)
  const orderData = await repo.getOrderById(db, id);
  if (!orderData) {
    throw new OrderNotFoundError();
  }
  const order = new Order(orderData as any);

  if (!order.canBePaid()) {
    throw new OrderInvalidOrProcessedError(
      "Seule une commande en attente de paiement peut être encaissée."
    );
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

  // Doit rester juste après stmt1 : c'est de lui que `last_insert_rowid()` tire l'id.
  const stmt2 = repo.buildPayOrderStatement(db, id, paidAt);

  // Phase 3 : Écriture (db.batch)
  const results = await db.batch([stmt1, stmt2] as any);

  // Détection d'échec du verrou optimiste (status !== 'awaiting_payment' à l'écriture)
  const changes = results[1]?.meta?.changes;
  if (!changes) {
    throw new ConcurrentModificationError();
  }

  await notifyContacts(db, await getContactEmailsForMember(db, member.id), {
    title: 'Commande payée',
    body: `Le règlement de votre commande ${product.name} ×${order.quantity} est enregistré. Merci !`,
    url: '/mon-compte',
    source: 'order:paid',
    category: 'order'
  });

  const updated = await repo.getOrderById(db, id);
  return updated as PayOrderOutput;
}
