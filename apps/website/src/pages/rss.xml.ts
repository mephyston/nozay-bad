import type { APIRoute } from 'astro';
import { listPublishedPosts } from '../lib/cms';
import { resolveEnv } from '../lib/request-context';
import { escapeXml } from '../lib/xml';

export const GET: APIRoute = async ({ locals, url }) => {
  const env = resolveEnv(locals);
  const siteUrl = env.SITE_URL ?? import.meta.env.PUBLIC_SITE_URL ?? url.origin;
  const club = locals.club?.settings;
  const where = [club?.city, club?.region].filter(Boolean).join(' (') + (club?.region ? ')' : '');

  const { posts } = await listPublishedPosts(env, { limit: 20 });

  const items = posts
    .map((post) => {
      const link = new URL(post.path, siteUrl).toString();
      const date = post.publishedAt ? new Date(post.publishedAt).toUTCString() : '';
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      ${date ? `<pubDate>${date}</pubDate>` : ''}
      ${post.excerpt ? `<description>${escapeXml(post.excerpt)}</description>` : ''}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(club?.name ?? '')}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(`Les actualités du club de badminton${where ? ` de ${where}` : ''}.`)}</description>
    <language>fr-FR</language>
    <atom:link href="${new URL('/rss.xml', siteUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600'
    }
  });
};
