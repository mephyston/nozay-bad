import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { getActor } from './handler';
import { createUser } from '../create-user/handler';

describe('getActor', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it("retourne null pour une adresse sans compte", async () => {
    expect(await getActor(db, 'inconnu@nozaybad.fr')).toBeNull();
  });

  it('résout les permissions à partir des rôles', async () => {
    await createUser(db, { email: 'tresor@nozaybad.fr', roles: ['tresorier'] });

    const actor = await getActor(db, 'tresor@nozaybad.fr');

    expect(actor?.roles).toEqual(['tresorier']);
    expect(actor?.permissions.has('accounting:ledger:write')).toBe(true);
    expect(actor?.permissions.has('iam:users:write')).toBe(false);
  });

  it('fait l’union des permissions sur plusieurs rôles', async () => {
    await createUser(db, { email: 'double@nozaybad.fr', roles: ['tresorier', 'secretaire'] });

    const actor = await getActor(db, 'double@nozaybad.fr');

    expect(actor?.roles.sort()).toEqual(['secretaire', 'tresorier']);
    expect(actor?.permissions.has('accounting:ledger:write')).toBe(true); // trésorier
    expect(actor?.permissions.has('members:members:import')).toBe(true); // secrétaire
  });

  it('trouve un compte sans aucun rôle, avec zéro permission', async () => {
    // Distinct d'un compte inconnu : le compte existe, il n'a simplement aucun droit.
    // Le premier donne « accès refusé », le second « compte non configuré ».
    await createUser(db, { email: 'vide@nozaybad.fr', roles: ['membre'] });
    await db.run(sql`DELETE FROM admin_user_roles`);

    const actor = await getActor(db, 'vide@nozaybad.fr');

    expect(actor).not.toBeNull();
    expect(actor?.roles).toEqual([]);
    expect(actor?.permissions.size).toBe(0);
  });

  it('ignore un rôle inconnu au lieu de lui accorder quoi que ce soit', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await createUser(db, { email: 'legacy@nozaybad.fr', roles: ['membre'] });
    await db.run(sql`UPDATE admin_user_roles SET role = 'ancien_role'`);

    const actor = await getActor(db, 'legacy@nozaybad.fr');

    expect(actor?.roles).toEqual([]);
    expect(actor?.permissions.size).toBe(0);
    warn.mockRestore();
  });

  it("normalise la casse et les espaces de l'adresse", async () => {
    // Cloudflare Access renvoie l'adresse telle que déclarée par le fournisseur
    // d'identité, dont la casse peut varier d'une connexion à l'autre.
    await createUser(db, { email: 'Mixte@NozayBad.fr', roles: ['membre'] });

    expect(await getActor(db, '  MIXTE@nozaybad.FR ')).not.toBeNull();
  });
});
