import { ListOrdersRepository } from './repository';

export async function listOrders(db: any, filters: { season?: string; status?: string }) {
  const repo = new ListOrdersRepository();
  const orders = await repo.list(db, filters);

  const memberIds = Array.from(new Set(orders.map(o => o.memberId)));
  const productIds = Array.from(new Set(orders.map(o => o.productId)));

  const [membersList, productsList] = await Promise.all([
    repo.getMembersByIds(db, memberIds),
    repo.getProductsByIds(db, productIds),
  ]);

  const membersMap = new Map(membersList.map(m => [m.id, m]));
  const productsMap = new Map(productsList.map(p => [p.id, p]));

  return orders.map(order => ({
    order,
    member: membersMap.get(order.memberId),
    product: productsMap.get(order.productId)
  }));
}
