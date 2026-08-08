import type { APIRoute } from 'astro';

/**
 * `robots.txt`.
 *
 * En préproduction, tout est interdit : `staging-www` servant le même contenu que
 * l'apex, le laisser indexable créerait un site concurrent du vrai.
 */
export const GET: APIRoute = ({ locals, url }) => {
  const env = (locals as { runtime?: { env?: Record<string, string> } }).runtime?.env ?? {};
  const appEnv = env.APP_ENV ?? import.meta.env.PUBLIC_APP_ENV;
  const siteUrl = env.SITE_URL ?? import.meta.env.PUBLIC_SITE_URL ?? url.origin;

  const body =
    appEnv === 'production'
      ? ['User-agent: *', 'Allow: /', '', `Sitemap: ${new URL('/sitemap.xml', siteUrl)}`, ''].join('\n')
      : ['User-agent: *', 'Disallow: /', ''].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  });
};
