import { describe, it, expect, beforeEach } from 'vitest';
import { setupIamDb } from '../test-support';
import type { Db } from '@nba/db';
import { getMe } from './handler';
import { createUser } from '../create-user/handler';
import { listUsers } from '../list-users/handler';

describe('getMe', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupIamDb());
  });

  it('crée le tout premier administrateur avec le rôle super_admin', async () => {
    const { actor, bootstrapped } = await getMe(db, 'fondateur@nozaybad.fr');

    expect(bootstrapped).toBe(true);
    expect(actor?.roles).toEqual(['super_admin']);
    expect(actor?.permissions.has('iam:users:write')).toBe(true);
  });

  it("refuse toute adresse inconnue dès qu'un compte existe", async () => {
    await getMe(db, 'fondateur@nozaybad.fr');

    const { actor, bootstrapped } = await getMe(db, 'intrus@nozaybad.fr');

    expect(bootstrapped).toBe(false);
    expect(actor).toBeNull();
    expect(await listUsers(db)).toHaveLength(1);
  });

  it('ne bootstrape pas deux fois pour la même adresse', async () => {
    await getMe(db, 'fondateur@nozaybad.fr');
    const second = await getMe(db, 'fondateur@nozaybad.fr');

    expect(second.bootstrapped).toBe(false);
    expect(second.actor?.roles).toEqual(['super_admin']);
    expect(await listUsers(db)).toHaveLength(1);
  });

  it("ne bootstrape pas quand la table contient déjà un compte, même sans rôle", async () => {
    // La condition du bootstrap est « la table est vide », pas « personne n'est
    // administrateur » : sinon retirer tous les rôles rouvrirait la création d'un
    // super administrateur à la première adresse venue.
    await createUser(db, { email: 'membre@nozaybad.fr', roles: ['membre'] });

    const { actor, bootstrapped } = await getMe(db, 'opportuniste@nozaybad.fr');

    expect(bootstrapped).toBe(false);
    expect(actor).toBeNull();
  });

  it('retourne le compte existant sans le modifier', async () => {
    await createUser(db, { email: 'connu@nozaybad.fr', roles: ['secretaire'] });

    const { actor, bootstrapped } = await getMe(db, 'connu@nozaybad.fr');

    expect(bootstrapped).toBe(false);
    expect(actor?.roles).toEqual(['secretaire']);
  });

  it('rejette une adresse vide', async () => {
    const { actor, bootstrapped } = await getMe(db, '   ');

    expect(actor).toBeNull();
    expect(bootstrapped).toBe(false);
    expect(await listUsers(db)).toHaveLength(0);
  });
});
