import { type Db } from '@nba/db';
import { AdminUserNotFoundError, LastSuperAdminError } from '../shared/errors';
import { DeleteUserRepository } from './repository';

export async function deleteUser(db: Db, id: number): Promise<{ email: string }> {
  const repo = new DeleteUserRepository();
  const user = await repo.findById(db, id);
  if (!user) throw new AdminUserNotFoundError();

  // Supprimer le dernier super administrateur laisserait la gestion des accès sans
  // titulaire, sans moyen d'en désigner un nouveau depuis l'application.
  if ((await repo.isSuperAdmin(db, id)) && !(await repo.hasOtherSuperAdmin(db, id))) {
    throw new LastSuperAdminError(
      'Impossible de supprimer le dernier super administrateur : désignez-en un autre au préalable.'
    );
  }

  await repo.deleteUser(db, id);
  return { email: user.email };
}
