import { eq, asc } from 'drizzle-orm';
import { type DbOrTx } from '@nba/db';
import { adminUsersTable, adminUserRolesTable } from '../shared/schema';

export interface AdminUserRow {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date | null;
  role: string | null;
}

export class ListUsersRepository {
  /** Un compte par ligne et par rôle ; l'agrégation revient au handler. */
  async listWithRoles(db: DbOrTx): Promise<AdminUserRow[]> {
    return db
      .select({
        id: adminUsersTable.id,
        email: adminUsersTable.email,
        name: adminUsersTable.name,
        createdAt: adminUsersTable.createdAt,
        updatedAt: adminUsersTable.updatedAt,
        role: adminUserRolesTable.role
      })
      .from(adminUsersTable)
      .leftJoin(adminUserRolesTable, eq(adminUserRolesTable.userId, adminUsersTable.id))
      .orderBy(asc(adminUsersTable.email))
      .all();
  }
}
