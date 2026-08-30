import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Le relais du domaine « comptabilité ».
 *
 * Deux choses s'y jouent qui ne se voient pas : la **résolution de la saison**, propre à
 * cette rubrique et différente de celle des interclubs, et la **pagination**, que l'API
 * rend à côté de `data` — une lecture ordinaire la laisserait tomber, et le grand livre
 * afficherait « page 1 sur 1 » sur trois cents écritures.
 */

let appels: { url: string; init?: RequestInit }[] = [];
let saisons: any[] = [];

vi.mock('../../../../lib/api', () => ({
  createAdminApiClient: () => ({
    fetch: (url: string, init?: RequestInit) => {
      appels.push({ url, init });
      const chemin = url.replace('http://localhost', '');
      if (chemin === '/accounting/seasons') {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: saisons }), { status: 200 })
        );
      }
      if (chemin.startsWith('/accounting/transactions?')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [{ id: 1 }],
              pagination: { total: 42, page: 2, limit: 20, totalPages: 3 }
            }),
            { status: 200 }
          )
        );
      }
      if (chemin.endsWith('/reports')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: { bilanTrésorerie: [{ accountId: 'cash' }] } }), { status: 200 })
        );
      }
      if (chemin.endsWith('/balances')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: [{ accountId: 'cash', initialBalanceCents: 1234 }] }), { status: 200 })
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }));
    }
  })
}));

const { GET, POST, ECRANS } = await import('./[screen]');

const TOUS_LES_DROITS = [
  'accounting:ledger:read', 'accounting:ledger:write', 'accounting:ledger:delete',
  'accounting:invoices:read', 'accounting:invoices:write', 'accounting:invoices:delete'
];
const locals = (permissions: string[]) => ({ user: { email: 'x@nozaybad.fr', permissions } });

const lire = (screen: string, recherche = '', permissions = TOUS_LES_DROITS) =>
  GET({
    params: { screen },
    locals: locals(permissions),
    request: new Request(`https://admin.nozaybad.fr/admin/api/accounting/${screen}${recherche}`)
  } as never);

const ecrire = (screen: string, body: unknown, permissions = TOUS_LES_DROITS) =>
  POST({
    params: { screen },
    locals: locals(permissions),
    request: new Request('https://admin.nozaybad.fr/admin/api/accounting/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } as never);

const donnees = async (res: Response) => ((await res.json()) as any).data;

beforeEach(() => {
  appels = [];
  saisons = [
    { code: '24-25', startDate: '2024-09-01', active: 0, name: 'Saison 24-25' },
    { code: '25-26', startDate: '2025-09-01', active: 1, name: 'Saison 25-26', closed: false }
  ];
});

describe('comptabilité — les gardes', () => {
  it('garde chaque écran et chaque écriture par une permission', () => {
    for (const [nom, ecran] of Object.entries(ECRANS)) {
      expect(ecran.permission, `écran ${nom}`).toBeTruthy();
      for (const [action, ecriture] of Object.entries(ecran.ecritures ?? {})) {
        expect(ecriture.permission, `${nom}/${action}`).toBeTruthy();
      }
    }
  });

  it("n'accorde pas la suppression à qui sait seulement écrire", async () => {
    for (const [ecran, action] of [['ledger', 'delete'], ['invoices', 'delete']] as const) {
      appels = [];
      const droit = ecran === 'ledger' ? 'accounting:ledger:delete' : 'accounting:invoices:delete';
      const res = await ecrire(ecran, { action, id: 3 }, TOUS_LES_DROITS.filter((p) => p !== droit));
      expect(res.status, ecran).toBe(403);
      expect(appels, ecran).toHaveLength(0);
    }
  });

  it('valide les identifiants avant de les mettre dans un chemin', async () => {
    for (const id of ['abc', 0, -2]) {
      appels = [];
      expect((await ecrire('ledger', { action: 'delete', id })).status, String(id)).toBe(400);
      expect(appels).toHaveLength(0);
    }
  });
});

describe('comptabilité — la saison', () => {
  it("prend l'active quand l'URL n'en fixe aucune", async () => {
    const d = await donnees(await lire('ledger'));
    expect(d.seasonId).toBe('25-26');
    // Le nom sert au sous-titre, sans son préfixe.
    expect(d.seasonName).toBe('25-26');
  });

  it("prend celle de l'URL quand elle est donnée", async () => {
    const d = await donnees(await lire('invoices', '?season=24-25'));
    expect(d.seasonId).toBe('24-25');
    expect(appels.some((a) => a.url.includes('season=24-25'))).toBe(true);
  });

  it('retombe sur la dernière quand aucune n’est active', async () => {
    saisons = saisons.map((s) => ({ ...s, active: 0 }));
    const d = await donnees(await lire('ledger'));
    // Triées par date de début : la dernière est la plus récente.
    expect(d.seasonId).toBe('25-26');
  });

  it('signale une saison clôturée', async () => {
    saisons[1].closed = true;
    const d = await donnees(await lire('cash-box'));
    expect(d.isClosed).toBe(true);
  });
});

describe('comptabilité — le grand livre', () => {
  it("rend la pagination, que l'API pose à côté des données", async () => {
    const d = await donnees(await lire('ledger'));
    expect(d.pagination).toEqual({ total: 42, page: 2, limit: 20, totalPages: 3 });
  });

  it('transmet les filtres, dont le sens de l’écriture', async () => {
    /*
      Le compte de résultat sépare charges et produits : un lien de catégorie qui
      ramènerait les deux mélangés fait ouvrir trois cents cotisations pour y trouver sept
      remboursements.
    */
    await lire('ledger', '?category=adhesions&type=expense&month=2026-01&unreconciledCheques=true');
    const appel = appels.find((a) => a.url.includes('/accounting/transactions?'))!.url;
    expect(appel).toContain('category=adhesions');
    expect(appel).toContain('type=expense');
    expect(appel).toContain('month=2026-01');
    expect(appel).toContain('unreconciledCheques=true');
  });

  it('n’envoie pas les filtres vides', async () => {
    await lire('ledger', '?category=&search=');
    const appel = appels.find((a) => a.url.includes('/accounting/transactions?'))!.url;
    expect(appel).not.toContain('category=');
    expect(appel).not.toContain('search=');
  });
});

describe('comptabilité — la caisse', () => {
  it('trouve le solde initial quel que soit l’identifiant du compte', async () => {
    // La caisse porte deux identifiants selon l'âge de la donnée : l'un textuel, l'autre
    // numérique. Les deux se rencontrent encore en base.
    const d = await donnees(await lire('cash-box'));
    expect(d.initialBalance).toBe(1234);
  });
});
