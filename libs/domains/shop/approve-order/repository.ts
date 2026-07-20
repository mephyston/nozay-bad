import { and, eq } from 'drizzle-orm';
import { ordersTable, productsTable } from '../data-access/src/schema';
import { membersTable } from '@metacult/features-members-data-access';
import { categoriesTable, transactionsTable } from '@metacult/features-accounting-data-access';
import { ApproveOrderRepositoryInterface } from '../shared/repository';

export class ApproveOrderRepository implements ApproveOrderRepositoryInterface {
  async getOrderById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
  }

  async getMemberById(db: any, id: number): Promise<any | undefined> {
    return db.select({
      id: membersTable.id,
      lastName: membersTable.lastName,
      firstName: membersTable.firstName,
    })
      .from(membersTable)
      .where(eq(membersTable.id, id))
      .get();
  }

  async getProductById(db: any, id: number): Promise<any | undefined> {
    return db.select().from(productsTable).where(eq(productsTable.id, id)).get();
  }

  async getBoutiqueCategory(db: any): Promise<number | null> {
    const boutiqueCat = await db.select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.adminLabel, 'Boutique'))
      .get();
    return boutiqueCat ? boutiqueCat.id : null;
  }

  async createRecetteTransaction(db: any, values: {
    seasonId: string;
    category: number | null;
    amount: number;
    description: string;
    memberId: number;
    paymentMethod: string;
  }): Promise<{ id: number }> {
    return db.insert(transactionsTable)
      .values({
        seasonId: values.seasonId,
        type: 'recette',
        accountId: 'current',
        category: values.category,
        amount: values.amount,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: values.paymentMethod as any,
        description: values.description,
        memberId: values.memberId,
        createdAt: new Date(),
      })
      .returning({ id: transactionsTable.id })
      .get();
  }

  async approveWithLock(db: any, id: number, transactionId: number): Promise<any | undefined> {
    return db.update(ordersTable)
      .set({ status: 'approved', transactionId })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'pending')))
      .returning()
      .get();
  }
}
