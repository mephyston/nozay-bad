import { type DbOrTx } from '@nba/db';
import { cmsSiteSettingsTable, type CmsSiteSettingsRow } from '../../shared/schema';
import { SITE_SETTINGS_ID } from '../get-site-settings/repository';

type Values = Omit<CmsSiteSettingsRow, 'id'>;

export class SaveSiteSettingsRepository {
  /**
   * Écriture de la ligne unique, insertion ou mise à jour.
   *
   * `onConflictDoUpdate` plutôt qu'un `UPDATE` : la ligne est semée par la migration,
   * mais une base où elle manquerait avalerait l'enregistrement sans rien changer —
   * une panne qui ne se voit qu'en constatant que le pied de page n'a pas bougé.
   */
  async upsert(db: DbOrTx, values: Values): Promise<void> {
    await db
      .insert(cmsSiteSettingsTable)
      .values({ id: SITE_SETTINGS_ID, ...values })
      .onConflictDoUpdate({ target: cmsSiteSettingsTable.id, set: values })
      .run();
  }
}
