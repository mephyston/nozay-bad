import { describe, it, expect } from 'vitest';
import {
  cacheKeyFor,
  canonicalQuery,
  withPageCache,
  withDataCache,
  cachedContentVersion,
  isFingerprintedPath,
  HTML_CACHE_CONTROL,
  IMMUTABLE_CACHE_CONTROL,
  NOT_FOUND_CACHE_CONTROL
} from './cache';

const query = (search: string) => canonicalQuery(new URLSearchParams(search));

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

describe('chaîne de requête canonique', () => {
  it('distingue deux rubriques d’actualités', () => {
    // Le défaut d'origine : la chaîne de requête était écartée, donc la première
    // rubrique rendue était resservie à toutes les autres. Le filtre marchait en
    // développement (sans cache) et se serait tu en production.
    expect(query('categorie=tournoi')).not.toBe(query('categorie=animation'));
  });

  it('ignore ce qui ne change pas le rendu', () => {
    // Un lien partagé porte des marqueurs de campagne ; les prendre dans la clé
    // multiplierait les entrées pour un contenu identique.
    expect(query('utm_source=facebook&fbclid=x')).toBe('');
  });

  it('ne dépend pas de l’ordre des paramètres', () => {
    expect(query('page=2&categorie=tournoi')).toBe(query('categorie=tournoi&page=2'));
  });

  it('range la première page avec la page nue', () => {
    // `?page=1` et `?page=abc` retombent tous deux sur la première page côté rendu :
    // trois entrées pour un même HTML n'auraient aucun sens.
    expect(query('page=1')).toBe('');
    expect(query('page=abc')).toBe('');
    expect(query('page=3')).toBe('?page=3');
  });

  it('refuse de mettre en cache une rubrique qui n’est pas un slug', () => {
    // Elle ne correspond à aucune rubrique, donc rend une liste vide : l'omettre de
    // la clé rangerait cette page vide à la place de la page nue.
    expect(query('categorie=<script>')).toBeNull();
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
    const response = await withPageCache(
      async () =>
        new Response('bytes', {
          headers: { 'Content-Type': 'image/webp', 'Cache-Control': IMMUTABLE_CACHE_CONTROL }
        }),
      { pathname: '/media/a/1.webp', version: 1, cacheable: true }
    );
    expect(response.headers.get('Cache-Control')).toBe(IMMUTABLE_CACHE_CONTROL);
  });

  it('range un média, que rien ne mettait au bord malgré son immuable', async () => {
    // Un Worker sur domaine personnalisé ne voit pas ses propres réponses passer par
    // le cache de la zone : sans cette entrée, chaque navigateur froid relisait R2.
    const entries = fakeCaches();
    let reads = 0;
    const render = async () => {
      reads++;
      return new Response('bytes', {
        headers: { 'Content-Type': 'image/webp', 'Cache-Control': IMMUTABLE_CACHE_CONTROL }
      });
    };
    await withPageCache(render, { pathname: '/media/abc/400.webp', version: 4, cacheable: true });
    await withPageCache(render, { pathname: '/media/abc/400.webp', version: 9, cacheable: true });

    // Une seule entrée, hors espace de version : republier un article ne doit pas
    // vider la médiathèque du bord, la clé portant déjà l'empreinte du fichier.
    expect([...entries.keys()]).toEqual(['https://cache.nozaybad.fr/media/abc/400.webp']);
    expect(reads, 'la seconde demande vient du cache malgré la republication').toBe(1);
  });

  it('range un flux ou un plan de site, qui déclarent leur propre durée', async () => {
    // `s-maxage` ne parlait qu'au navigateur : chaque robot faisait relister toutes
    // les pages et tous les articles.
    const entries = fakeCaches();
    await withPageCache(
      async () =>
        new Response('<rss/>', {
          headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=0, s-maxage=3600' }
        }),
      { pathname: '/rss.xml', version: 3, cacheable: true }
    );
    expect([...entries.keys()]).toEqual(['https://cache.nozaybad.fr/v3/rss.xml']);
  });

  it('ne range pas une réponse qui ne déclare rien', async () => {
    // Le silence n'est pas un accord : une route qui ne dit pas sa durée ne doit pas
    // hériter de celle des pages.
    const entries = fakeCaches();
    await withPageCache(async () => new Response('texte', { headers: { 'Content-Type': 'text/plain' } }), {
      pathname: '/quelque-chose',
      version: 1,
      cacheable: true
    });
    expect(entries.size).toBe(0);
  });

  it('sert un rendu dégradé sans le figer une heure au bord', async () => {
    // Le pied de page retombe sur ses valeurs par défaut quand l'API ne répond pas :
    // la page sort en 200, sans menu. La ranger propagerait la panne à tout le réseau
    // pendant une heure, bien après le rétablissement de l'API.
    const entries = fakeCaches();
    const response = await withPageCache(
      async () => new Response('<html>sans menu</html>', { headers: { 'Content-Type': 'text/html' } }),
      { pathname: '/x/', version: 1, cacheable: true, isDegraded: () => true }
    );
    expect(await response.text(), 'le visiteur doit tout de même être servi').toContain('sans menu');
    expect(entries.size, 'mais rien ne doit rester au bord').toBe(0);
  });

  it('juge la santé du rendu après le flux, et non avant', async () => {
    // Le HTML est produit en continu : quand `render()` rend la main, le pied de page
    // n'a pas encore lu l'API. Une décision prise à cet instant croirait toujours le
    // rendu sain.
    const entries = fakeCaches();
    let degraded = false;
    const render = async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('<html>'));
            // Ce que fait le pied de page une fois l'en-tête envoyé.
            degraded = true;
            controller.enqueue(new TextEncoder().encode('</html>'));
            controller.close();
          }
        }),
        { headers: { 'Content-Type': 'text/html' } }
      );

    await withPageCache(render, {
      pathname: '/x/',
      version: 1,
      cacheable: true,
      isDegraded: () => degraded
    });
    expect(entries.size).toBe(0);
  });

  it('ne range pas une erreur, qui figerait une panne passagère', async () => {
    const entries = fakeCaches();
    await withPageCache(
      async () => new Response('boom', { status: 500, headers: { 'Content-Type': 'text/html' } }),
      { pathname: '/y/', version: 1, cacheable: true }
    );
    expect(entries.size).toBe(0);
  });

  it('range une adresse morte, que les robots demandent en rafale', async () => {
    // Sans entrée, un scanner qui essaie `/wp-admin/` puis `/.env` fait payer un rendu
    // complet à chacun de ses essais : c'est lui qui décide de la charge.
    fakeCaches();
    let renders = 0;
    const render = async () => {
      renders++;
      return new Response(null, { status: 404 });
    };
    const options = { pathname: '/wp-admin/', version: 1, cacheable: true };

    const first = await withPageCache(render, options);
    expect(first.status).toBe(404);
    expect(first.headers.get('Cache-Control')).toBe(NOT_FOUND_CACHE_CONTROL);

    const second = await withPageCache(render, options);
    expect(renders, 'le second essai ne doit rien rendre').toBe(1);
    expect(second.status, 'et rester une 404').toBe(404);
  });

  it('range une page supprimée sans en faire une page', async () => {
    // 410 : la page a existé. Elle se range comme une 404, pas pour une heure.
    const entries = fakeCaches();
    const response = await withPageCache(
      async () => new Response('Cette page a été supprimée.', { status: 410 }),
      { pathname: '/vieux-tournoi/', version: 2, cacheable: true }
    );
    expect(response.status).toBe(410);
    expect(entries.size).toBe(1);
    expect(response.headers.get('Cache-Control')).toBe(NOT_FOUND_CACHE_CONTROL);
  });

  it('ne fige pas une 404 née d’une panne', async () => {
    // Le cas qui rendait le cache des 404 dangereux : une API qui répond 403 fait
    // résoudre *toutes* les adresses en « introuvable ». Le drapeau l'arrête.
    const entries = fakeCaches();
    await withPageCache(async () => new Response(null, { status: 404 }), {
      pathname: '/presentation/',
      version: 1,
      cacheable: true,
      isDegraded: () => true
    });
    expect(entries.size).toBe(0);
  });

  it('sert deux rubriques depuis deux entrées distinctes', async () => {
    fakeCaches();
    const renders: string[] = [];
    const render = (label: string) => async () => {
      renders.push(label);
      return new Response(`<html>${label}</html>`, { headers: { 'Content-Type': 'text/html' } });
    };
    const options = (search: string) => ({
      pathname: '/actualites/',
      search: new URLSearchParams(search),
      version: 1,
      cacheable: true
    });

    await withPageCache(render('tournoi'), options('categorie=tournoi'));
    const second = await withPageCache(render('animation'), options('categorie=animation'));

    expect(renders).toEqual(['tournoi', 'animation']);
    expect(await second.text()).toContain('animation');
  });

  it('ne range rien quand la demande n’est pas canonisable', async () => {
    const entries = fakeCaches();
    await withPageCache(
      async () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }),
      {
        pathname: '/actualites/',
        search: new URLSearchParams('categorie=<script>'),
        version: 1,
        cacheable: true
      }
    );
    expect(entries.size, "la page nue ne doit pas être empoisonnée").toBe(0);
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

