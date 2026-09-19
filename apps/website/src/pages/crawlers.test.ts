import { describe, it, expect, beforeEach } from 'vitest';
import { GET as robots } from './robots.txt';
import { GET as sitemap } from './sitemap.xml';

/**
 * Ce que le site dit aux robots.
 *
 * Deux fichiers, une seule idée : un moteur doit trouver *tout* le contenu sans avoir
 * à explorer quoi que ce soit d'autre. Le sitemap énumère, `robots.txt` ferme les
 * chemins combinatoires — et l'un ne tient que parce que l'autre est complet.
 */

const url = new URL('https://nozaybad.fr/robots.txt');

/** `locals` d'une requête, avec l'API que la route interrogera. */
function locals(env: Record<string, unknown>) {
  return { runtime: { env: { SITE_URL: 'https://nozaybad.fr', INTERNAL_API_KEY: 'test', ...env } } };
}

const json = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' }
  });

/**
 * Ces routes ne lisent que `locals` et `url` du contexte Astro : on les appelle avec
 * ces deux-là plutôt que de reconstituer un `APIContext` entier.
 */
type MinimalRoute = (context: { locals: unknown; url: URL }) => Response | Promise<Response>;
const call = (route: unknown, context: { locals: unknown; url: URL }) => (route as MinimalRoute)(context);

beforeEach(() => {
  // Aucune entrée de cache d'une assertion à l'autre : ces routes lisent l'API.
  delete (globalThis as Record<string, unknown>).caches;
});

describe('robots.txt', () => {
  async function body(appEnv: string) {
    const response = await call(robots, { locals: locals({ APP_ENV: appEnv }), url });
    return (response as Response).text();
  }

  it('ferme tout en préproduction', async () => {
    // `staging-www` sert le même contenu : indexable, il concurrencerait le vrai site.
    expect(await body('staging')).toContain('Disallow: /');
    expect(await body('staging')).not.toContain('Sitemap:');
  });

  it('ouvre le site et désigne le sitemap', async () => {
    const text = await body('production');
    expect(text).toContain('Allow: /');
    expect(text).toContain('Sitemap: https://nozaybad.fr/sitemap.xml');
  });

  it('ferme la chaîne de requête des actualités, dont la combinatoire est sans fond', async () => {
    // Rubriques × pages : autant d'adresses pour un contenu que le sitemap donne déjà,
    // article par article.
    expect(await body('production')).toContain('Disallow: /actualites/?');
  });

  it('tient les robots hors de la recherche, qui calcule à chaque requête', async () => {
    const text = await body('production');
    expect(text).toContain('Disallow: /recherche/');
    expect(text).toContain('Disallow: /api/');
  });

  it('laisse explorer les URL héritées de WordPress, pour qu’elles sortent de l’index', async () => {
    // Bloquée, une adresse ne peut pas être désindexée : Google ne voit jamais son
    // 410. `?replytocom=` et `/wp-includes/…?ver=` restaient ainsi « indexées malgré
    // le blocage » des semaines après la bascule.
    const text = await body('production');
    expect(text).not.toContain('Disallow: /*?');
    expect(text).not.toMatch(/^Disallow: \/wp-/m);
  });

  it('écarte les aspirateurs qui ne renvoient aucun visiteur', async () => {
    const text = await body('production');
    expect(text).toContain('User-agent: AhrefsBot');
    // Les robots d'assistants, eux, citent leurs sources : les bloquer serait une
    // décision éditoriale, pas une mesure de charge.
    expect(text).not.toContain('GPTBot');
  });
});

describe('sitemap.xml', () => {
  /** API factice : `total` articles, servis par lots comme le fait l'API réelle. */
  function api(total: number) {
    const requested: string[] = [];
    const fetchImpl = async (input: RequestInfo | URL) => {
      const target = new URL(String(input));
      requested.push(target.pathname + target.search);

      if (target.pathname === '/cms/pages') {
        return json([{ path: '/', title: 'Accueil', updatedAt: '2026-01-02', noindex: false }]);
      }
      const limit = Number(target.searchParams.get('limit') ?? '0');
      const offset = Number(target.searchParams.get('offset') ?? '0');
      const posts = Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => ({
        path: `/actualites/article-${offset + i}/`,
        updatedAt: '2026-01-03'
      }));
      return json({ posts, total });
    };
    return { requested, env: { API_SERVICE: { fetch: fetchImpl } } };
  }

  it('énumère les pages et les articles', async () => {
    const { env } = api(3);
    const xml = await (await call(sitemap, { locals: locals(env), url })).text();
    expect(xml).toContain('<loc>https://nozaybad.fr/</loc>');
    expect(xml).toContain('<loc>https://nozaybad.fr/actualites/article-2/</loc>');
    expect(xml).toContain('<lastmod>2026-01-03</lastmod>');
  });

  it('ne s’arrête pas au premier lot', async () => {
    // C'est la condition de tout le dispositif : `robots.txt` fermant la pagination,
    // un article absent du sitemap n'est atteignable par aucun moteur.
    const { env, requested } = api(450);
    const xml = await (await call(sitemap, { locals: locals(env), url })).text();
    expect(requested.filter((path) => path.startsWith('/cms/posts')).length).toBe(3);
    expect(xml).toContain('/actualites/article-449/');
  });

  it('s’arrête même si l’API annonce un total qu’elle ne sert pas', async () => {
    // Un `total` faux ferait tourner la boucle indéfiniment ; c'est le lot vide qui
    // fait foi.
    const env = {
      API_SERVICE: {
        fetch: async (input: RequestInfo | URL) =>
          new URL(String(input)).pathname === '/cms/pages' ? json([]) : json({ posts: [], total: 9999 })
      }
    };
    const xml = await (await call(sitemap, { locals: locals(env), url })).text();
    expect(xml).toContain('</urlset>');
  });

  it('survit à une date invalide en base', async () => {
    // `toISOString()` lève : une ligne mal formée emporterait tout le sitemap, donc
    // l'exploration du site entier.
    const env = {
      API_SERVICE: {
        fetch: async (input: RequestInfo | URL) =>
          new URL(String(input)).pathname === '/cms/pages'
            ? json([{ path: '/', title: 'Accueil', updatedAt: 'pas une date', noindex: false }])
            : json({ posts: [], total: 0 })
      }
    };
    const xml = await (await call(sitemap, { locals: locals(env), url })).text();
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  });
});
