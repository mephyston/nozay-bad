import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Les dépôts de fichiers de la comptabilité.
 *
 * Ce que ces tests ferment : les deux dépôts s'exécutaient jusqu'ici **avant** la garde
 * des actions de leur page, donc sans qu'aucune permission ne soit vérifiée. Tout compte
 * capable d'atteindre l'administration pouvait importer un relevé bancaire.
 */

let appels: { url: string; init?: RequestInit }[] = [];
let reponse: () => Response;

vi.mock('../../../../lib/api', () => ({
  createAdminApiClient: () => ({
    fetch: (url: string, init?: RequestInit) => {
      appels.push({ url, init });
      return Promise.resolve(reponse());
    }
  })
}));

const { POST, DEPOTS } = await import('./upload');

const locals = (permissions: string[]) => ({ user: { email: 'x@nozaybad.fr', permissions } });

/*
  Requête minimale, plutôt qu'un vrai `Request` multipart.

  Sous jsdom, `request.formData()` mêle l'implémentation d'undici et celle de
  l'environnement, qui ne se reconnaissent pas : le parcours échoue avant d'atteindre le
  code testé. La route n'emploie que trois choses de la requête — son URL, son en-tête de
  type et `formData()` — et c'est exactement ce qu'on lui donne ici.
*/
function deposer(doc: string, permissions: string[], multipart = true) {
  const contenu = multipart ? 'multipart/form-data; boundary=x' : 'application/json';
  const champs = new Map<string, string>([['fichier', 'a;b;c']]);
  return POST({
    locals: locals(permissions),
    request: {
      url: `https://admin.nozaybad.fr/admin/api/accounting/upload?doc=${doc}`,
      headers: new Headers({ 'Content-Type': contenu }),
      formData: () => Promise.resolve(champs)
    }
  } as never);
}

beforeEach(() => {
  appels = [];
  reponse = () =>
    new Response(JSON.stringify({ success: true, data: { lues: 12, inserees: 9 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
});

describe('dépôts comptables', () => {
  it('garde chaque dépôt par une permission', () => {
    for (const [nom, depot] of Object.entries(DEPOTS)) {
      expect(depot.permission, `dépôt ${nom}`).toBeTruthy();
    }
  });

  it("exige le droit d'importer un relevé", async () => {
    // Le droit existait au catalogue et n'était appliqué nulle part.
    const res = await deposer('bank-statement', ['accounting:bank:read', 'accounting:bank:reconcile']);
    expect(res.status).toBe(403);
    expect(appels, "le corps ne doit même pas être lu").toHaveLength(0);
  });

  it("exige le droit d'employer les aides IA pour lire un chèque", async () => {
    const res = await deposer('check-analyze', ['accounting:checks:write']);
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it('transmet un dépôt autorisé', async () => {
    const res = await deposer('bank-statement', ['accounting:bank:import']);
    expect(res.status).toBe(200);
    expect(appels[0].url).toBe('http://localhost/accounting/bank-transactions/import');
  });

  it("relaie le compte rendu de l'API, et non un succès muet", async () => {
    // C'est lui qui porte le nombre de lignes lues et insérées : l'écran n'a rien à dire
    // sans.
    const res = await deposer('bank-statement', ['accounting:bank:import']);
    expect(((await res.json()) as any).data).toEqual({ lues: 12, inserees: 9 });
  });

  it("relaie l'échec avec son code", async () => {
    reponse = () => new Response('format illisible', { status: 422 });
    const res = await deposer('bank-statement', ['accounting:bank:import']);
    expect(res.status).toBe(422);
    expect(await res.text()).toBe('format illisible');
  });

  it('refuse un dépôt inconnu', async () => {
    const res = await deposer('secrets', ['accounting:bank:import']);
    expect(res.status).toBe(404);
    expect(appels).toHaveLength(0);
  });

  it("refuse un corps qui n'est pas un fichier", async () => {
    const res = await deposer('bank-statement', ['accounting:bank:import'], false);
    expect(res.status).toBe(400);
    expect(appels).toHaveLength(0);
  });
});
