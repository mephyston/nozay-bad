import { eq, and, ne } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { adminUsersTable, adminUserRolesTable } from '../shared/schema';

export class DeleteUserRepository {
  async findById(db: DbOrTx, id: number): Promise<{ id: number; email: string } | null> {
    const row = await db
      .select({ id: adminUsersTable.id, email: adminUsersTable.email })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.id, id))
      .get();
    return row ?? null;
  }

  async isSuperAdmin(db: DbOrTx, userId: number): Promise<boolean> {
    const row = await db
      .select({ id: adminUserRolesTable.id })
      .from(adminUserRolesTable)
      .where(and(eq(adminUserRolesTable.userId, userId), eq(adminUserRolesTable.role, 'super_admin')))
      .get();
    return row !== undefined;
  }

  async hasOtherSuperAdmin(db: DbOrTx, excludedUserId: number): Promise<boolean> {
    const row = await db
      .select({ userId: adminUserRolesTable.userId })
      .from(adminUserRolesTable)
      .where(
        and(eq(adminUserRolesTable.role, 'super_admin'), ne(adminUserRolesTable.userId, excludedUserId))
      )
      .get();
    return row !== undefined;
  }

  /** Les rôles partent en cascade avec le compte (cf. migration 0012). */
  async deleteUser(db: DbOrTx, id: number): Promise<void> {
    await db.delete(adminUsersTable).where(eq(adminUsersTable.id, id)).run();
  }
}
