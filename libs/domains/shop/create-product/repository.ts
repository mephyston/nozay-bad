import { productsTable } from '../shared/schema';

export class CreateProductRepository {
  async create(db: any, values: {
    name: string;
    category: 'shuttlecock' | 'string' | 'other';
    price: number;
    stock: number;
    active: boolean;
    createdAt: Date;
  }): Promise<any> {
    return db.insert(productsTable).values(values).returning().get();
  }
}
