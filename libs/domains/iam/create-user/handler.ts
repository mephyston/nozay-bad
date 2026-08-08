import { type Db } from '@nba/db';
import { DEFAULT_ROLE, type Role } from '../shared/roles';
import { DuplicateAdminUserError } from '../shared/errors';
import { normalizeEmail } from '../get-actor/dto';
import { CreateUserRepository } from './repository';
import type { CreateUserInput, CreateUserOutput } from './dto';

export async function createUser(
  db: Db,
  input: CreateUserInput,
  now: Date = new Date()
): Promise<CreateUserOutput> {
  const email = normalizeEmail(input.email);
  const repo = new CreateUserRepository();

  if (await repo.findIdByEmail(db, email)) {
    throw new DuplicateAdminUserError();
  }

  // Un compte sans rôle n'aurait accès à rien, pas même à son tableau de bord :
  // l'absence de choix vaut « membre », pas « aucun droit ».
  const roles: Role[] = input.roles?.length ? [...new Set(input.roles)] : [DEFAULT_ROLE];
  const name = input.name?.trim() || email.split('@')[0];

  const id = await repo.insertUser(db, email, name, now);
  await repo.replaceRoles(db, id, roles, now);

  return { id, email, name, roles };
}
