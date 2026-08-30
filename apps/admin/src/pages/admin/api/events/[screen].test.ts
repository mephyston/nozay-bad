import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Le relais du domaine « agenda ».
 *
 * Ce qui se garde ici et qui n'est pas évident : la fiche d'un événement est publique,
 * la liste de ses inscrits ne l'est pas. Tenir l'agenda et lire qui vient sont deux
 * droits distincts, et le second ne doit pas s'obtenir par le premier.
 */

let appels: { url: string; init?: RequestInit }[] = [];

vi.mock('../../../../lib/api', () => ({
  createAdminApiClient: () => ({
    fetch: (url: string, init?: RequestInit) => {
      appels.push({ url, init });
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: [] }), { status: 200 })
      );
    }
  })
}));

const { GET, POST, ECRANS } = await import('./[screen]');

const TOUS_LES_DROITS = [
  'events:events:read', 'events:events:write', 'events:events:delete', 'events:registrations:read'
];
const locals = (permissions: string[]) => ({ user: { email: 'x@nozaybad.fr', permissions } });

const lire = (screen: string, permissions = TOUS_LES_DROITS) =>
  GET({
    params: { screen },
    locals: locals(permissions),
    request: new Request(`https://admin.nozaybad.fr/admin/api/events/${screen}`)
  } as never);

const ecrire = (body: unknown, permissions = TOUS_LES_DROITS) =>
  POST({
    params: { screen: 'events' },
    locals: locals(permissions),
    request: new Request('https://admin.nozaybad.fr/admin/api/events/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } as never);

beforeEach(() => { appels = []; });

describe('relais agenda', () => {
  it('garde chaque écran et chaque écriture par une permission', () => {
    for (const [nom, ecran] of Object.entries(ECRANS)) {
      expect(ecran.permission, `écran ${nom}`).toBeTruthy();
      for (const [action, ecriture] of Object.entries(ecran.ecritures ?? {})) {
        expect(ecriture.permission, `${nom}/${action}`).toBeTruthy();
      }
    }
  });

  it("montre aussi le passé, contrairement au site", async () => {
    const res = await lire('events');
    expect(res.status).toBe(200);
    expect(appels[0].url).toContain('past=1');
  });

  it('exige un droit distinct pour la liste des inscrits', async () => {
    const sansInscrits = TOUS_LES_DROITS.filter((p) => p !== 'events:registrations:read');
    const res = await ecrire({ action: 'registrations', id: 7 }, sansInscrits);
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it("n'accorde pas la suppression à qui sait seulement écrire", async () => {
    const sansSuppression = TOUS_LES_DROITS.filter((p) => p !== 'events:events:delete');
    const res = await ecrire({ action: 'delete', id: 7 }, sansSuppression);
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it('valide les identifiants avant de les mettre dans un chemin', async () => {
    for (const id of ['abc', 0, -1, 1.5]) {
      appels = [];
      expect((await ecrire({ action: 'update', id, title: 'x' })).status, String(id)).toBe(400);
      expect(appels).toHaveLength(0);
    }
  });

  it('refuse un écran et une action inconnus', async () => {
    expect((await lire('inconnu')).status).toBe(404);
    expect((await ecrire({ action: 'truncate' })).status).toBe(403);
    expect(appels).toHaveLength(0);
  });
});
