import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { championshipSettingsTable, type ChampionshipSettingsRow } from '../shared/schema';

export class SaveChampionshipSettingsRepository {
  async find(
    db: DbOrTx,
    seasonCode: string,
    championship: ChampionshipSettingsRow['championship']
  ): Promise<ChampionshipSettingsRow | undefined> {
    return db
      .select()
      .from(championshipSettingsTable)
      .where(
        and(
          eq(championshipSettingsTable.seasonCode, seasonCode),
          eq(championshipSettingsTable.championship, championship)
        )
      )
      .get();
  }

  /**
   * Épingle les réglages, en s'appuyant sur l'index unique `(season_code, championship)`.
   *
   * Un « lire puis décider » laisserait deux enregistrements concurrents créer deux
   * lignes, et le calcul lirait alors une date au hasard des deux.
   */
  async upsert(
    db: DbOrTx,
    values: typeof championshipSettingsTable.$inferInsert
  ): Promise<ChampionshipSettingsRow> {
    const [row] = await db
      .insert(championshipSettingsTable)
      .values(values)
      .onConflictDoUpdate({
        target: [championshipSettingsTable.seasonCode, championshipSettingsTable.championship],
        set: {
          referenceEloDate: values.referenceEloDate ?? null,
          rulesUrl: values.rulesUrl ?? null,
          rulesLabel: values.rulesLabel ?? null,
          updatedAt: values.updatedAt
        }
      })
      .returning();
    return row;
  }
}
