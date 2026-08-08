import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { createUser } from '../create-user/handler';
import { updateUserRoles } from './handler';
import { deleteUser } from '../delete-user/handler';
import { getActor } from '../get-actor/handler';
import { listUsers } from '../list-users/handler';
import { AdminUserNotFoundError, DuplicateAdminUserError, LastSuperAdminError } from '../shared/errors';

describe('createUser', () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('attribue le rôle « membre » quand aucun rôle n’est fourni', async () => {
    // Un compte sans rôle n'aurait accès à rien, pas même à son tableau de bord.
    const created = await createUser(db, { email: 'nouveau@nozaybad.fr' });
    expect(created.roles).toEqual(['membre']);
  });

  it('déduit le nom de l’adresse quand il est absent', async () => {
    const created = await createUser(db, { email: 'jean.dupont@nozaybad.fr' });
    expect(created.name).toBe('jean.dupont');
  });

  it("normalise l'adresse", async () => {
    const created = await createUser(db, { email: '  Jean@NozayBad.fr ' });
    expect(created.email).toBe('jean@nozaybad.fr');
  });

  it('refuse une adresse déjà utilisée, quelle qu’en soit la casse', async () => {
    await createUser(db, { email: 'doublon@nozaybad.fr' });
    await expect(createUser(db, { email: 'DOUBLON@nozaybad.fr' })).rejects.toThrow(
      DuplicateAdminUserError
    );
  });

  it('dédoublonne les rôles fournis', async () => {
    const created = await createUser(db, {
      email: 'multi@nozaybad.fr',
      roles: ['tresorier', 'tresorier', 'secretaire']
    });
    expect(created.roles.sort()).toEqual(['secretaire', 'tresorier']);
  });
});

describe('updateUserRoles', () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('remplace les rôles au lieu de les cumuler', async () => {
    const user = await createUser(db, { email: 'a@nozaybad.fr', roles: ['tresorier'] });

    await updateUserRoles(db, user.id, { roles: ['secretaire'] });

    const actor = await getActor(db, 'a@nozaybad.fr');
    expect(actor?.roles).toEqual(['secretaire']);
    expect(actor?.permissions.has('accounting:ledger:write')).toBe(false);
  });

  it('retombe sur « membre » si la liste de rôles est vidée', async () => {
    const user = await createUser(db, { email: 'a@nozaybad.fr', roles: ['tresorier'] });

    const updated = await updateUserRoles(db, user.id, { roles: [] });

    expect(updated.roles).toEqual(['membre']);
  });

  it('renomme sans toucher aux rôles', async () => {
    const user = await createUser(db, { email: 'a@nozaybad.fr', roles: ['secretaire'] });

    const updated = await updateUserRoles(db, user.id, { name: 'Alice' });

    expect(updated.name).toBe('Alice');
    expect(updated.roles).toEqual(['secretaire']);
    expect((await getActor(db, 'a@nozaybad.fr'))?.roles).toEqual(['secretaire']);
  });

  it('renseigne updated_at', async () => {
    const user = await createUser(db, { email: 'a@nozaybad.fr', roles: ['membre'] });
    await updateUserRoles(db, user.id, { roles: ['secretaire'] }, new Date('2026-01-02T03:04:05Z'));

    const [row] = await listUsers(db);
    expect(row.updatedAt).toEqual(new Date('2026-01-02T03:04:05Z'));
  });

  it('refuse de retirer le rôle du dernier super administrateur', async () => {
    const boss = await createUser(db, { email: 'boss@nozaybad.fr', roles: ['super_admin'] });

    await expect(updateUserRoles(db, boss.id, { roles: ['membre'] })).rejects.toThrow(
      LastSuperAdminError
    );
    expect((await getActor(db, 'boss@nozaybad.fr'))?.roles).toEqual(['super_admin']);
  });

  it('accepte de le retirer dès qu’un autre super administrateur existe', async () => {
    const boss = await createUser(db, { email: 'boss@nozaybad.fr', roles: ['super_admin'] });
    await createUser(db, { email: 'relais@nozaybad.fr', roles: ['super_admin'] });

    const updated = await updateUserRoles(db, boss.id, { roles: ['membre'] });

    expect(updated.roles).toEqual(['membre']);
  });

  it('échoue sur un compte inexistant', async () => {
    await expect(updateUserRoles(db, 4242, { roles: ['membre'] })).rejects.toThrow(
      AdminUserNotFoundError
    );
  });
});

describe('deleteUser', () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('supprime le compte et ses rôles', async () => {
    await createUser(db, { email: 'boss@nozaybad.fr', roles: ['super_admin'] });
    const user = await createUser(db, { email: 'jetable@nozaybad.fr', roles: ['secretaire'] });

    await deleteUser(db, user.id);

    expect(await getActor(db, 'jetable@nozaybad.fr')).toBeNull();
    expect(await listUsers(db)).toHaveLength(1);
  });

  it('refuse de supprimer le dernier super administrateur', async () => {
    const boss = await createUser(db, { email: 'boss@nozaybad.fr', roles: ['super_admin'] });

    await expect(deleteUser(db, boss.id)).rejects.toThrow(LastSuperAdminError);
    expect(await listUsers(db)).toHaveLength(1);
  });

  it('échoue sur un compte inexistant', async () => {
    await expect(deleteUser(db, 4242)).rejects.toThrow(AdminUserNotFoundError);
  });
});
