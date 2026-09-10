import { describe, it, expect } from 'vitest';
import { app } from './index';
import { INDIV_FLAG, isFlagEnabled, isUnderPrefix } from './feature-flags';
import { TEST_ADMIN_EMAIL } from './authz/test-identity';

/**
 * Le drapeau des séances individuelles, et la mécanique commune aux drapeaux.
 *
 * Posé avant les routes qu'il couvre, comme celui du jeu libre : c'est ce qui garantit
 * qu'aucun incrément fusionné ensuite ne s'expose par inadvertance.
 */

const KEY = 'secret123';
const ADMIN = { 'x-api-key': KEY, 'x-caller': 'admin', 'x-user-email': TEST_ADMIN_EMAIL };

describe('drapeau INDIV_ENABLED', () => {
  it('répond 404 sur le préfixe des indiv quand le drapeau est éteint', async () => {
    const res = await app.request(
      'http://localhost/schedules/indiv',
      { headers: ADMIN },
      { INTERNAL_API_KEY: KEY, INDIV_ENABLED: 'false' }
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ success: false, error: 'Ressource introuvable' });
  });

  it("répond 404 et non 403 : une route éteinte ne s'annonce pas", async () => {
    const res = await app.request(
      'http://localhost/schedules/indiv/1/requests',
      { method: 'POST', headers: { 'x-api-key': KEY } },
      { INTERNAL_API_KEY: KEY, INDIV_ENABLED: 'false' }
    );
    expect(res.status).toBe(404);
  });

  it('éteint aussi quand la variable est absente ou farfelue (fail-closed)', async () => {
    for (const value of [undefined, '', '1', 'yes', 'TRUE']) {
      const res = await app.request(
        'http://localhost/schedules/indiv',
        { headers: ADMIN },
        { INTERNAL_API_KEY: KEY, ...(value === undefined ? {} : { INDIV_ENABLED: value }) }
      );
      expect(res.status, `valeur ${JSON.stringify(value)}`).toBe(404);
    }
  });

  it('ne touche ni au jeu libre ni à la grille, drapeau des indiv éteint', async () => {
    for (const path of ['/schedules/venues', '/schedules/open-play']) {
      const res = await app.request(
        `http://localhost${path}`,
        { headers: ADMIN },
        { INTERNAL_API_KEY: KEY, INDIV_ENABLED: 'false', OPEN_PLAY_ENABLED: 'true' }
      );
      expect(res.status, path).not.toBe(404);
    }
  });

  it('ne couvre que le segment exact', () => {
    expect(isUnderPrefix('/schedules/indiv', INDIV_FLAG.prefix)).toBe(true);
    expect(isUnderPrefix('/schedules/indiv/12/requests', INDIV_FLAG.prefix)).toBe(true);
    expect(isUnderPrefix('/schedules/individuel', INDIV_FLAG.prefix)).toBe(false);
    expect(isUnderPrefix('/schedules', INDIV_FLAG.prefix)).toBe(false);
  });

  it('ne reconnaît que la chaîne « true »', () => {
    expect(isFlagEnabled({ INDIV_ENABLED: 'true' }, 'INDIV_ENABLED')).toBe(true);
    expect(isFlagEnabled({ INDIV_ENABLED: 'True' }, 'INDIV_ENABLED')).toBe(false);
    expect(isFlagEnabled({}, 'INDIV_ENABLED')).toBe(false);
    expect(isFlagEnabled(undefined, 'INDIV_ENABLED')).toBe(false);
  });
});
