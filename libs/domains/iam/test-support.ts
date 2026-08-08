import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';

let cached: { db: Db; mockD1: D1Database } | null = null;

/**
 * Base de test partagée par fichier, remise à zéro entre les tests.
 *
 * `setupMockDb` supprime toutes les tables puis rejoue les treize migrations : à
 * raison d'un appel par test, le domaine iam à lui seul reconstruisait la base une
 * quarantaine de fois, ce qui dépassait le délai des hooks quand la suite complète
 * tourne en parallèle. Les tests iam ne touchant que deux tables, il suffit de les
 * vider — l'isolation est la même, pour une fraction du coût.
 */
export async function setupIamDb(): Promise<{ db: Db; mockD1: D1Database }> {
  if (!cached) {
    const setup = await setupMockDb();
    cached = { db: setup.db, mockD1: setup.mockD1 as D1Database };
  }
  await cached.db.run(sql`DELETE FROM admin_user_roles`);
  await cached.db.run(sql`DELETE FROM admin_users`);
  return cached;
}
