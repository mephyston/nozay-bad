import { eq, and, ne } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { adminUsersTable, adminUserRolesTable } from '../shared/schema';

export class UpdateUserRolesRepository {
  async findById(db: DbOrTx, id: number): Promise<{ id: number; email: string; name: string } | null> {
    const row = await db
      .select({ id: adminUsersTable.id, email: adminUsersTable.email, name: adminUsersTable.name })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, id))
      .get();
    return row ?? null;
  }

  /** Existe-t-il un super administrateur *autre* que ce compte ? */
  async hasOtherSuperAdmin(db: DbOrTx, excludedUserId: number): Promise<boolean> {
    const row = await db
      .select({ userId: adminUserRolesTable.userId })
      .from(adminUserRolesTable)
      .where(
        and(
          eq(adminUserRolesTable.role, 'super_admin'),
          ne(adminUserRolesTable.userId, excludedUserId)
        )
      )
      .get();
    return row !== undefined;
  }

  async listRoles(db: DbOrTx, userId: number): Promise<string[]> {
    const rows = await db
      .select({ role: adminUserRolesTable.role })
      .from(adminUserRolesTable)
      .where(eq(adminUserRolesTable.userId, userId))
      .all();
    return rows.map((r) => r.role);
  }

  async hasRole(db: DbOrTx, userId: number, role: string): Promise<boolean> {
    const row = await db
      .select({ id: adminUserRolesTable.id })
      .from(adminUserRolesTable)
      .where(and(eq(adminUserRolesTable.userId, userId), eq(adminUserRolesTable.role, role)))
      .get();
    return row !== undefined;
  }

  async updateName(db: DbOrTx, id: number, name: string, now: Date): Promise<void> {
    await db.update(adminUsersTable).set({ name, updatedAt: now }).where(eq(adminUsersTable.id, id)).run();
  }

  /**
   * Colonne héritée, encore lue par l'application admin jusqu'à son passage aux
   * rôles (phase 3) : sans cette recopie, modifier un compte pendant la transition
   * lui retirerait ses droits.
   * @deprecated
   */
  async updateLegacyPermissions(
    db: DbOrTx,
    id: number,
    permissions: string[],
    now: Date
  ): Promise<void> {
    await db
      .update(adminUsersTable)
      .set({ permissions, updatedAt: now })
      .where(eq(adminUsersTable.id, id))
      .run();
  }

  async touch(db: DbOrTx, id: number, now: Date): Promise<void> {
    await db.update(adminUsersTable).set({ updatedAt: now }).where(eq(adminUsersTable.id, id)).run();
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
