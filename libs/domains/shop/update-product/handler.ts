import { UpdateProductRepository } from './repository';
import { ProductNotFoundError } from '../shared/errors';
import { UpdateProductId, UpdateProductInput, UpdateProductOutput } from "./dto";

export async function updateProduct(db: any, id: UpdateProductId, body: UpdateProductInput): Promise<UpdateProductOutput> {
  const repo = new UpdateProductRepository();
  const updated = await repo.update(db, id, body);
  if (!updated) {
    throw new ProductNotFoundError();
  }
  return updated;
}
