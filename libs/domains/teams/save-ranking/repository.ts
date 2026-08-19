import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { playerRankingsTable, type PlayerRankingRow } from '../shared/schema';

export class SaveRankingRepository {
  async findAt(db: DbOrTx, licence: string, eloDate: string): Promise<PlayerRankingRow | undefined> {
    return db
      .select()
      .from(playerRankingsTable)
      .where(
        and(eq(playerRankingsTable.licence, licence), eq(playerRankingsTable.eloDate, eloDate))
      )
      .get();
  }

  async update(
    db: DbOrTx,
    id: number,
    values: Partial<typeof playerRankingsTable.$inferInsert>
  ): Promise<PlayerRankingRow> {
    const [row] = await db
      .update(playerRankingsTable)
      .set(values)
      .where(eq(playerRankingsTable.id, id))
      .returning();
    return row;
  }
}
