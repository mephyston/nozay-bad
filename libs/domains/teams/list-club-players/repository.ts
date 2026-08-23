import { and, desc, eq, inArray } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { playerRankingsTable, type PlayerRankingRow } from '../shared/schema';

export class ListClubPlayersRepository {
  /** La date de classement la plus récente connue, toutes saisons confondues. */
  async latestEloDate(db: DbOrTx): Promise<string | null> {
    const row = await db
      .select({ eloDate: playerRankingsTable.eloDate })
      .from(playerRankingsTable)
      .orderBy(desc(playerRankingsTable.eloDate))
      .limit(1)
      .get();
    return row?.eloDate ?? null;
  }

  /**
   * Les classements de tout un annuaire à une date, en une passe.
   *
   * Par lots de 90 licences, comme `getMembersByIds` : D1 plafonne le nombre de
   * paramètres liés d'une requête, et le club en compte plus du double. Une requête par
   * adhérent tiendrait dans la limite mais ferait deux cents allers-retours pour une
   * seule page.
   */
  async rankingsAt(db: DbOrTx, licences: string[], eloDate: string): Promise<PlayerRankingRow[]> {
    const rows: PlayerRankingRow[] = [];
    for (let i = 0; i < licences.length; i += 90) {
      rows.push(
        ...(await db
          .select()
          .from(playerRankingsTable)
          .where(
            and(
              eq(playerRankingsTable.eloDate, eloDate),
              inArray(playerRankingsTable.licence, licences.slice(i, i + 90))
            )
          )
          .all())
      );
    }
    return rows;
  }
}
