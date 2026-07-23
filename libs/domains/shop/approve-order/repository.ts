import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@metacult/shared-db';
import { ordersTable, productsTable, categoriesTable, transactionsTable } from '../shared/schema';
import { getMemberById } from '@metacult/features-members-api';

export class ApproveOrderRepository {
  async getOrderById(db: DbOrTx, id: number): Promise<typeof ordersTable.$inferSelect | undefined> {
    return db.select().from(ordersTable).where(eq(ordersTable.id, id)).get();
  }

  async getMemberById(db: DbOrTx, id: number): Promise<{ id: number; lastName: string; firstName: string } | undefined> {
    const member = await getMemberById(db, id);
    if (!member) return undefined;
    return {
      id: member.id,
      lastName: member.lastName,
      firstName: member.firstName
    };
  }

  async getProductById(db: DbOrTx, id: number): Promise<typeof productsTable.$inferSelect | undefined> {
    return db.select().from(productsTable).where(eq(productsTable.id, id)).get();
  }

  async getBoutiqueCategory(db: DbOrTx): Promise<number | null> {
    const boutiqueCat = await db.select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.adminLabel, 'Boutique'))
      .get();
    return boutiqueCat ? boutiqueCat.id : null;
  }

  async createRecetteTransaction(db: DbOrTx, values: {
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

  async approveWithLock(db: DbOrTx, id: number, transactionId: number): Promise<typeof ordersTable.$inferSelect | undefined> {
    return db.update(ordersTable)
      .set({ status: 'approved', transactionId })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'pending')))
      .returning()
      .get();
  }
}
