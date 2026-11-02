import { type DbOrTx } from '@nba/db';
import { championshipSettingsTable, type ChampionshipSettingsRow } from '../shared/schema';

export class PublishRostersRepository {
  /**
   * Pose ou retire la date de publication, sans toucher aux autres réglages.
   *
   * Upsert sur l'index `(season_code, championship)` : un championnat dont personne n'a
   * encore réglé la date de classement n'a pas de ligne, et sa publication doit la créer.
   */
  async setPublishedAt(
    db: DbOrTx,
    seasonCode: string,
    championship: ChampionshipSettingsRow['championship'],
    publishedAt: Date | null,
    now: Date
  ): Promise<ChampionshipSettingsRow> {
    const [row] = await db
      .insert(championshipSettingsTable)
      .values({ seasonCode, championship, rostersPublishedAt: publishedAt, updatedAt: now })
      .onConflictDoUpdate({
        target: [championshipSettingsTable.seasonCode, championshipSettingsTable.championship],
        set: { rostersPublishedAt: publishedAt, updatedAt: now }
      })
      .returning();
    return row;
  }
}
