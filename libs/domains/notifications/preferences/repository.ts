import { and, eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { pushPreferencesTable } from '../shared/schema';

export class PreferencesRepository {
  /** Catégories explicitement coupées par ce compte. */
  async findDisabled(db: DbOrTx, email: string): Promise<string[]> {
    const rows = await db
      .select({ category: pushPreferencesTable.category })
      .from(pushPreferencesTable)
      .where(and(eq(pushPreferencesTable.email, email), eq(pushPreferencesTable.enabled, false)))
      .all();
    return rows.map((row) => row.category);
  }

  /**
   * Enregistre l'état d'une catégorie.
   *
   * On écrit aussi les réactivations (`enabled = true`) plutôt que de supprimer la
   * ligne : conserver la trace d'un choix explicite évite qu'un futur changement de
   * défaut ne réabonne quelqu'un qui s'était désabonné en connaissance de cause.
   */
  async upsert(db: DbOrTx, email: string, category: string, enabled: boolean, now: Date): Promise<void> {
    await db
      .insert(pushPreferencesTable)
      .values({ email, category, enabled, updatedAt: now })
      .onConflictDoUpdate({
        target: [pushPreferencesTable.email, pushPreferencesTable.category],
        set: { enabled, updatedAt: now }
      })
      .run();
  }

}