describe('chemins empreintés', () => {
  it('range les médias hors de tout espace de version', () => {
    expect(isFingerprintedPath('/media/abc/400.webp')).toBe(true);
    expect(isFingerprintedPath('/actualites/')).toBe(false);
    expect(cacheKeyFor('/media/abc/400.webp', null).url).toBe('https://cache.nozaybad.fr/media/abc/400.webp');
  });
});

describe('withDataCache', () => {
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

  it('ne redemande pas au CMS ce qu’une autre page a déjà lu', async () => {
    // Le pied de page lit les mêmes menus et les mêmes réglages à chaque rendu : sans
    // cela, un rendu coûte quatre allers-retours avant même le contenu demandé.
    fakeCaches();
    let reads = 0;
    const read = async () => {
      reads++;
      return [{ label: 'Créneaux' }];
    };
    expect(await withDataCache('/cms/nav?location=footer', 6, read)).toEqual([{ label: 'Créneaux' }]);
    expect(await withDataCache('/cms/nav?location=footer', 6, read)).toEqual([{ label: 'Créneaux' }]);
    expect(reads).toBe(1);
  });

  it('relit tout après une publication', async () => {
    fakeCaches();
    let reads = 0;
    const read = async () => {
      reads++;
      return { footerDescription: 'Plus qu’une Tribu !' };
    };
    await withDataCache('/cms/settings', 6, read);
    await withDataCache('/cms/settings', 7, read);
    expect(reads).toBe(2);
  });

  it('ne range jamais un échec', async () => {
    // Sinon une panne d'une seconde priverait le site de son menu pour une heure.
    const entries = fakeCaches();
    expect(await withDataCache('/cms/nav?location=header', 6, async () => null)).toBeNull();
    expect(entries.size).toBe(0);
  });

  it('ne range rien sans version — un aperçu lit des brouillons', async () => {
    const entries = fakeCaches();
    let reads = 0;
    const read = async () => {
      reads++;
      return { titre: 'brouillon' };
    };
    await withDataCache('/cms/route?path=/x/', null, read);
    await withDataCache('/cms/route?path=/x/', null, read);
    expect(entries.size).toBe(0);
    expect(reads).toBe(2);
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
