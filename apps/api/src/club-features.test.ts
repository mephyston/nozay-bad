import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import type { Db } from '@nba/db';
import { app } from './index';
import { forgetIsolateFeatures } from './club-features';
import { seedTestAdmin, TEST_ADMIN_EMAIL } from './authz/test-identity';
import { updateClubFeatures } from '@nba/club';
import { ROUTE_PERMISSIONS } from './authz/route-permissions';
import { FEATURES } from '@nba/club/settings';

/**
 * Les fonctionnalités éteintes par le club, appliquées aux routes.
 *
 * Successeur des tests des drapeaux `OPEN_PLAY_ENABLED` / `INDIV_ENABLED` : mêmes
 * invariants — introuvable et non refusé, avant toute question de droit —, mais la
 * décision vient de la base, pas d'une variable de déploiement.
 */
const KEY = 'secret123';
const ADMIN = { 'x-api-key': KEY, 'x-caller': 'admin', 'x-user-email': TEST_ADMIN_EMAIL };

describe('fonctionnalités du club sur les routes', () => {
  let db: Db;
  let env: Record<string, unknown>;

  beforeEach(async () => {
    const setup = await setupMockDb();
    db = setup.db;
    env = { DB: setup.mockD1, INTERNAL_API_KEY: KEY };
    forgetIsolateFeatures();
    await seedTestAdmin(db);
  });

  it('ne déclare que des fonctionnalités du catalogue', () => {
    for (const rule of ROUTE_PERMISSIONS) {
      if (rule.feature) expect(FEATURES, `${rule.method} ${rule.path}`).toContain(rule.feature);
    }
  });

  it('sert la boutique tant que rien n’est éteint', async () => {
    const res = await app.request('http://localhost/shop/products', { headers: ADMIN }, env);
    expect(res.status).toBe(200);
  });

  it('répond 404 sur une route dont le club a éteint la fonctionnalité', async () => {
    await updateClubFeatures(db, { shop: false }, 'a@b.c');
    forgetIsolateFeatures();
    const res = await app.request('http://localhost/shop/products', { headers: ADMIN }, env);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ success: false, error: 'Ressource introuvable' });
  });

  it("répond 404 et non 403 : une route éteinte ne s'annonce pas, même sans identité", async () => {
    await updateClubFeatures(db, { open_play: false }, 'a@b.c');
    forgetIsolateFeatures();
    const res = await app.request(
      'http://localhost/schedules/open-play/1/registrations',
      { method: 'POST', headers: { 'x-api-key': KEY } },
      env
    );
    expect(res.status).toBe(404);
  });

  it('applique les préalables : sans notifications, les abonnements push n’existent plus', async () => {
    await updateClubFeatures(db, { push: false }, 'a@b.c');
    forgetIsolateFeatures();
    const res = await app.request(
      'http://localhost/notifications/preferences',
      { headers: { 'x-api-key': KEY, 'x-caller': 'storefront' } },
      env
    );
    expect(res.status).toBe(404);
  });

  it('laisse passer les routes sans fonctionnalité, boutique éteinte ou non', async () => {
    await updateClubFeatures(db, { shop: false, accounting: false }, 'a@b.c');
    forgetIsolateFeatures();
    const res = await app.request('http://localhost/accounting/seasons', { headers: ADMIN }, env);
    expect(res.status).toBe(200);
  });

  it('oublie son cache quand le club change un réglage par l’API', async () => {
    expect((await app.request('http://localhost/shop/products', { headers: ADMIN }, env)).status).toBe(200);
    const put = await app.request(
      'http://localhost/club/features',
      { method: 'PUT', headers: { ...ADMIN, 'Content-Type': 'application/json' }, body: JSON.stringify({ shop: false }) },
      env
    );
    expect(put.status).toBe(200);
    expect((await app.request('http://localhost/shop/products', { headers: ADMIN }, env)).status).toBe(404);
  });
});
