import { sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { playerRankingsTable, rankingImportsTable } from '../shared/schema';
import { chunkForD1 } from '../shared/d1-batch';

/** Colonnes liées par ligne insérée dans `player_rankings` (`id` est auto-incrémenté). */
const RANKING_COLUMNS = 19;

/**
 * Reprend la valeur de la ligne rejetée par le conflit.
 *
 * Indispensable en écriture par paquets : un `set` littéral n'appliquerait que la
 * dernière ligne du lot à toutes celles en conflit.
 */
function sqlExcluded(column: string) {
  return sql.raw(`excluded.${column}`);
}

export class ImportRankingsRepository {
  /**
   * Enregistre les classements d'une date, sans jamais supprimer.
   *
   * L'écriture s'appuie sur l'index unique `(licence, elo_date)` : rejouer le même
   * export corrige les lignes au lieu de les doubler. Rien n'est effacé pour autant —
   * un export de début de saison ne contient que quelques licenciés, et purger ce qui
   * n'y figure pas ferait disparaître les classements de tout le club.
   */
  async upsertMany(
    db: DbOrTx,
    rows: Array<typeof playerRankingsTable.$inferInsert>
  ): Promise<number> {
    if (rows.length === 0) return 0;

    // Dix-neuf colonnes liées par ligne : D1 n'en accepte que cent par requête, soit
    // cinq lignes. Un nombre de lignes choisi à vue passerait les tests — qui en
    // insèrent trois — et casserait sur l'import réel, qui en compte deux cents.
    let written = 0;

    for (const chunk of chunkForD1(rows, RANKING_COLUMNS)) {
      await db
        .insert(playerRankingsTable)
        .values(chunk)
        .onConflictDoUpdate({
          target: [playerRankingsTable.licence, playerRankingsTable.eloDate],
          set: {
            seasonCode: sqlExcluded('season_code'),
            lastName: sqlExcluded('last_name'),
            firstName: sqlExcluded('first_name'),
            gender: sqlExcluded('gender'),
            category: sqlExcluded('category'),
            mutation: sqlExcluded('mutation'),
            singles: sqlExcluded('singles'),
            doubles: sqlExcluded('doubles'),
            mixed: sqlExcluded('mixed'),
            singlesRank: sqlExcluded('singles_rank'),
            doublesRank: sqlExcluded('doubles_rank'),
            mixedRank: sqlExcluded('mixed_rank'),
            cpphSingles: sqlExcluded('cpph_singles'),
            cpphDoubles: sqlExcluded('cpph_doubles'),
            cpphMixed: sqlExcluded('cpph_mixed'),
            source: sqlExcluded('source'),
            updatedAt: sqlExcluded('updated_at')
          }
        });
      written += chunk.length;
    }

    return written;
  }

  async recordImport(
    db: DbOrTx,
    values: typeof rankingImportsTable.$inferInsert
  ): Promise<void> {
    await db.insert(rankingImportsTable).values(values);
  }
}
