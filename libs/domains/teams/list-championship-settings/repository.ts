import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { championshipSettingsTable, type ChampionshipSettingsRow } from '../shared/schema';

export class ListChampionshipSettingsRepository {
  async listBySeason(db: DbOrTx, seasonCode: string): Promise<ChampionshipSettingsRow[]> {
    return db
      .select()
      .from(championshipSettingsTable)
      .where(eq(championshipSettingsTable.seasonCode, seasonCode))
      .all();
  }
}
