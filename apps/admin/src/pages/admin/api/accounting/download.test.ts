import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Les téléchargements de la comptabilité.
 *
 * Cette route est la seule de l'administration à relayer un **flux binaire**. Deux choses
 * s'y vérifient et nulle part ailleurs : que le corps n'est jamais lu — un PDF reconstruit
 * en JSON serait corrompu —, et que la saison ne peut pas s'évader du chemin d'API
 * qu'elle rejoint.
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

const { GET, DOCUMENTS } = await import('./download');

const locals = (permissions: string[]) => ({ user: { email: 'x@nozaybad.fr', permissions } });

const telecharger = (requete: string, permissions = ['accounting:reports:read']) =>
  GET({
    locals: locals(permissions),
    request: new Request(`https://admin.nozaybad.fr/admin/api/accounting/download?${requete}`)
  } as never);

beforeEach(() => {
  appels = [];
  reponse = () =>
    new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' }
    });
});

describe('téléchargements comptables', () => {
  it('garde chaque document par une permission', () => {
    for (const [nom, doc] of Object.entries(DOCUMENTS)) {
      expect(doc.permission, `document ${nom}`).toBeTruthy();
    }
  });

  it('rend les octets tels quels', async () => {
    // Le corps n'est jamais lu ni reconstruit : un PDF passé par `JSON.stringify` serait
    // illisible, et l'erreur ne se verrait qu'à l'ouverture du fichier.
    const res = await telecharger('doc=income-statement&season=25-26');
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });

  it("propose un nom de fichier quand l'API n'en impose pas", async () => {
    const res = await telecharger('doc=export&type=ledger&season=25-26');
    expect(res.headers.get('Content-Disposition')).toContain('export-compta-25-26.zip');
  });

  it("respecte le nom que l'API impose", async () => {
    reponse = () =>
      new Response(new Uint8Array([1]), {
        status: 200,
        headers: { 'Content-Disposition': 'attachment; filename="impose.csv"' }
      });
    const res = await telecharger('doc=export&type=ledger&season=25-26');
    expect(res.headers.get('Content-Disposition')).toContain('impose.csv');
  });

  it('refuse un document inconnu', async () => {
    expect((await telecharger('doc=secrets&season=25-26')).status).toBe(404);
    expect(appels).toHaveLength(0);
  });

  it('exige le droit de lire les rapports', async () => {
    const res = await telecharger('doc=income-statement&season=25-26', ['accounting:ledger:read']);
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it("interdit à la saison de s'évader du chemin", async () => {
    /*
      La saison est interpolée dans un chemin d'API. Sans contrôle, `../../members`
      ferait de cette route un accès arbitraire à l'API interne, avec la clé du worker.
    */
    for (const saison of ['../members', '25-26/../..', '', 'a'.repeat(20), '25 26']) {
      appels = [];
      const res = await telecharger(`doc=income-statement&season=${encodeURIComponent(saison)}`);
      expect(res.status, saison).toBe(400);
      expect(appels, saison).toHaveLength(0);
    }
  });

  it('contrôle aussi la variante', async () => {
    const res = await telecharger('doc=export&season=25-26&type=../../etc');
    expect(res.status).toBe(400);
    expect(appels).toHaveLength(0);
  });

  it("relaie l'échec de l'API avec son code", async () => {
    reponse = () => new Response('nope', { status: 503 });
    const res = await telecharger('doc=cash-flow&season=25-26');
    expect(res.status).toBe(503);
  });
});
