import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { ordersTable, productsTable, productCategoriesTable } from '../shared/schema';
import { paymentMethodsTable } from '@nba/accounting/schema';
import { accountsTable } from '@nba/accounting/schema';
import { getMemberById } from '@nba/members-api';
import { createRevenueLedgerEntry } from '@nba/accounting-api';

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

  async getProductCategoryById(db: DbOrTx, id: number): Promise<typeof productCategoriesTable.$inferSelect | undefined> {
    return db.select().from(productCategoriesTable).where(eq(productCategoriesTable.id, id)).get();
  }

  async getPaymentMethodById(db: DbOrTx, id: number): Promise<typeof paymentMethodsTable.$inferSelect | undefined> {
    return db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, id)).get();
  }

  async getAccountByCode(db: DbOrTx, code: string): Promise<typeof accountsTable.$inferSelect | undefined> {
    return db.select().from(accountsTable).where(eq(accountsTable.code, code)).get();
  }

  async createRecetteTransaction(db: DbOrTx, values: {
    seasonId: number;
    accountId: number;
    paymentMethodId: number;
    categoryId: number | null;
    amountCents: number;
    description: string;
    memberId: number;
  }): Promise<{ id: number }> {
    return createRevenueLedgerEntry(db, {
      seasonId: values.seasonId,
      accountId: values.accountId,
      paymentMethodId: values.paymentMethodId,
      categoryId: values.categoryId,
      amountCents: values.amountCents,
      description: values.description,
      memberId: values.memberId,
      date: new Date().toISOString().split('T')[0]
    });
  }

  async approveWithLock(db: DbOrTx, id: number, ledgerEntryId: number): Promise<typeof ordersTable.$inferSelect | undefined> {
    return db.update(ordersTable)
      .set({ status: 'approved', ledgerEntryId })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'pending')))
      .returning()
      .get();
  }
}
