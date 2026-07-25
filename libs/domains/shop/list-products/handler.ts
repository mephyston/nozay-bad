import { type Db } from '@nba/db';
import { ListProductsRepository } from './repository';
import { ListProductsInput, ListProductsOutput } from "./dto";

export async function listProducts(db: Db, filters: ListProductsInput): Promise<ListProductsOutput> {
  const repo = new ListProductsRepository();
  const products = await repo.list(db, filters);
  return products.map(p => {
    const cents = p.priceCents ?? (p as any).price ?? 0;
    const categoryKey = p.productCategoryId === 1 ? 'shuttlecock' : p.productCategoryId === 2 ? 'string' : 'other';
    return {
      ...p,
      category: (p as any).category ?? categoryKey,
      categoryLabel: p.categoryLabel ?? (categoryKey === 'shuttlecock' ? 'Volants' : categoryKey === 'string' ? 'Cordages' : 'Autre'),
      price: cents,
      priceCents: cents
    };
  }) as any;
}
