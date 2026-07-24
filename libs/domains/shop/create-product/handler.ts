import { type Db } from '@nba/db';
import { CreateProductRepository } from './repository';
import { CreateProductInput, CreateProductOutput } from "./dto";

export async function createProduct(db: Db, body: CreateProductInput): Promise<CreateProductOutput> {
  const repo = new CreateProductRepository();
  return repo.create(db, {
    name: body.name,
    productCategoryId: body.productCategoryId,
    priceCents: body.priceCents,
    stock: body.stock ?? 0,
    active: body.active !== false,
    createdAt: new Date()
  });
}
