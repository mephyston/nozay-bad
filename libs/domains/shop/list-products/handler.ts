import { ListProductsRepository } from './repository';

export async function listProducts(db: any, filters: { category?: string; active?: boolean }) {
  const repo = new ListProductsRepository();
  return repo.list(db, filters);
}
