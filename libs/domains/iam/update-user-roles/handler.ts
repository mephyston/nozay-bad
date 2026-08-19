import { type Db } from '@nba/db';
import { DEFAULT_ROLE, isRole, type Role } from '../shared/roles';
import { AdminUserNotFoundError, LastSuperAdminError } from '../shared/errors';
import { UpdateUserRolesRepository } from './repository';

export interface UpdateUserInput {
  name?: string;
  roles?: Role[];
}

export interface UpdateUserOutput {
  id: number;
  email: string;
  name: string;
  roles: Role[];
}

export async function updateUserRoles(
  db: Db,
  id: number,
  input: UpdateUserInput,
  now: Date = new Date()
): Promise<UpdateUserOutput> {
  const repo = new UpdateUserRolesRepository();
  const user = await repo.findById(db, id);
  if (!user) throw new AdminUserNotFoundError();

  let name = user.name;
  if (input.name !== undefined) {
    name = input.name.trim() || user.name;
    await repo.updateName(db, id, name, now);
  }

  if (input.roles === undefined) {
    // Renommage seul : on renvoie les rôles inchangés plutôt qu'une liste vide, qui
    // ferait croire à l'appelant que la modification les a effacés.
    const current = await repo.listRoles(db, id);
    return { id, email: user.email, name, roles: current.filter(isRole) };
  }

  const roles: Role[] = input.roles.length ? [...new Set(input.roles)] : [DEFAULT_ROLE];

  // Retirer son dernier super administrateur rendrait la gestion des accès
  // inatteignable : plus personne ne pourrait en désigner un autre.
  const losesSuperAdmin =
    !roles.includes('super_admin') && (await repo.hasRole(db, id, 'super_admin'));
  if (losesSuperAdmin && !(await repo.hasOtherSuperAdmin(db, id))) {
    throw new LastSuperAdminError();
  }

  await repo.replaceRoles(db, id, roles, now);
  if (input.name === undefined) await repo.touch(db, id, now);

  return { id, email: user.email, name, roles };
}
