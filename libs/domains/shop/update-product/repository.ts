import { eq } from 'drizzle-orm';
import { productsTable } from '../data-access/src/schema';
import { UpdateProductRepositoryInterface } from '../shared/repository';

export class UpdateProductRepository implements UpdateProductRepositoryInterface {
  async update(db: any, id: number, values: {
    name?: string;
    price?: number;
    stock?: number;
    active?: boolean;
  }): Promise<any | undefined> {
    return db.update(productsTable).set(values).where(eq(productsTable.id, id)).returning().get();
  }
}
