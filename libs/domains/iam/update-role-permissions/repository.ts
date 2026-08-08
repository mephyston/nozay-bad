import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { rolePermissionsTable, rolePermissionLogTable } from '../shared/schema';

export class UpdateRolePermissionsRepository {
  async listForRole(db: DbOrTx, role: string): Promise<string[]> {
    const rows = await db
      .select({ permission: rolePermissionsTable.permission })
      .from(rolePermissionsTable)
      .where(eq(rolePermissionsTable.role, role))
      .all();
    return rows.map((r) => r.permission);
  }

  async replaceForRole(
    db: DbOrTx,
    role: string,
    permissions: string[],
    now: Date
  ): Promise<void> {
    await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.role, role)).run();
    if (permissions.length === 0) return;
    await db
      .insert(rolePermissionsTable)
      .values(permissions.map((permission) => ({ role, permission, createdAt: now })))
      .run();
  }

  /** Journal en ajout seul : il remplace la trace que git donnait gratuitement. */
  async log(
    db: DbOrTx,
    entries: { role: string; permission: string; action: 'granted' | 'revoked' }[],
    actorEmail: string,
    now: Date
  ): Promise<void> {
    if (entries.length === 0) return;
    await db
      .insert(rolePermissionLogTable)
      .values(entries.map((e) => ({ ...e, actorEmail, createdAt: now })))
      .run();
  }
}
