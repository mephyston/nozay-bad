import { eq, and, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { ordersTable, productsTable } from '../shared/schema';
import { getMembersByIds } from '@nba/members-api';
import { paymentMethodsTable } from '@nba/accounting/schema';

export class ListOrdersRepository {
  async getPaymentMethods(db: DbOrTx) {
    return db.select().from(paymentMethodsTable).all();
  }
  async list(db: DbOrTx, filters: { seasonId?: number; status?: string; memberId?: number }): Promise<(typeof ordersTable.$inferSelect)[]> {
    const conditions = [];
    if (filters.seasonId) conditions.push(eq(ordersTable.seasonId, filters.seasonId));
    if (filters.status) conditions.push(eq(ordersTable.status, filters.status as 'pending' | 'approved' | 'rejected'));
    if (filters.memberId) conditions.push(eq(ordersTable.memberId, filters.memberId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select().from(ordersTable).where(whereClause).all();
  }

  async getMembersByIds(db: DbOrTx, ids: number[]): Promise<{ id: number; lastName: string; firstName: string; licence: string }[]> {
    if (ids.length === 0) return [];
    const members = await getMembersByIds(db, ids);
    return members.map((m) => ({
      id: m.id,
      lastName: m.lastName,
      firstName: m.firstName,
      licence: m.licence
    }));
  }

  async getProductsByIds(db: DbOrTx, ids: number[]): Promise<(typeof productsTable.$inferSelect)[]> {
    if (ids.length === 0) return [];
    return db.select().from(productsTable).where(inArray(productsTable.id, ids)).all();
  }
}
