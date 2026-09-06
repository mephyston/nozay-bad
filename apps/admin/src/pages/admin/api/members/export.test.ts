import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Le fichier des adresses mail : un flux relayé tel quel, derrière sa propre garde.
 */

let appels: string[] = [];
let reponse: () => Response;

vi.mock('../../../../lib/api', () => ({
  createAdminApiClient: () => ({
    fetch: (url: string) => {
      appels.push(url);
      return Promise.resolve(reponse());
    }
  })
}));

const { GET } = await import('./export');

const locals = (permissions: string[]) => ({ user: { email: 'x@nozaybad.fr', permissions } });

const telecharger = (requete: string, permissions = ['members:members:export']) =>
  GET({
    locals: locals(permissions),
    request: new Request(`https://admin.nozaybad.fr/admin/api/members/export?${requete}`)
  } as never);

beforeEach(() => {
  appels = [];
  reponse = () =>
    new Response(new Uint8Array([0xef, 0xbb, 0xbf, 0x41]), {
      status: 200,
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="adherents-emails-25-26.csv"' }
    });
});

describe('export des adresses mail', () => {
  it('rend les octets tels quels, avec le nom que l\'API impose', async () => {
    const res = await telecharger('season=25-26&status=en_attente&search=mar');
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([0xef, 0xbb, 0xbf, 0x41]));
    expect(res.headers.get('Content-Disposition')).toContain('adherents-emails-25-26.csv');
    expect(appels[0]).toBe('http://localhost/members/export?season=25-26&gender=&type=&status=en_attente&search=mar');
  });

  it("exige le droit d'exporter, la lecture ne suffit pas", async () => {
    const res = await telecharger('season=25-26', ['members:members:read']);
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it('exige une saison', async () => {
    for (const saison of ['', '../members', '25 26', 'a'.repeat(20)]) {
      appels = [];
      expect((await telecharger(`season=${encodeURIComponent(saison)}`)).status, saison).toBe(400);
      expect(appels, saison).toHaveLength(0);
    }
  });

  it("ne connaît que les filtres de l'écran", async () => {
    for (const requete of ['status=inconnu', 'gender=X', 'type=Autre']) {
      appels = [];
      expect((await telecharger(`season=25-26&${requete}`)).status, requete).toBe(400);
      expect(appels, requete).toHaveLength(0);
    }
  });

  it("relaie l'échec de l'API avec son code", async () => {
    reponse = () => new Response('nope', { status: 503 });
    expect((await telecharger('season=25-26')).status).toBe(503);
  });
});
