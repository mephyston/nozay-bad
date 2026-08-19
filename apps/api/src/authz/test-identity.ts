import { sql } from 'drizzle-orm';
import type { Db } from '@nba/db';
import { clearActorCache } from './actor';

export const TEST_ADMIN_EMAIL = 'test-admin@nozaybad.fr';

/**
 * Crée un super administrateur pour les tests qui traversent l'API composée.
 *
 * Vide aussi le cache de résolution : celui-ci vit à l'échelle de l'isolate, donc
 * d'un test à l'autre, et servirait sinon l'acteur d'une base déjà réinitialisée.
 */
export async function seedTestAdmin(db: Db, email: string = TEST_ADMIN_EMAIL): Promise<void> {
  clearActorCache();
  await db.run(sql`
    INSERT OR IGNORE INTO admin_users (email, name, permissions, created_at)
    VALUES (${email}, 'Test Admin', '[]', 0)
  `);
  await db.run(sql`
    INSERT OR IGNORE INTO admin_user_roles (user_id, role, created_at)
    SELECT id, 'super_admin', 0 FROM admin_users WHERE email = ${email}
  `);
}

/** Variante : crée un compte doté des rôles fournis. */
export async function seedTestUser(db: Db, email: string, roles: string[]): Promise<void> {
  clearActorCache();
  await db.run(sql`
    INSERT OR IGNORE INTO admin_users (email, name, permissions, created_at)
    VALUES (${email}, ${email.split('@')[0]}, '[]', 0)
  `);
  for (const role of roles) {
    await db.run(sql`
      INSERT OR IGNORE INTO admin_user_roles (user_id, role, created_at)
      SELECT id, ${role}, 0 FROM admin_users WHERE email = ${email}
    `);
  }
}
