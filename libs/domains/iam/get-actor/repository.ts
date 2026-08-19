import { eq } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { adminUsersTable, adminUserRolesTable, rolePermissionsTable } from '../shared/schema';

export interface AdminUserWithRoles {
  id: number;
  email: string;
  name: string;
  roles: string[];
}

export class GetActorRepository {
  /**
   * Charge un compte et ses rôles en une seule requête indexée.
   *
   * La jointure est externe : un compte sans rôle doit être trouvé (il existe, il
   * n'a simplement aucun droit) et non confondu avec un compte inconnu, qui lui
   * relève d'un refus pur et simple.
   */
  async findByEmail(db: DbOrTx, email: string): Promise<AdminUserWithRoles | null> {
    const rows = await db
      .select({
        id: adminUsersTable.id,
        email: adminUsersTable.email,
        name: adminUsersTable.name,
        role: adminUserRolesTable.role
      })
      .from(adminUsersTable)
      .leftJoin(adminUserRolesTable, eq(adminUserRolesTable.userId, adminUsersTable.id))
      .where(eq(adminUsersTable.email, email))
      .all();

    if (rows.length === 0) return null;

    return {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      roles: rows.map((r) => r.role).filter((r): r is string => r !== null)
    };
  }

  /**
   * Droits accordés par chaque rôle, tels que stockés.
   *
   * Une seule lecture non filtrée : la table fait au plus quelques centaines de
   * lignes, et la filtrer par rôle imposerait une requête par rôle du compte.
   */
  async listRolePermissions(db: DbOrTx): Promise<{ role: string; permission: string }[]> {
    return db
      .select({ role: rolePermissionsTable.role, permission: rolePermissionsTable.permission })
      .from(rolePermissionsTable)
      .all();
  }
}
