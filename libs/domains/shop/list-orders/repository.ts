import { eq, and, inArray } from 'drizzle-orm';
import { ordersTable, productsTable } from '../data-access/src/schema';
import { getMembersByIds } from '@metacult/features-members-api';
import { ListOrdersRepositoryInterface } from '../shared/repository';

export class ListOrdersRepository implements ListOrdersRepositoryInterface {
  async list(db: any, filters: { season?: string; status?: string }): Promise<any[]> {
    const conditions = [];
    if (filters.season) conditions.push(eq(ordersTable.seasonId, filters.season));
    if (filters.status) conditions.push(eq(ordersTable.status, filters.status as any));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select().from(ordersTable).where(whereClause).all();
  }

  async getMembersByIds(db: any, ids: number[]): Promise<any[]> {
    if (ids.length === 0) return [];
    const members = await getMembersByIds(db, ids);
    return members.map((m: any) => ({
      id: m.id,
      lastName: m.lastName,
      firstName: m.firstName,
      licence: m.licence
    }));
  }

  async getProductsByIds(db: any, ids: number[]): Promise<any[]> {
    if (ids.length === 0) return [];
    return db.select().from(productsTable).where(inArray(productsTable.id, ids)).all();
  }
}
