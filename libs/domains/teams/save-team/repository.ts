import { and, eq, ne } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { clubTeamsTable, type ClubTeamRow } from '../shared/schema';

export class SaveTeamRepository {
  async findById(db: DbOrTx, id: number): Promise<ClubTeamRow | undefined> {
    return db.select().from(clubTeamsTable).where(eq(clubTeamsTable.id, id)).get();
  }

  /**
   * Une autre équipe porte-t-elle déjà ce numéro dans ce championnat ?
   *
   * Vérifié avant l'écriture pour rendre un message lisible ; l'index unique reste le
   * garde-fou en cas de course. Le numéro n'est pas décoratif : deux équipes qui le
   * partagent rendraient la hiérarchie des valeurs indéterminée.
   */
  async findConflict(
    db: DbOrTx,
    values: { seasonCode: string; championship: string; number: number; exceptId?: number }
  ): Promise<ClubTeamRow | undefined> {
    const conditions = [
      eq(clubTeamsTable.seasonCode, values.seasonCode),
      eq(clubTeamsTable.championship, values.championship as ClubTeamRow['championship']),
      eq(clubTeamsTable.number, values.number)
    ];
    if (values.exceptId !== undefined) conditions.push(ne(clubTeamsTable.id, values.exceptId));

    return db.select().from(clubTeamsTable).where(and(...conditions)).get();
  }

  async insert(db: DbOrTx, values: typeof clubTeamsTable.$inferInsert): Promise<ClubTeamRow> {
    const [row] = await db.insert(clubTeamsTable).values(values).returning();
    return row;
  }

  async update(
    db: DbOrTx,
    id: number,
    values: Partial<typeof clubTeamsTable.$inferInsert>
  ): Promise<ClubTeamRow> {
    const [row] = await db.update(clubTeamsTable).set(values).where(eq(clubTeamsTable.id, id)).returning();
    return row;
  }
}
