import { type Db } from '@nba/db';
import { CreateOrderRepository } from './repository';
import { ProductNotFoundError, SeasonClosedError, MemberNotFoundError, MemberNotEligibleError } from '../shared/errors';
import { isSeasonClosed } from '@nba/members-api';
import { CreateOrderInput, CreateOrderOutput } from "./dto";
import { AppError } from '@nba/db';

export async function createOrder(db: Db, body: CreateOrderInput): Promise<CreateOrderOutput> {
  if (await isSeasonClosed(db, body.seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de soumettre une commande.');
  }

  const repo = new CreateOrderRepository();

  const member = await repo.getMemberById(db, body.memberId);
  if (!member) {
    throw new MemberNotFoundError();
  }

  if (member.seasonId !== body.seasonId) {
    throw new MemberNotEligibleError("L'adhérent n'est pas inscrit sur la saison sélectionnée pour la commande.");
  }

  if (member.status !== 'valide') {
    throw new MemberNotEligibleError(`L'adhérent n'a pas un statut validé (statut actuel : ${member.status}). Seuls les adhérents au statut validé peuvent commander en boutique.`);
  }

  if (body.paidAt) {
    const todayStr = new Date().toISOString().split('T')[0];
    if (body.paidAt > todayStr) {
      throw new AppError("La date de paiement ne peut pas être postérieure à la date du jour.", 400);
    }
  }

  const product = await repo.getProductById(db, body.productId);
  if (!product) {
    throw new ProductNotFoundError();
  }

  const paymentMethod = await repo.getPaymentMethodByCode(db, body.paymentMethod);
  if (!paymentMethod) {
    throw new AppError(`Le moyen de paiement '${body.paymentMethod}' n'existe pas.`, 400);
  }

  return repo.create(db, {
    seasonId: body.seasonId,
    memberId: body.memberId,
    productId: body.productId,
    quantity: body.quantity,
    totalAmountCents: product.priceCents * body.quantity,
    paymentMethodId: paymentMethod.id,
    status: 'pending',
    paidAt: body.paidAt || null,
    createdAt: new Date()
  });
}
