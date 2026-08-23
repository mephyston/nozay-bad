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
/** Au-delà, la saisie n'est plus une recherche : on borne la requête plutôt que la subir. */
const MAX_SEARCH_TERMS = 6;

export class ListMembersRepository {
  async buildConditions(db: DbOrTx, filters: ListMembersFilters) {
    const conditions = [];
    if (filters.search) {
      /*
       * Recherche par **termes**, chacun devant se retrouver quelque part.
       *
       * La saisie entière était comparée telle quelle à chaque colonne prise isolément :
       * « Chloé Gautier » ne correspondait donc à rien, le prénom et le nom vivant dans
       * deux colonnes. Et les noms à particule de Poona s'écrivent comme ils s'écrivent
       * — « GAUTIER DE LAHAUT » — de sorte que qui tape « Gautier de la haut » ne
       * trouvait rien non plus, sans comprendre pourquoi : l'adhérente était bien là.
       *
       * Chaque terme doit correspondre à l'une des colonnes ; l'ensemble des termes doit
       * correspondre. « de la haut » retrouve ainsi « DE LAHAUT », et « Gautier 0773 »
       * mêle sans peine le nom et la licence.
       */
      const terms = filters.search.trim().split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TERMS);
      for (const term of terms) {
        conditions.push(
          or(
            like(personsTable.firstName, `%${term}%`),
            like(personsTable.lastName, `%${term}%`),
            like(personsTable.licence, `%${term}%`)
          )
        );
      }
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
