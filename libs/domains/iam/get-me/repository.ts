import { sql } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';

export class BootstrapRepository {
  /**
   * Crée le tout premier compte d'administration, et lui seul.
   *
   * La condition « la table est vide » est la propriété de sécurité de ce bootstrap :
   * elle est donc évaluée *dans* l'INSERT, pas par un SELECT préalable. Deux
   * premières requêtes concurrentes créeraient sinon toutes les deux un super
   * administrateur.
   *
   * Retourne l'identifiant créé, ou `null` si la table n'était pas vide.
   */
  async createFirstAdmin(db: DbOrTx, email: string, name: string, now: Date): Promise<number | null> {
    const seconds = Math.floor(now.getTime() / 1000);

    const inserted = await db.all<{ id: number }>(sql`
      INSERT INTO admin_users (email, name, permissions, created_at)
      SELECT ${email}, ${name}, '[]', ${seconds}
      WHERE NOT EXISTS (SELECT 1 FROM admin_users)
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (id === undefined) return null;

    await db.run(sql`
      INSERT OR IGNORE INTO admin_user_roles (user_id, role, created_at)
      VALUES (${id}, 'super_admin', ${seconds})
    `);

    return id;
  }
}
