import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { iamRouter } from './router';
import { createUser } from './create-user/handler';
import type { Db } from '@nba/db';

describe('iamRouter', () => {
  let db: Db;
  let env: { DB: D1Database };

  beforeEach(async () => {
    const setup = await setupMockDb();
    db = setup.db;
    env = { DB: setup.mockD1 as D1Database };
  });

  async function call(path: string, init?: RequestInit) {
    return iamRouter.request(path, init, env);
  }

  describe('GET /me', () => {
    it("refuse une requête sans identité appelante", async () => {
      const res = await call('/me');
      expect(res.status).toBe(400);
    });

    it('bootstrape le premier administrateur', async () => {
      const res = await call('/me', { headers: { 'x-user-email': 'fondateur@nozaybad.fr' } });
      const body = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(body.data.roles).toEqual(['super_admin']);
      expect(body.data.permissions).toContain('iam:users:write');
    });

    it("répond 200 avec un acteur nul pour un compte non configuré", async () => {
      // Et non 403 : l'application admin doit pouvoir afficher un message explicite
      // plutôt qu'une erreur brute.
      await createUser(db, { email: 'connu@nozaybad.fr', roles: ['membre'] });

      const res = await call('/me', { headers: { 'x-user-email': 'intrus@nozaybad.fr' } });
      const body = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(body.data).toBeNull();
    });
  });

  describe('GET /users', () => {
    it('liste les comptes avec leurs rôles', async () => {
      await createUser(db, { email: 'a@nozaybad.fr', roles: ['tresorier'] });

      const res = await call('/users');
      const body = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].roles).toEqual(['tresorier']);
    });
  });

  describe('POST /users', () => {
    it('crée un compte', async () => {
      const res = await call('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'neuf@nozaybad.fr', roles: ['secretaire'] })
      });
      const body = (await res.json()) as any;

      expect(res.status).toBe(201);
      expect(body.data.roles).toEqual(['secretaire']);
    });

    it('rejette un rôle inconnu', async () => {
      // La version précédente acceptait n'importe quel tableau de chaînes, ce qui
      // laissait écrire en base des droits sans effet.
      const res = await call('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'neuf@nozaybad.fr', roles: ['dieu'] })
      });

      expect(res.status).toBe(400);
    });

    it('rejette une adresse malformée', async () => {
      const res = await call('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'pas-une-adresse' })
      });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /users/:id', () => {
    it('remplace les rôles', async () => {
      const user = await createUser(db, { email: 'a@nozaybad.fr', roles: ['membre'] });

      const res = await call(`/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: ['tresorier'] })
      });
      const body = (await res.json()) as any;

      expect(res.status).toBe(200);
      expect(body.data.roles).toEqual(['tresorier']);
    });

    it('rejette un identifiant non numérique', async () => {
      const res = await call('/users/abc', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: ['membre'] })
      });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('supprime un compte', async () => {
      await createUser(db, { email: 'boss@nozaybad.fr', roles: ['super_admin'] });
      const user = await createUser(db, { email: 'jetable@nozaybad.fr', roles: ['membre'] });

      const res = await call(`/users/${user.id}`, { method: 'DELETE' });

      expect(res.status).toBe(200);
      const list = (await (await call('/users')).json()) as any;
      expect(list.data).toHaveLength(1);
    });
  });
});
