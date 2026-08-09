import { getAllSeasons } from '@nba/accounting-api';
import { and, eq, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { ordersTable, productsTable, productCategoriesTable } from '../shared/schema';
import { getMemberById } from '@nba/members-api';
import { 
  createRevenueLedgerEntry, 
  buildCreateRevenueLedgerEntryStatement,
  getPaymentMethodById as getAccountingPaymentMethodById,
  getAccountByCode as getAccountingAccountByCode
} from '@nba/accounting-api';

export class PayOrderRepository {
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

  async getPaymentMethodById(db: DbOrTx, id: number) {
    return getAccountingPaymentMethodById(db, id);
  }

  async getAccountByCode(db: DbOrTx, code: string) {
    return getAccountingAccountByCode(db, code);
  }

  async getAllSeasons(db: DbOrTx): Promise<any[]> {
    return getAllSeasons(db);
  }

  buildRecetteTransactionStatement(db: DbOrTx, values: {
    seasonId: number;
    paymentMethodId: number;
    categoryId: number | null;
    amountCents: number;
    description: string;
    memberId: number;
    date: string;
    accrualType?: string | null;
    accrualNote?: string | null;
  }): any {
    return buildCreateRevenueLedgerEntryStatement(db, {
      seasonId: values.seasonId,
      paymentMethodId: values.paymentMethodId,
      categoryId: values.categoryId,
      amountCents: values.amountCents,
      description: values.description,
      memberId: values.memberId,
      date: values.date,
      accrualType: values.accrualType,
      accrualNote: values.accrualNote
    });
  }

  /**
   * Rattache l'écriture de recette créée juste avant dans le même batch.
   * `last_insert_rowid()` ne vaut que pour un unique enfant : cette instruction doit
   * donc rester la seconde du batch, immédiatement après la création de l'écriture.
   */
  buildPayOrderStatement(db: DbOrTx, id: number, paidAt: string): any {
    return db.update(ordersTable)
      .set({
        status: 'paid',
        paidAt: paidAt,
        ledgerEntryId: sql`(SELECT last_insert_rowid())`
      })
      .where(and(eq(ordersTable.id, id), eq(ordersTable.status, 'awaiting_payment')));
  }

  async createRecetteTransaction(db: DbOrTx, values: {
    seasonId: number;
    paymentMethodId: number;
    categoryId: number | null;
    amountCents: number;
    description: string;
    memberId: number;
    date: string;
    accrualType?: string | null;
    accrualNote?: string | null;
  }): Promise<{ id: number }> {
    return createRevenueLedgerEntry(db, {
      seasonId: values.seasonId,
      paymentMethodId: values.paymentMethodId,
      categoryId: values.categoryId,
      amountCents: values.amountCents,
      description: values.description,
      memberId: values.memberId,
      date: values.date,
      accrualType: values.accrualType,
      accrualNote: values.accrualNote
    });
  }
}
