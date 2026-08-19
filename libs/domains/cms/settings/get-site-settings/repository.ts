import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { cmsSiteSettingsTable, type CmsSiteSettingsRow } from '../../shared/schema';

/** Identifiant de la ligne unique, à l'image de la version de contenu. */
export const SITE_SETTINGS_ID = 1;

export class GetSiteSettingsRepository {
  async find(db: DbOrTx): Promise<CmsSiteSettingsRow | undefined> {
    return db
      .select()
      .from(cmsSiteSettingsTable)
      .where(eq(cmsSiteSettingsTable.id, SITE_SETTINGS_ID))
      .get();
  }
}
