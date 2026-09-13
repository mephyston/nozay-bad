import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Le relais de la configuration du club : la seule porte entre le navigateur et
 * `/club/*` sur l'API interne. Ce qu'il laisse passer, personne d'autre ne le filtre.
 */
let appels: { url: string; init?: RequestInit }[] = [];
let reponse: (url: string) => Response;

vi.mock('../../../../lib/api', () => ({
  resolveEnv: () => ({}),
  createAdminApiClient: () => ({
    fetch: (url: string, init?: RequestInit) => {
      appels.push({ url, init });
      return Promise.resolve(reponse(url));
    }
  })
}));

const oublierClub = vi.fn();
vi.mock('../../../../lib/club', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../lib/club')>()),
  oublierClub: () => oublierClub()
}));

const { GET, POST, ECRANS } = await import('./[screen]');
const { creerRelais } = await import('../../../../lib/relais');

const LECTURE = ['settings:club:read'];
const ECRITURE = ['settings:club:read', 'settings:club:write'];

const locals = (permissions: string[]) => ({ user: { email: 'x@nozaybad.fr', permissions } });

const lire = (screen: string, permissions = ECRITURE) =>
  GET({
    params: { screen },
    locals: locals(permissions),
    request: new Request(`https://admin.example.org/admin/api/club/${screen}`)
  } as never);

const ecrire = (screen: string, body: unknown, permissions = ECRITURE) =>
  POST({
    params: { screen },
    locals: locals(permissions),
    request: new Request('https://admin.example.org/admin/api/club/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } as never);

beforeEach(() => {
  appels = [];
  oublierClub.mockClear();
  reponse = () =>
    new Response(JSON.stringify({ success: true, data: { settings: { name: 'Club' }, features: { shop: true } } }), {
      status: 200
    });
});

describe('relais club — la table', () => {
  it('garde chaque écran, chaque écriture et chaque dépôt par une permission', () => {
    for (const [nom, ecran] of Object.entries(ECRANS)) {
      expect(ecran.permission, `écran ${nom}`).toBeTruthy();
      for (const [action, ecriture] of Object.entries(ecran.ecritures ?? {})) {
        expect(ecriture.permission, `${nom}/${action}`).toBe('settings:club:write');
      }
      if (ecran.depot) expect(ecran.depot.permission, `${nom} : dépôt`).toBe('settings:club:write');
    }
  });

  it('déclare une écriture par section de la configuration', () => {
    const actions = Object.keys(ECRANS.settings.ecritures ?? {});
    for (const section of ['identity', 'contacts', 'legal', 'bank', 'competition', 'branding', 'sending', 'rules']) {
      expect(actions).toContain(`update_${section}`);
    }
  });

  it('ne déclare de dépôt que sur les écrans d’image', () => {
    const avecDepot = Object.entries(ECRANS).filter(([, e]) => e.depot).map(([nom]) => nom);
    expect(avecDepot.sort()).toEqual(
      ['asset-logo', 'asset-letterheadHeader', 'asset-letterheadFooter', 'asset-stamp', 'asset-partners'].sort()
    );
  });
});

describe('relais club — lecture', () => {
  it('charge l’identité et dit si le compte peut écrire', async () => {
    const res = await lire('settings', LECTURE);
    expect(res.status).toBe(200);
    const d = ((await res.json()) as any).data;
    expect(d.settings.name).toBe('Club');
    expect(d.features.shop).toBe(true);
    expect(d.canWrite).toBe(false);
    expect(appels.map((a) => a.url)).toEqual(['http://localhost/club/settings']);
  });

  it('refuse sans le droit de lecture', async () => {
    expect((await lire('settings', [])).status).toBe(403);
  });
});

describe('relais club — écritures', () => {
  it('transmet une section à sa route, sans le nom d’action', async () => {
    const res = await ecrire('settings', { action: 'update_bank', bankHolder: 'X', iban: 'FR76…' });
    expect(res.status).toBe(200);
    const [appel] = appels;
    expect(appel.url).toBe('http://localhost/club/settings/bank');
    expect(appel.init?.method).toBe('PUT');
    expect(JSON.parse(appel.init?.body as string)).toEqual({ bankHolder: 'X', iban: 'FR76…' });
  });

  it('oublie le club gardé en mémoire après une écriture réussie', async () => {
    await ecrire('settings', { action: 'update_features', features: { shop: false } });
    expect(oublierClub).toHaveBeenCalledTimes(1);
    expect(appels[0].url).toBe('http://localhost/club/features');
  });

  it('refuse une écriture avec le seul droit de lecture', async () => {
    const res = await ecrire('settings', { action: 'update_identity', name: 'X' }, LECTURE);
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it('refuse une image inconnue au retrait', async () => {
    const res = await ecrire('settings', { action: 'remove_asset', asset: '../etc' });
    expect(res.status).toBe(400);
    expect(appels).toHaveLength(0);
  });
});

describe('relais — fonctionnalité éteinte par le club', () => {
  /**
   * La mécanique est celle de `creerRelais`, testée ici sur une table minimale : un
   * écran qui dépend d'une fonctionnalité répond introuvable, lecture comme écriture,
   * quand `locals.club` la dit éteinte — et reste ouvert quand le club est inconnu.
   */
  const relais = creerRelais({
    boutique: {
      feature: 'shop',
      permission: 'settings:club:read',
      charger: async () => ({ ok: true }),
      ecritures: { save: { permission: 'settings:club:write', route: () => ({ chemin: '/x', method: 'PUT' }) } }
    }
  });
  const avecClub = (shop: boolean) => ({
    user: { email: 'x@nozaybad.fr', permissions: ECRITURE },
    club: { settings: {}, features: { shop } }
  });

  it('répond 404 en lecture et en écriture quand la fonctionnalité est éteinte', async () => {
    const get = await relais.GET({ params: { screen: 'boutique' }, locals: avecClub(false), request: new Request('https://a.b/c') } as never);
    expect(get.status).toBe(404);
    const post = await relais.POST({
      params: { screen: 'boutique' },
      locals: avecClub(false),
      request: new Request('https://a.b/c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"action":"save"}' })
    } as never);
    expect(post.status).toBe(404);
    expect(appels).toHaveLength(0);
  });

  it('sert l’écran quand elle est allumée, ou quand le club est inconnu', async () => {
    expect((await relais.GET({ params: { screen: 'boutique' }, locals: avecClub(true), request: new Request('https://a.b/c') } as never)).status).toBe(200);
    expect((await relais.GET({ params: { screen: 'boutique' }, locals: locals(ECRITURE), request: new Request('https://a.b/c') } as never)).status).toBe(200);
  });
});
