import { type Db } from '@metacult/shared-db';
import { ListProductsRepository } from './repository';
import { ListProductsInput, ListProductsOutput } from "./dto";

export async function listProducts(db: Db, filters: ListProductsInput): Promise<ListProductsOutput> {
  const repo = new ListProductsRepository();
  return repo.list(db, filters);
}
