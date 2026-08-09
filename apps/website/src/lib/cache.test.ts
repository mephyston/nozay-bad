import { describe, it, expect } from 'vitest';
import { cacheKeyFor, withPageCache, cachedContentVersion, HTML_CACHE_CONTROL } from './cache';

describe('clé de cache', () => {
  it('intègre la version du contenu — c’est ce qui remplace la purge', () => {
    expect(cacheKeyFor('/presentation/', 4).url).toBe('https://cache.nozaybad.fr/v4/presentation/');
  });

  it('rend inatteignable tout ce qui précède un changement de version', () => {
    expect(cacheKeyFor('/presentation/', 4).url).not.toBe(cacheKeyFor('/presentation/', 5).url);
  });

  it('ne dépend pas de l’hôte servi', () => {
    // Sinon l'apex et la préproduction rempliraient deux caches pour un même contenu.
    expect(cacheKeyFor('/a/', 1).url.startsWith('https://cache.nozaybad.fr/')).toBe(true);
  });
});

describe('withPageCache', () => {
  it('ne met jamais en cache une réponse non publique', async () => {
    const response = await withPageCache(async () => new Response('ok'), {
      pathname: '/x/',
      version: 1,
      cacheable: false
    });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('pose la directive de cache sur une réponse publique', async () => {
    const response = await withPageCache(async () => new Response('ok'), {
      pathname: '/x/',
      version: 1,
      cacheable: true
    });
    // Sans `caches.default` (hors Worker), le rendu passe mais rien n'est rangé.
    expect(response.status).toBe(200);
  });

  it('garde max-age=0 pour le navigateur et s-maxage pour le bord', () => {
    // Le visiteur doit voir une page republiée sans vider son cache ; c'est le bord
    // qui absorbe la charge.
    expect(HTML_CACHE_CONTROL).toContain('max-age=0');
    expect(HTML_CACHE_CONTROL).toContain('s-maxage=3600');
    expect(HTML_CACHE_CONTROL).toContain('stale-while-revalidate');
  });
});

describe('withPageCache — ce qui est rangé', () => {
  /** `caches.default` minimal : le module ne fait que `match` et `put`. */
  function fakeCaches() {
    const entries = new Map<string, Response>();
    (globalThis as Record<string, unknown>).caches = {
      default: {
        match: async (key: Request) => entries.get(key.url)?.clone(),
        put: async (key: Request, value: Response) => void entries.set(key.url, value)
      }
    };
    return entries;
  }

  it('range une page HTML et la ressert sans rendre à nouveau', async () => {
    fakeCaches();
    let renders = 0;
    const render = async () => {
      renders++;
      return new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } });
    };
    const options = { pathname: '/x/', version: 1, cacheable: true };

    const first = await withPageCache(render, options);
    expect(first.headers.get('Cache-Control')).toBe(HTML_CACHE_CONTROL);

    await withPageCache(render, options);
    expect(renders, 'le second appel doit venir du cache').toBe(1);
  });

  it("n'écrase pas la directive d'une réponse qui n'est pas du HTML", async () => {
    // Le middleware enveloppe tout : `rss.xml`, `sitemap.xml` et `/media/` posent leur
    // propre directive, et l'immuable des médias ne doit pas devenir une heure.
    fakeCaches();
    const immutable = 'public, max-age=31536000, immutable';
    const response = await withPageCache(
      async () => new Response('bytes', { headers: { 'Content-Type': 'image/webp', 'Cache-Control': immutable } }),
      { pathname: '/media/a/1.webp', version: 1, cacheable: true }
    );
    expect(response.headers.get('Cache-Control')).toBe(immutable);
  });

  it('ne range pas une erreur, qui figerait une panne passagère', async () => {
    const entries = fakeCaches();
    await withPageCache(
      async () => new Response('boom', { status: 500, headers: { 'Content-Type': 'text/html' } }),
      { pathname: '/y/', version: 1, cacheable: true }
    );
    expect(entries.size).toBe(0);
  });

  it('change de clé quand le contenu est republié', async () => {
    fakeCaches();
    let renders = 0;
    const render = async () => {
      renders++;
      return new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } });
    };
    await withPageCache(render, { pathname: '/x/', version: 1, cacheable: true });
    await withPageCache(render, { pathname: '/x/', version: 2, cacheable: true });
    expect(renders, 'une republication doit forcer un nouveau rendu').toBe(2);
  });
});

describe('cachedContentVersion', () => {
  it("ne relit l'autorité qu'une fois tant que l'entrée vit", async () => {
    const entries = new Map<string, Response>();
    (globalThis as Record<string, unknown>).caches = {
      default: {
        match: async (key: Request) => entries.get(key.url)?.clone(),
        put: async (key: Request, value: Response) => void entries.set(key.url, value)
      }
    };
    let reads = 0;
    const read = async () => {
      reads++;
      return 7;
    };
    expect(await cachedContentVersion(read)).toBe(7);
    expect(await cachedContentVersion(read)).toBe(7);
    // Sans cela, chaque succès de cache coûterait encore un aller-retour à l'API et
    // le branchement n'aurait servi à rien.
    expect(reads).toBe(1);
  });

  it("se rabat sur l'autorité hors Worker", async () => {
    delete (globalThis as Record<string, unknown>).caches;
    expect(await cachedContentVersion(async () => 3)).toBe(3);
  });
});
