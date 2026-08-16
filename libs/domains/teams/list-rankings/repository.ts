import { eq, sql, desc } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { playerRankingsTable, type PlayerRankingRow } from '../shared/schema';

export class ListRankingsRepository {
  /** Les dates de classement importées, de la plus récente à la plus ancienne. */
  async listDates(db: DbOrTx): Promise<Array<{ eloDate: string; players: number }>> {
    const rows = await db
      .select({
        eloDate: playerRankingsTable.eloDate,
        players: sql<number>`count(*)`
      })
      .from(playerRankingsTable)
      .groupBy(playerRankingsTable.eloDate)
      .orderBy(desc(playerRankingsTable.eloDate))
      .all();

    return rows.map((r) => ({ eloDate: r.eloDate, players: Number(r.players) }));
  }

  async listAt(db: DbOrTx, eloDate: string): Promise<PlayerRankingRow[]> {
    return db
      .select()
      .from(playerRankingsTable)
      .where(eq(playerRankingsTable.eloDate, eloDate))
      .orderBy(playerRankingsTable.lastName, playerRankingsTable.firstName)
      .all();
  }
}
