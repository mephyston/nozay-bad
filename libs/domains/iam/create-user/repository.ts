import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { adminUsersTable, adminUserRolesTable } from '../shared/schema';

export class CreateUserRepository {
  async findIdByEmail(db: DbOrTx, email: string): Promise<number | null> {
    const row = await db
      .select({ id: adminUsersTable.id })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.email, email))
      .get();
    return row?.id ?? null;
  }

  async insertUser(db: DbOrTx, email: string, name: string, now: Date): Promise<number> {
    const row = await db
      .insert(adminUsersTable)
      .values({
        email,
        name,
        // Colonne héritée, NOT NULL, que plus rien ne lit. Elle est conservée une
        // release comme unique copie des droits d'avant migration, puis supprimée.
        permissions: [],
        createdAt: now,
        updatedAt: now
      })
      .returning({ id: adminUsersTable.id })
      .get();
    return row.id;
  }

  async replaceRoles(db: DbOrTx, userId: number, roles: string[], now: Date): Promise<void> {
    await db.delete(adminUserRolesTable).where(eq(adminUserRolesTable.userId, userId)).run();
    if (roles.length === 0) return;
    await db
      .insert(adminUserRolesTable)
      .values(roles.map((role) => ({ userId, role, createdAt: now })))
      .run();
  }
}
