import { CreateOrderRepository } from './repository';
import { ProductNotFoundError, SeasonClosedError } from '../shared/errors';
import { isSeasonClosed } from '@metacult/features-members-data-access';

export async function createOrder(db: any, body: {
  seasonId: string;
  memberId: number;
  productId: number;
  quantity: number;
  paymentMethod: string;
}) {
  if (await isSeasonClosed(db, body.seasonId)) {
    throw new SeasonClosedError('La saison est clôturée. Impossible de soumettre une commande.');
  }

  const repo = new CreateOrderRepository();
  const product = await repo.getProductById(db, body.productId);
  if (!product) {
    throw new ProductNotFoundError();
  }

  return repo.create(db, {
    seasonId: body.seasonId,
    memberId: body.memberId,
    productId: body.productId,
    quantity: body.quantity,
    totalAmount: product.price * body.quantity,
    paymentMethod: body.paymentMethod,
    status: 'pending',
    createdAt: new Date()
  });
}
