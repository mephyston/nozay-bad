import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import {
  cacheSharedReads,
  cachedReadTtl,
  sharedReadKey,
  type ResponseCache
} from './shared-read-cache';

/**
 * Le cache des lectures partagées.
 *
 * Ce qu'il faut éprouver n'est pas qu'il cache — c'est qu'il ne cache **pas** ce qui ne
 * doit pas l'être. Une entrée partagée entre deux appelants divulguerait les brouillons
 * du CMS et les créneaux inactifs, et une réponse personnelle rangée sous une clé
 * commune servirait les données d'un adhérent à un autre. Rien de tout cela ne se
 * verrait à l'exécution : la réponse serait valide, simplement pas la bonne.
 */

/** Cache en mémoire : `caches.default` n'existe pas hors du runtime Workers. */
function fakeCache(): ResponseCache & { size: () => number } {
  const store = new Map<string, Response>();
  return {
    async match(request) {
      const hit = store.get(request.url);
      return hit ? hit.clone() : undefined;
    },
    async put(request, response) {
      store.set(request.url, response);
    },
    size: () => store.size
  };
}

function appWith(cache: ResponseCache, counter: { calls: number }) {
  const app = new Hono();
  app.use('*', cacheSharedReads(cache));
  app.get('/members/birthdays', (c) => {
    counter.calls += 1;
    return c.json({ success: true, data: [`appel ${counter.calls}`] });
  });
  app.get('/teams/my-fixtures', (c) => {
    counter.calls += 1;
    return c.json({ success: true, data: [] });
  });
  app.get('/shop/products', (c) => {
    counter.calls += 1;
    return c.json({ success: false }, 500);
  });
  return app;
}

describe('cachedReadTtl', () => {
  it('retient les lectures partagées ouvertes aux appelants de service', () => {
    expect(cachedReadTtl('GET', '/members/birthdays')).toBe(3600);
    expect(cachedReadTtl('GET', '/schedules')).toBe(300);
    expect(cachedReadTtl('GET', '/teams/players')).toBe(300);
  });

  it('ignore la barre oblique finale, qui désigne la même ressource', () => {
    expect(cachedReadTtl('GET', '/schedules/')).toBe(300);
  });

  it('laisse dehors ce qui est personnel ou voisin', () => {
    expect(cachedReadTtl('GET', '/teams/my-fixtures')).toBeUndefined();
    expect(cachedReadTtl('GET', '/teams/players/07123456')).toBeUndefined();
    expect(cachedReadTtl('GET', '/schedulesomething')).toBeUndefined();
    expect(cachedReadTtl('GET', '/members')).toBeUndefined();
  });

  it("ne s'applique qu'aux lectures", () => {
    expect(cachedReadTtl('POST', '/schedules')).toBeUndefined();
    expect(cachedReadTtl('DELETE', '/schedules')).toBeUndefined();
  });
});

describe('sharedReadKey', () => {
  it('range deux appelants sous deux clés : leurs réponses diffèrent', () => {
    const site = sharedReadKey('website', '/schedules', new URLSearchParams());
    const espace = sharedReadKey('storefront', '/schedules', new URLSearchParams());
    expect(site.url).not.toBe(espace.url);
  });

  it("réunit les paramètres écrits dans un autre ordre", () => {
    const a = sharedReadKey('website', '/teams', new URLSearchParams('season=2026&limit=5'));
    const b = sharedReadKey('website', '/teams', new URLSearchParams('limit=5&season=2026'));
    expect(a.url).toBe(b.url);
  });
});

describe('cacheSharedReads', () => {
  const headers = (caller: string) => ({ 'x-caller': caller });

  it('sert la seconde lecture sans toucher au handler', async () => {
    const counter = { calls: 0 };
    const app = appWith(fakeCache(), counter);

    const first = await app.request('/members/birthdays', { headers: headers('storefront') });
    const second = await app.request('/members/birthdays', { headers: headers('storefront') });

    expect(await first.json()).toEqual({ success: true, data: ['appel 1'] });
    expect(await second.json()).toEqual({ success: true, data: ['appel 1'] });
    expect(second.headers.get('x-shared-read-cache')).toBe('hit');
    expect(counter.calls).toBe(1);
  });

  it("ne sert jamais l'administration depuis le cache", async () => {
    const counter = { calls: 0 };
    const app = appWith(fakeCache(), counter);

    await app.request('/members/birthdays', { headers: headers('admin') });
    await app.request('/members/birthdays', { headers: headers('admin') });

    expect(counter.calls).toBe(2);
  });

  it('ne fait pas passer au site public la réponse servie à un adhérent', async () => {
    const counter = { calls: 0 };
    const app = appWith(fakeCache(), counter);

    await app.request('/members/birthdays', { headers: headers('storefront') });
    const site = await app.request('/members/birthdays', { headers: headers('website') });

    expect(await site.json()).toEqual({ success: true, data: ['appel 2'] });
    expect(counter.calls).toBe(2);
  });

  it('laisse passer les routes personnelles', async () => {
    const counter = { calls: 0 };
    const cache = fakeCache();
    const app = appWith(cache, counter);

    await app.request('/teams/my-fixtures', { headers: headers('storefront') });
    await app.request('/teams/my-fixtures', { headers: headers('storefront') });

    expect(counter.calls).toBe(2);
    expect(cache.size()).toBe(0);
  });

  it("ne range pas un échec, qui figerait la panne le temps du TTL", async () => {
    const counter = { calls: 0 };
    const cache = fakeCache();
    const app = appWith(cache, counter);

    await app.request('/shop/products', { headers: headers('storefront') });
    await app.request('/shop/products', { headers: headers('storefront') });

    expect(counter.calls).toBe(2);
    expect(cache.size()).toBe(0);
  });

  it("lit la base quand l'appelant ne se nomme pas", async () => {
    const counter = { calls: 0 };
    const cache = fakeCache();
    const app = appWith(cache, counter);

    await app.request('/members/birthdays');
    await app.request('/members/birthdays');

    expect(counter.calls).toBe(2);
    expect(cache.size()).toBe(0);
  });
});
