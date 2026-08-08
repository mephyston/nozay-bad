import { type Db } from '@nba/db';
import { isRole, type Role } from '../shared/roles';
import { ListUsersRepository } from './repository';
import type { AdminUserSummary } from './dto';

export async function listUsers(db: Db): Promise<AdminUserSummary[]> {
  const repo = new ListUsersRepository();
  const rows = await repo.listWithRoles(db);

  const byId = new Map<number, AdminUserSummary>();
  for (const row of rows) {
    let user = byId.get(row.id);
    if (!user) {
      user = {
        id: row.id,
        email: row.email,
        name: row.name,
        roles: [],
        permissions: row.permissions ?? [],
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };
      byId.set(row.id, user);
    }
    // Un rôle inconnu (rangé par une version antérieure) est masqué : l'afficher
    // laisserait croire qu'il accorde quelque chose, alors qu'il est ignoré partout.
    if (row.role && isRole(row.role)) user.roles.push(row.role as Role);
  }

  return [...byId.values()];
}
