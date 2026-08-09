import type { APIRoute } from 'astro';
import { listPublishedPages, listPublishedPosts } from '../lib/cms';
import { resolveEnv } from '../lib/request-context';

/**
 * Sitemap, construit depuis la base.
 *
 * Il ne contient que les pages réellement publiées : c'est lui qui dit à Google ce
 * qui compte désormais, par opposition à l'ancien sitemap WordPress où figuraient les
 * ~70 pages mortes de 2017-2019.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  const env = resolveEnv(locals);
  const siteUrl = env.SITE_URL ?? import.meta.env.PUBLIC_SITE_URL ?? url.origin;

  const pages = (await listPublishedPages(env)).filter((page) => !page.noindex);
  const { posts } = await listPublishedPosts(env, { limit: 100 });

  // Archive et actualités : ce sont elles qui portent le renouvellement du site, et
  // l'ancien sitemap WordPress les noyait parmi 70 pages mortes.
  const extra = [
    { path: '/actualites/', updatedAt: posts[0]?.updatedAt ?? new Date().toISOString() },
    ...posts.map((post) => ({ path: post.path, updatedAt: post.updatedAt }))
  ];

  const entries = [...pages.map((p) => ({ path: p.path, updatedAt: p.updatedAt })), ...extra]
    .map((entry) => {
      const loc = new URL(entry.path, siteUrl).toString();
      const lastmod = new Date(entry.updatedAt).toISOString().slice(0, 10);
      return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`;
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
