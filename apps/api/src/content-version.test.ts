import { describe, it, expect } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { getContentVersion } from '@nba/cms-api';
import { app } from './index';
import { affectsPublicSite } from './content-version';
import { TEST_ADMIN_EMAIL, seedTestAdmin } from './authz/test-identity';

/**
 * L'invalidation du cache du site après une écriture sur les créneaux.
 *
 * Le trou qu'ils ferment ne se voyait d'aucune suite : les handlers écrivaient
 * correctement, les routes répondaient 200, et la page publique restait pourtant
 * périmée jusqu'à une heure. Rien n'échouait — c'est bien pour cela qu'il faut
 * l'éprouver de bout en bout, et pas seulement contrôler le filtre de chemins.
 */

const KEY = 'secret123';
const ADMIN = {
  'x-api-key': KEY,
  'x-caller': 'admin',
  'x-user-email': TEST_ADMIN_EMAIL,
  'Content-Type': 'application/json'
};

function env(mockD1: unknown) {
  return { DB: mockD1, INTERNAL_API_KEY: KEY, OPEN_PLAY_ENABLED: 'false' };
}

describe('affectsPublicSite', () => {
  it('retient les écritures sur la grille hebdomadaire et les gymnases', () => {
    expect(affectsPublicSite('POST', '/schedules')).toBe(true);
    expect(affectsPublicSite('POST', '/schedules/venues')).toBe(true);
    expect(affectsPublicSite('PUT', '/schedules/12')).toBe(true);
    expect(affectsPublicSite('DELETE', '/schedules/12')).toBe(true);
  });

  it('laisse les lectures tranquilles', () => {
    expect(affectsPublicSite('GET', '/schedules')).toBe(false);
    expect(affectsPublicSite('GET', '/schedules/venues')).toBe(false);
  });

  it('exclut le jeu libre, absent du site et écrit à chaque inscription', () => {
    expect(affectsPublicSite('POST', '/schedules/open-play')).toBe(false);
    expect(affectsPublicSite('POST', '/schedules/open-play/3/registrations')).toBe(false);
    expect(affectsPublicSite('DELETE', '/schedules/open-play/openers/1')).toBe(false);
  });

  it('ne déborde pas sur les autres domaines ni sur un préfixe voisin', () => {
    expect(affectsPublicSite('POST', '/members')).toBe(false);
    expect(affectsPublicSite('POST', '/schedulesomething')).toBe(false);
  });
});

describe('invalidatePublicContent', () => {
  it('incrémente la version de contenu après un enregistrement de gymnase', async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);
    const before = await getContentVersion(db);

    const res = await app.request(
      'http://localhost/schedules/venues',
      {
        method: 'POST',
        headers: ADMIN,
        body: JSON.stringify({ code: 'pierre-dupuis', name: 'Pierre Dupuis' })
      },
      env(mockD1)
    );

    expect(res.status).toBe(200);
    expect(await getContentVersion(db)).toBeGreaterThan(before);
  });

  it('ne touche à rien sur une lecture', async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);
    const before = await getContentVersion(db);

    const res = await app.request('http://localhost/schedules/venues', { headers: ADMIN }, env(mockD1));

    expect(res.status).toBe(200);
    expect(await getContentVersion(db)).toBe(before);
  });

  it("n'invalide pas quand l'écriture est refusée", async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);
    const before = await getContentVersion(db);

    // `code` viole son motif : la route répond 400 et n'a rien écrit.
    const res = await app.request(
      'http://localhost/schedules/venues',
      { method: 'POST', headers: ADMIN, body: JSON.stringify({ code: 'Pierre Dupuis!', name: 'X' }) },
      env(mockD1)
    );

    expect(res.status).toBe(400);
    expect(await getContentVersion(db)).toBe(before);
  });
});
