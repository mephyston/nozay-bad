import { CreateProductRepository } from './repository';
import { CreateProductInput, CreateProductOutput } from "./dto";

export async function createProduct(db: any, body: CreateProductInput): Promise<CreateProductOutput> {
  const repo = new CreateProductRepository();
  return repo.create(db, {
    name: body.name,
    category: body.category,
    price: body.price,
    stock: body.stock,
    active: body.active !== false,
    createdAt: new Date()
  });
}
