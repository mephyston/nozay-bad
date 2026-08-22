import { describe, it, expect } from 'vitest';
import { app } from './index';
import { isOpenPlayEnabled, isOpenPlayPath } from './open-play';
import { TEST_ADMIN_EMAIL } from './authz/test-identity';

/**
 * Le drapeau de la fonctionnalité « jeu libre ».
 *
 * Ces tests portent sur le garde-fou lui-même, pas sur les routes qu'il couvre : elles
 * n'existent pas encore, et c'est précisément l'intérêt — le drapeau est posé avant ce
 * qu'il protège, pour qu'aucun incrément fusionné ensuite ne puisse s'exposer par
 * inadvertance.
 */

const KEY = 'secret123';
const ADMIN = { 'x-api-key': KEY, 'x-caller': 'admin', 'x-user-email': TEST_ADMIN_EMAIL };

describe('drapeau OPEN_PLAY_ENABLED', () => {
  it('répond 404 sur le préfixe jeu libre quand le drapeau est éteint', async () => {
    const res = await app.request(
      'http://localhost/schedules/open-play',
      { headers: ADMIN },
      { INTERNAL_API_KEY: KEY, OPEN_PLAY_ENABLED: 'false' }
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ success: false, error: 'Ressource introuvable' });
  });

  it("répond 404 et non 403 : une route éteinte ne s'annonce pas", async () => {
    // Sans identité d'administration, donc sans le moindre droit : la réponse doit être
    // la même que pour un appelant tout-puissant, sans quoi le préfixe se devinerait.
    const res = await app.request(
      'http://localhost/schedules/open-play/1/registrations',
      { method: 'POST', headers: { 'x-api-key': KEY } },
      { INTERNAL_API_KEY: KEY, OPEN_PLAY_ENABLED: 'false' }
    );
    expect(res.status).toBe(404);
  });

  it('éteint aussi quand la variable est absente ou farfelue (fail-closed)', async () => {
    for (const value of [undefined, '', '1', 'yes', 'TRUE']) {
      const res = await app.request(
        'http://localhost/schedules/open-play',
        { headers: ADMIN },
        { INTERNAL_API_KEY: KEY, ...(value === undefined ? {} : { OPEN_PLAY_ENABLED: value }) }
      );
      expect(res.status, `valeur ${JSON.stringify(value)}`).toBe(404);
    }
  });

  it('laisse passer les autres routes de créneaux, drapeau éteint', async () => {
    // La grille hebdomadaire existe depuis longtemps : le drapeau ne doit pas la couvrir.
    const res = await app.request(
      'http://localhost/schedules/venues',
      { headers: ADMIN },
      { INTERNAL_API_KEY: KEY, OPEN_PLAY_ENABLED: 'false' }
    );
    expect(res.status).not.toBe(404);
  });

  it('ne couvre que le segment exact', () => {
    expect(isOpenPlayPath('/schedules/open-play')).toBe(true);
    expect(isOpenPlayPath('/schedules/open-play/12/registrations')).toBe(true);
    // Le piège du préfixe nu : `startsWith` seul aurait éteint cette route-là aussi.
    expect(isOpenPlayPath('/schedules/open-playground')).toBe(false);
    expect(isOpenPlayPath('/schedules')).toBe(false);
  });

  it('ne reconnaît que la chaîne « true »', () => {
    expect(isOpenPlayEnabled({ OPEN_PLAY_ENABLED: 'true' })).toBe(true);
    expect(isOpenPlayEnabled({ OPEN_PLAY_ENABLED: 'True' })).toBe(false);
    expect(isOpenPlayEnabled({})).toBe(false);
    expect(isOpenPlayEnabled(undefined)).toBe(false);
  });
});
