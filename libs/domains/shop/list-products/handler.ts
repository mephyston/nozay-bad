import { type Db } from '@nba/db';
import { ListProductsRepository } from './repository';
import { ListProductsInput, ListProductsOutput } from "./dto";

export async function listProducts(db: Db, filters: ListProductsInput): Promise<ListProductsOutput> {
  const repo = new ListProductsRepository();
  const products = await repo.list(db, filters);
  return products.map(p => {
    const cents = p.priceCents ?? (p as any).price ?? 0;
    return {
      ...p,
      price: cents,
      priceCents: cents
    };
  }) as any;
}
