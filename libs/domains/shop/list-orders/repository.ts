import { eq, and, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@metacult/shared-db';
import { ordersTable, productsTable } from '../shared/schema';
import { getMembersByIds } from '@metacult/features-members-api';

export class ListOrdersRepository {
  async list(db: DbOrTx, filters: { season?: string; status?: string }): Promise<(typeof ordersTable.$inferSelect)[]> {
    const conditions = [];
    if (filters.season) conditions.push(eq(ordersTable.seasonId, filters.season));
    if (filters.status) conditions.push(eq(ordersTable.status, filters.status));

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
