import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import type { Db } from '@nba/db';
import { setupIamDb } from '../test-support';
import { ROLE_PERMISSIONS } from '../shared/roles';
import { getActor } from '../get-actor/handler';
import { createUser } from '../create-user/handler';
import { listRolePermissions } from '../list-role-permissions/handler';
import { updateRolePermissions, ImmutableRoleError, RoleNotFoundError } from './handler';

const ACTOR = 'boss@nozaybad.fr';

describe('updateRolePermissions', () => {
  let db: Db;

  beforeEach(async () => {
    // setupIamDb resème les droits par rôle depuis le code : chaque test part de la
    // définition d'origine.
    ({ db } = await setupIamDb());
  });

  async function permissionsOf(role: string): Promise<string[]> {
    const rows = (await db.all(
      sql`SELECT permission FROM role_permissions WHERE role = ${role} ORDER BY permission`
    )) as { permission: string }[];
    return rows.map((r) => r.permission);
  }

  it('remplace les droits du rôle', async () => {
    const result = await updateRolePermissions(
      db,
      'coach',
      ['shop:products:read', 'members:members:read'],
      ACTOR
    );

    expect(result.permissions).toContain('shop:products:read');
    expect(result.permissions).not.toContain('shop:orders:write');
    expect(await permissionsOf('coach')).toContain('members:members:read');
  });

  it("réimpose le socle commun, même s'il est retiré", async () => {
    // Un compte privé de son tableau de bord ne verrait plus rien après connexion,
    // sans comprendre pourquoi ; ces droits n'ouvrent aucune donnée sensible.
    const result = await updateRolePermissions(db, 'coach', [], ACTOR);
    expect(result.permissions.sort()).toEqual(['dashboard:overview:read', 'help:docs:read']);
  });

  it('refuse de modifier super_admin', async () => {
    // Figé en base, il n'obtiendrait pas les permissions ajoutées par les
    // fonctionnalités futures, et lui retirer son droit d'édition fermerait la
    // gestion des rôles sans recours.
    await expect(updateRolePermissions(db, 'super_admin', [], ACTOR)).rejects.toThrow(
      ImmutableRoleError
    );
  });

  it('refuse un rôle inconnu', async () => {
    await expect(updateRolePermissions(db, 'dieu', [], ACTOR)).rejects.toThrow(RoleNotFoundError);
  });

  it('ignore une permission hors catalogue', async () => {
    const result = await updateRolePermissions(
      db,
      'membre',
      ['dashboard:overview:read', 'accounting:tout:casser' as never],
      ACTOR
    );
    expect(result.permissions).not.toContain('accounting:tout:casser');
  });

  it('journalise chaque ajout et retrait avec son auteur', async () => {
    await updateRolePermissions(db, 'coach', ['shop:products:read'], ACTOR);

    const log = (await db.all(
      sql`SELECT role, permission, action, actor_email FROM role_permission_log ORDER BY action, permission`
    )) as { role: string; permission: string; action: string; actor_email: string }[];

    expect(log.length).toBeGreaterThan(0);
    expect(log.every((e) => e.actor_email === ACTOR)).toBe(true);
    expect(log.some((e) => e.action === 'revoked' && e.permission === 'shop:orders:write')).toBe(true);
  });

  it("n'écrit rien au journal quand rien ne change", async () => {
    await updateRolePermissions(db, 'coach', [...ROLE_PERMISSIONS.coach], ACTOR);

    const n = (await db.get(sql`SELECT COUNT(*) AS n FROM role_permission_log`)) as { n: number };
    expect(n.n).toBe(0);
  });

  it('change immédiatement les droits effectifs des comptes portant ce rôle', async () => {
    await createUser(db, { email: 'entraineur@nozaybad.fr', roles: ['coach'] });
    expect((await getActor(db, 'entraineur@nozaybad.fr'))?.permissions.has('shop:orders:write')).toBe(true);

    await updateRolePermissions(db, 'coach', ['members:members:read'], ACTOR);

    const actor = await getActor(db, 'entraineur@nozaybad.fr');
    expect(actor?.permissions.has('shop:orders:write')).toBe(false);
    expect(actor?.permissions.has('members:members:read')).toBe(true);
  });

  it('laisse super_admin intact quoi qu’il arrive aux autres rôles', async () => {
    await createUser(db, { email: 'boss@nozaybad.fr', roles: ['super_admin'] });
    await updateRolePermissions(db, 'coach', [], ACTOR);

    const actor = await getActor(db, 'boss@nozaybad.fr');
    expect(actor?.permissions.has('iam:roles:write')).toBe(true);
    expect(actor?.permissions.has('accounting:ledger:delete')).toBe(true);
  });
});

describe('listRolePermissions', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupIamDb());
  });

  it('signale super_admin comme non modifiable', async () => {
    const summaries = await listRolePermissions(db);
    const superAdmin = summaries.find((s) => s.role === 'super_admin')!;

    expect(superAdmin.editable).toBe(false);
    expect(superAdmin.permissions.length).toBeGreaterThan(0);
  });

  it("rend visible l'écart avec la définition d'origine", async () => {
    // C'est ce qui remplace la trace que git donnait gratuitement tant que le
    // mapping vivait en code.
    await updateRolePermissions(db, 'membre', ['accounting:ledger:delete'], ACTOR);

    const membre = (await listRolePermissions(db)).find((s) => s.role === 'membre')!;
    expect(membre.added).toEqual(['accounting:ledger:delete']);
    expect(membre.removed).toEqual([]);
  });
});
