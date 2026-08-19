import type { APIRoute } from 'astro';
import { listPublishedPages, listPublishedPosts, type PostRow } from '../lib/cms';
import { resolveEnv } from '../lib/request-context';
import { escapeXml, isoDay } from '../lib/xml';

/**
 * Sitemap, construit depuis la base.
 *
 * Il ne contient que les pages réellement publiées : c'est lui qui dit à Google ce
 * qui compte désormais, par opposition à l'ancien sitemap WordPress où figuraient les
 * ~70 pages mortes de 2017-2019.
 *
 * Il porte aussi, depuis que `robots.txt` interdit la chaîne de requête, la seule
 * façon dont un moteur découvre les articles : la pagination des actualités ne lui
 * est plus ouverte. D'où l'énumération **complète** ci-dessous — un article absent
 * d'ici n'est atteignable par aucun robot.
 *
 * `lastmod` est le second levier contre l'exploration inutile : c'est lui qui permet
 * à un moteur de ne pas revenir sur une page inchangée. `changefreq` et `priority`
 * sont volontairement absents — Google les ignore depuis des années.
 */

/** Par lot : l'API borne `limit` à trois chiffres, et rien n'oblige à tout demander d'un coup. */
const BATCH = 200;

/**
 * Garde-fou. La spécification autorise 50 000 adresses ; le club n'en aura jamais
 * plus de quelques centaines. Cette borne existe pour qu'une anomalie en base ne se
 * traduise pas par un document de plusieurs mégaoctets rendu à chaque robot.
 */
const MAX_URLS = 5000;

async function allPublishedPosts(env: ReturnType<typeof resolveEnv>): Promise<PostRow[]> {
  const collected: PostRow[] = [];
  for (let offset = 0; collected.length < MAX_URLS; offset += BATCH) {
    const { posts, total } = await listPublishedPosts(env, { limit: BATCH, offset });
    collected.push(...posts);
    // `posts.length === 0` : condition d'arrêt réelle. Se fier au seul `total` ferait
    // tourner la boucle indéfiniment si l'API le renvoyait faux.
    if (posts.length === 0 || collected.length >= total) break;
  }
  return collected.slice(0, MAX_URLS);
}

export const GET: APIRoute = async ({ locals, url }) => {
  const env = resolveEnv(locals);
  const siteUrl = env.SITE_URL ?? import.meta.env.PUBLIC_SITE_URL ?? url.origin;

  const pages = (await listPublishedPages(env)).filter((page) => !page.noindex);
  const posts = await allPublishedPosts(env);

  // Archive et actualités : ce sont elles qui portent le renouvellement du site, et
  // l'ancien sitemap WordPress les noyait parmi 70 pages mortes.
  const extra = [
    { path: '/actualites/', updatedAt: posts[0]?.updatedAt ?? new Date().toISOString() },
    ...posts.map((post) => ({ path: post.path, updatedAt: post.updatedAt }))
  ];

  const entries = [...pages.map((p) => ({ path: p.path, updatedAt: p.updatedAt })), ...extra]
    .map((entry) => {
      const loc = escapeXml(new URL(entry.path, siteUrl).toString());
      return `  <url><loc>${loc}</loc><lastmod>${isoDay(entry.updatedAt)}</lastmod></url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  });
};
