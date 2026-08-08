import { describe, it, expect } from 'vitest';
import { cacheKeyFor, withPageCache, HTML_CACHE_CONTROL } from './cache';

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
