import { eq } from 'drizzle-orm';
import { ordersTable, productsTable } from '../data-access/src/schema';
import { CreateOrderRepositoryInterface } from '../shared/repository';

export class CreateOrderRepository implements CreateOrderRepositoryInterface {
  async getProductById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(productsTable).where(eq(productsTable.id, id)).get();
  }

  async create(db: any, values: {
    seasonId: string;
    memberId: number;
    productId: number;
    quantity: number;
    totalAmount: number;
    paymentMethod: string;
    status: 'pending';
    createdAt: Date;
  }): Promise<any> {
    return db.insert(ordersTable).values(values).returning().get();
  }
}
