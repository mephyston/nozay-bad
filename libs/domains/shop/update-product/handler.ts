import { UpdateProductRepository } from './repository';
import { ProductNotFoundError } from '../shared/errors';

export async function updateProduct(db: any, id: number, body: {
  name?: string;
  price?: number;
  stock?: number;
  active?: boolean;
}) {
  const repo = new UpdateProductRepository();
  const updated = await repo.update(db, id, body);
  if (!updated) {
    throw new ProductNotFoundError();
  }
  return updated;
}
