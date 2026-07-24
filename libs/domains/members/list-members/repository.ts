import { eq, and, or, like, sql, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { membersTable, seasonsTable } from '../shared/schema';
import { ListMembersFilters } from './dto';

export class ListMembersRepository {
  private buildConditions(db: DbOrTx, filters: ListMembersFilters) {
    const conditions = [];
    if (filters.search) {
      conditions.push(
        or(
          like(membersTable.firstName, `%${filters.search}%`),
          like(membersTable.lastName, `%${filters.search}%`),
          like(membersTable.licence, `%${filters.search}%`)
        )
      );
    }
    if (filters.gender) {
      conditions.push(eq(membersTable.gender, filters.gender));
    }
    if (filters.type) {
      conditions.push(eq(membersTable.type, filters.type));
    }
    if (filters.status) {
      conditions.push(eq(membersTable.status, filters.status));
    }
    if (filters.season) {
      const num = Number(filters.season);
      if (!isNaN(num) && Number.isInteger(num)) {
        conditions.push(eq(membersTable.seasonId, num));
      } else {
        const seasonSubquery = db.select({ id: seasonsTable.id }).from(seasonsTable).where(eq(seasonsTable.code, filters.season));
        conditions.push(inArray(membersTable.seasonId, seasonSubquery));
      }
    }
    if (filters.paid !== undefined) {
      conditions.push(eq(membersTable.paid, filters.paid));
    }
    return conditions;
  }

  async count(db: DbOrTx, filters: ListMembersFilters): Promise<number> {
    const conditions = this.buildConditions(db, filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const countRes = await db.select({ count: sql<number>`count(*)` })
      .from(membersTable)
      .where(whereClause)
      .all();
    return countRes[0]?.count || 0;
  }

  async list(db: DbOrTx, filters: ListMembersFilters, pagination: { limit: number; offset: number }): Promise<(typeof membersTable.$inferSelect)[]> {
    const conditions = this.buildConditions(db, filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return db.select()
      .from(membersTable)
      .where(whereClause)
      .limit(pagination.limit)
      .offset(pagination.offset)
      .all();
  }
}
