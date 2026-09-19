import { type Db } from '@nba/db';
import { ListOrdersRepository } from './repository';
import { ListOrdersInput, ListOrdersOutput } from "./dto";
import { productDisplayName } from '../shared/product';

export async function listOrders(db: Db, filters: ListOrdersInput): Promise<ListOrdersOutput> {
  const repo = new ListOrdersRepository();
  const orders = await repo.list(db, filters);

  const memberIds = Array.from(new Set(orders.map(o => o.memberId)));
  const productIds = Array.from(new Set(orders.map(o => o.productId)));

  const [membersList, productsList, paymentMethodsList] = await Promise.all([
    repo.getMembersByIds(db, memberIds),
    repo.getProductsByIds(db, productIds),
    repo.getPaymentMethods(db)
  ]);

  const paymentMethodsMap = new Map(paymentMethodsList.map(pm => [pm.id, pm]));
  const membersMap = new Map(membersList.map(m => [m.id, m]));
  const productsMap = new Map(productsList.map(p => [
    p.id,
    {
      ...p,
      // Une commande se lit avec la taille : « Maillot du club — L », jamais le nom seul.
      name: productDisplayName(p),
      price: p.priceCents ?? (p as any).price ?? 0,
      priceCents: p.priceCents ?? (p as any).price ?? 0
    }
  ]));

  return orders.map(order => {
    const totCents = order.totalAmountCents ?? (order as any).totalAmount ?? 0;
    return {
      order: {
        ...order,
        paymentMethod: paymentMethodsMap.get(order.paymentMethodId)?.code || 'inconnu',
        // Le libellé vient de la configuration du club : plus de table de libellés côté écran.
        paymentMethodLabel: paymentMethodsMap.get(order.paymentMethodId)?.label || 'Inconnu',
        totalAmount: totCents,
        totalAmountCents: totCents
      },
      member: membersMap.get(order.memberId),
      product: productsMap.get(order.productId)
    };
  }) as any;
}
