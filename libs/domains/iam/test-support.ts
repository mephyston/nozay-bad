import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { ROLE_PERMISSIONS } from './shared/roles';

let cached: { db: Db; mockD1: D1Database } | null = null;

/**
 * Base de test partagée par fichier, remise à zéro entre les tests.
 *
 * `setupMockDb` supprime toutes les tables puis rejoue les migrations : à raison d'un
 * appel par test, le domaine iam à lui seul reconstruisait la base une quarantaine de
 * fois, ce qui dépassait le délai des hooks quand la suite complète tourne en
 * parallèle. Les tests iam ne touchant que quelques tables, il suffit de les remettre
 * dans leur état de départ — l'isolation est la même, pour une fraction du coût.
 *
 * Les droits par rôle sont resemés depuis `ROLE_PERMISSIONS`, comme le fait la
 * migration : sans cela, un test qui modifie un rôle laisserait la base altérée pour
 * les suivants.
 */
export async function setupIamDb(): Promise<{ db: Db; mockD1: D1Database }> {
  if (!cached) {
    const setup = await setupMockDb();
    cached = { db: setup.db, mockD1: setup.mockD1 as D1Database };
  }
  const { db } = cached;

  await db.run(sql`DELETE FROM admin_user_roles`);
  await db.run(sql`DELETE FROM admin_users`);
  await db.run(sql`DELETE FROM role_permission_log`);
  await db.run(sql`DELETE FROM role_permissions`);

  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    // `super_admin` n'est jamais stocké : il vaut le catalogue entier, calculé.
    if (role === 'super_admin') continue;
    for (const permission of permissions) {
      await db.run(
        sql`INSERT INTO role_permissions (role, permission, created_at) VALUES (${role}, ${permission}, 0)`
      );
    }
  }

  return cached;
}
