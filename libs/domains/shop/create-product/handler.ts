import { CreateProductRepository } from './repository';

export async function createProduct(db: any, body: {
  name: string;
  category: 'shuttlecock' | 'string' | 'other';
  price: number;
  stock: number;
  active?: boolean;
}) {
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
