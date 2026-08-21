import { membershipsTable, personsTable } from '@nba/members/schema';
import { getSeasonId } from '@nba/accounting-api';
import { eq, and, or, like, sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { selectMembers, type MemberSummary } from '../shared/queries';

import { ListMembersFilters } from './dto';

/**
 * La liste porte sur les **adhésions** : on cherche qui est adhérent d'une saison, pas qui
 * est connu du club. Les critères se répartissent donc entre les deux tables — l'identité
 * et la licence côté personne, le tarif, l'état du dossier et le règlement côté adhésion.
 */
export class ListMembersRepository {
  async buildConditions(db: DbOrTx, filters: ListMembersFilters) {
    const conditions = [];
    if (filters.search) {
      conditions.push(
        or(
          like(personsTable.firstName, `%${filters.search}%`),
          like(personsTable.lastName, `%${filters.search}%`),
          like(personsTable.licence, `%${filters.search}%`)
        )
      );
    }
    if (filters.gender) {
      conditions.push(eq(personsTable.gender, filters.gender));
    }
    if (filters.type) {
      conditions.push(eq(membershipsTable.type, filters.type));
    }
    if (filters.status) {
      conditions.push(eq(membershipsTable.status, filters.status as any));
    }
    if (filters.season) {
      const sId = await getSeasonId(db, filters.season);
      if (sId !== undefined) {
        conditions.push(eq(membershipsTable.seasonId, sId));
      } else {
        // Saison inconnue : aucune adhésion, plutôt que toutes.
        conditions.push(eq(membershipsTable.seasonId, -1));
      }
    }
    if (filters.paid !== undefined) {
      conditions.push(eq(membershipsTable.paid, filters.paid));
    }
    return conditions;
  }

  async count(db: DbOrTx, filters: ListMembersFilters): Promise<number> {
    const conditions = await this.buildConditions(db, filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const countRes = await db.select({ count: sql<number>`count(*)` })
      .from(membershipsTable)
      .innerJoin(personsTable, eq(personsTable.id, membershipsTable.personId))
      .where(whereClause)
      .all();
    return countRes[0]?.count || 0;
  }

  async list(db: DbOrTx, filters: ListMembersFilters, pagination: { limit: number; offset: number }): Promise<MemberSummary[]> {
    const conditions = await this.buildConditions(db, filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return selectMembers(db)
      .where(whereClause)
      .limit(pagination.limit)
      .offset(pagination.offset)
      .all();
  }
}
