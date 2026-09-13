import { type Db } from '@nba/db';
import { CreateOrderRepository } from './repository';
import { ProductNotFoundError, SeasonClosedError, MemberNotFoundError, MemberNotEligibleError } from '../shared/errors';
import { isSeasonClosed } from '@nba/members-api';
import { CreateOrderInput, CreateOrderOutput } from "./dto";
import { AppError } from '@nba/db';

export interface CreateOrderContext {
  /** Vrai pour une commande passée par l'adhérent lui-même : seuls les moyens offerts à la boutique valent. */
  storefront?: boolean;
}

export async function createOrder(db: Db, body: CreateOrderInput, context: CreateOrderContext = {}): Promise<CreateOrderOutput> {
  const repo = new CreateOrderRepository();
  const seasonId = await repo.resolveSeasonId(db, body.seasonId);

  if (await isSeasonClosed(db, seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de soumettre une commande.');
  }

  const member = await repo.getMemberById(db, body.memberId);
  if (!member) {
    throw new MemberNotFoundError();
  }

  if (member.seasonId !== seasonId) {
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

  if (product.trackStock && product.stock < body.quantity) {
    throw new AppError("Désolé, il n'y a plus assez de stock disponible pour cet article.", 400);
  }

  /*
   * Le moyen de paiement est une donnée du club, avec deux volets : `active` le retire de
   * partout, `storefront` de la seule boutique des adhérents. Un moyen absent d'une liste
   * ne doit pas non plus passer par une requête forgée.
   */
  const paymentMethod = await repo.getPaymentMethodByCode(db, body.paymentMethod);
  if (!paymentMethod) {
    throw new AppError(`Le moyen de paiement '${body.paymentMethod}' n'existe pas.`, 400);
  }
  if (paymentMethod.active === false || paymentMethod.kind === 'internal') {
    throw new AppError(`Le moyen de paiement « ${paymentMethod.label} » n'est plus proposé.`, 400);
  }
  if (context.storefront && paymentMethod.storefront === false) {
    throw new AppError(`Le moyen de paiement « ${paymentMethod.label} » n'est pas proposé dans la boutique.`, 400);
  }

  return repo.create(db, {
    seasonId,
    memberId: body.memberId,
    productId: body.productId,
    quantity: body.quantity,
    totalAmountCents: product.priceCents * body.quantity,
    paymentMethodId: paymentMethod.id,
    status: 'created',
    paidAt: body.paidAt || null,
    createdAt: new Date()
  });
}
