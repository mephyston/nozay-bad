import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { app } from '../index';
import { clearActorCache } from './actor';
import { seedTestUser } from './test-identity';

const KEY = 'secret123';

describe("autorisation de l'API", () => {
  let db: Db;
  let env: Record<string, unknown>;

  beforeEach(async () => {
    const setup = await setupMockDb();
    db = setup.db;
    env = { DB: setup.mockD1, INTERNAL_API_KEY: KEY };
    clearActorCache();
  });

  function callAs(
    identity: Record<string, string>,
    path: string,
    init: RequestInit = {},
    envOverride: Record<string, unknown> = {}
  ) {
    return app.request(
      `http://localhost${path}`,
      { ...init, headers: { 'x-api-key': KEY, ...identity, ...(init.headers as any) } },
      { ...env, ...envOverride }
    );
  }

  const asAdmin = (email: string) => ({ 'x-caller': 'admin', 'x-user-email': email });
  const asStorefront = { 'x-caller': 'storefront' };

  describe('appelant storefront', () => {
    it('accède aux routes marquées « service »', async () => {
      expect((await callAs(asStorefront, '/accounting/seasons')).status).toBe(200);
      expect((await callAs(asStorefront, '/shop/products')).status).toBe(200);
    });

    it('est refusé sur les routes réservées à l’administration', async () => {
      const res = await callAs(asStorefront, '/accounting/transactions/1', { method: 'DELETE' });
      expect(res.status).toBe(403);
    });

    it("ne peut pas lister les comptes d'administration", async () => {
      expect((await callAs(asStorefront, '/iam/users')).status).toBe(403);
    });

    it("ne peut pas résoudre une identité d'administration", async () => {
      const res = await callAs(
        { ...asStorefront, 'x-user-email': 'boss@nozaybad.fr' },
        '/iam/me'
      );
      expect(res.status).toBe(403);
    });
  });

  describe('appelant admin', () => {
    it('refuse un compte inconnu', async () => {
      // 403 et non 401 : le transport est authentifié, c'est le compte qui manque.
      const res = await callAs(asAdmin('fantome@nozaybad.fr'), '/members');
      expect(res.status).toBe(403);
    });

    it("échoue bruyamment si aucune identité n'est affirmée", async () => {
      const res = await callAs({ 'x-caller': 'admin' }, '/members');
      expect(res.status).toBe(401);
    });

    it('refuse un appelant inconnu', async () => {
      const res = await callAs({ 'x-caller': 'autre' }, '/members');
      expect(res.status).toBe(403);
    });

    it("refuse quand l'en-tête d'appelant est absent", async () => {
      const res = await callAs({}, '/members');
      expect(res.status).toBe(403);
    });
  });

  describe('droits par rôle', () => {
    it('refuse tout à un membre sans droit métier', async () => {
      await seedTestUser(db, 'membre@nozaybad.fr', ['membre']);
      expect((await callAs(asAdmin('membre@nozaybad.fr'), '/members')).status).toBe(403);
      expect((await callAs(asAdmin('membre@nozaybad.fr'), '/accounting/ledger-entries')).status).toBe(403);
    });

    it('laisse un membre consulter son tableau de bord', async () => {
      await seedTestUser(db, 'membre@nozaybad.fr', ['membre']);
      // Le code métier exact dépend des données ; seul compte ici l'absence de refus.
      expect((await callAs(asAdmin('membre@nozaybad.fr'), '/dashboard/overview')).status).not.toBe(403);
    });

    it('ouvre les adhérents à la secrétaire, mais pas le grand livre en écriture', async () => {
      await seedTestUser(db, 'secretaire@nozaybad.fr', ['secretaire']);
      expect((await callAs(asAdmin('secretaire@nozaybad.fr'), '/members')).status).toBe(200);

      const write = await callAs(asAdmin('secretaire@nozaybad.fr'), '/accounting/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      expect(write.status).toBe(403);
    });

    it('ouvre le grand livre en écriture au trésorier', async () => {
      await seedTestUser(db, 'tresorier@nozaybad.fr', ['tresorier']);
      const write = await callAs(asAdmin('tresorier@nozaybad.fr'), '/accounting/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      // Refusé par la validation du corps, donc l'autorisation a bien laissé passer.
      expect(write.status).not.toBe(403);
    });

    it("refuse l'écriture comptable à la présidence (séparation des tâches)", async () => {
      await seedTestUser(db, 'president@nozaybad.fr', ['president']);
      expect((await callAs(asAdmin('president@nozaybad.fr'), '/accounting/ledger-entries')).status).not.toBe(403);

      const del = await callAs(asAdmin('president@nozaybad.fr'), '/accounting/ledger-entries/1', {
        method: 'DELETE'
      });
      expect(del.status).toBe(403);
    });

    it('réserve la gestion des comptes aux rôles qui la portent', async () => {
      await seedTestUser(db, 'tresorier@nozaybad.fr', ['tresorier']);
      await seedTestUser(db, 'president@nozaybad.fr', ['president']);
      expect((await callAs(asAdmin('tresorier@nozaybad.fr'), '/iam/users')).status).toBe(403);
      expect((await callAs(asAdmin('president@nozaybad.fr'), '/iam/users')).status).toBe(200);
    });
  });

  describe('/iam/me et les comptes inconnus', () => {
    // Le refus par défaut d'un acteur inconnu est juste partout ailleurs, mais il
    // rendait cette route inatteignable — donc le bootstrap du premier
    // administrateur impossible et l'application verrouillée sur une base vierge.
    it('crée le premier administrateur sur une base vierge', async () => {
      const res = await callAs(asAdmin('fondateur@nozaybad.fr'), '/iam/me');
      const body = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(body.data.roles).toEqual(['super_admin']);
    });

    it("répond « compte non configuré » plutôt qu'un refus brut", async () => {
      await seedTestUser(db, 'connu@nozaybad.fr', ['membre']);

      const res = await callAs(asAdmin('intrus@nozaybad.fr'), '/iam/me');
      const body = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(body.data).toBeNull();
    });

    it("n'exempte aucune autre route de l'existence du compte", async () => {
      await seedTestUser(db, 'connu@nozaybad.fr', ['membre']);
      expect((await callAs(asAdmin('intrus@nozaybad.fr'), '/members')).status).toBe(403);
      expect((await callAs(asAdmin('intrus@nozaybad.fr'), '/iam/users')).status).toBe(403);
      expect((await callAs(asAdmin('intrus@nozaybad.fr'), '/dashboard/overview')).status).toBe(403);
    });

    it("reste fermée au storefront malgré l'exemption", async () => {
      expect((await callAs(asStorefront, '/iam/me')).status).toBe(403);
    });
  });

  describe('routes non déclarées', () => {
    it('répond 403 et non 404, ce qui prouve l’ordre du refus par défaut', async () => {
      await seedTestUser(db, 'boss@nozaybad.fr', ['super_admin']);
      const res = await callAs(asAdmin('boss@nozaybad.fr'), '/accounting/route-inexistante');
      expect(res.status).toBe(403);
    });
  });

  describe('en-têtes forgés', () => {
    it("n'accorde rien via l'ancien en-tête x-user-permissions", async () => {
      await seedTestUser(db, 'membre@nozaybad.fr', ['membre']);
      const res = await callAs(asAdmin('membre@nozaybad.fr'), '/members', {
        headers: { 'x-user-permissions': '*,members:*,members:members:read' }
      });
      expect(res.status).toBe(403);
    });

    it("n'accorde rien via un rôle inconnu rangé en base", async () => {
      await seedTestUser(db, 'bizarre@nozaybad.fr', ['dieu']);
      expect((await callAs(asAdmin('bizarre@nozaybad.fr'), '/members')).status).toBe(403);
    });
  });

  describe('mode « log »', () => {
    it('journalise sans refuser', async () => {
      await seedTestUser(db, 'membre@nozaybad.fr', ['membre']);
      const res = await callAs(asAdmin('membre@nozaybad.fr'), '/members', {}, { RBAC_ENFORCE: 'log' });
      expect(res.status).toBe(200);
    });

    it("applique les refus dès que la variable n'est pas « log »", async () => {
      await seedTestUser(db, 'membre@nozaybad.fr', ['membre']);
      const res = await callAs(asAdmin('membre@nozaybad.fr'), '/members', {}, { RBAC_ENFORCE: '' });
      expect(res.status).toBe(403);
    });
  });

  describe('cache de résolution', () => {
    it("ne relit pas la base à chaque requête pour la même adresse", async () => {
      await seedTestUser(db, 'boss@nozaybad.fr', ['super_admin']);

      await callAs(asAdmin('boss@nozaybad.fr'), '/members');
      // Retrait des droits en base : le cache doit encore servir l'acteur précédent.
      await db.run('DELETE FROM admin_user_roles' as never);
      const cached = await callAs(asAdmin('boss@nozaybad.fr'), '/members');
      expect(cached.status).toBe(200);

      clearActorCache();
      const fresh = await callAs(asAdmin('boss@nozaybad.fr'), '/members');
      expect(fresh.status).toBe(403);
    });
  });

  describe('/health', () => {
    it("reste joignable sans identité (sonde de disponibilité)", async () => {
      const res = await app.request('http://localhost/health', {}, env);
      expect(res.status).toBe(200);
    });
  });
});
