import { eq } from 'drizzle-orm';
import { ordersTable, productsTable } from '../data-access/src/schema';

export class CreateOrderRepository {
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
