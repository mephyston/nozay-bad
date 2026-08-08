import type { APIRoute } from 'astro';
import { listPublishedPages, type WebsiteEnv } from '../lib/cms';

/**
 * Sitemap, construit depuis la base.
 *
 * Il ne contient que les pages réellement publiées : c'est lui qui dit à Google ce
 * qui compte désormais, par opposition à l'ancien sitemap WordPress où figuraient les
 * ~70 pages mortes de 2017-2019.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  const env = ((locals as { runtime?: { env?: WebsiteEnv } }).runtime?.env ?? {}) as WebsiteEnv;
  const siteUrl = env.SITE_URL ?? import.meta.env.PUBLIC_SITE_URL ?? url.origin;

  const pages = (await listPublishedPages(env)).filter((page) => !page.noindex);

  const entries = pages
    .map((page) => {
      const loc = new URL(page.path, siteUrl).toString();
      const lastmod = new Date(page.updatedAt).toISOString().slice(0, 10);
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
