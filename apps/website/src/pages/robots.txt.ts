import type { APIRoute } from 'astro';
import { resolveEnv } from '../lib/request-context';

/**
 * `robots.txt`.
 *
 * En préproduction, tout est interdit : `staging-www` servant le même contenu que
 * l'apex, le laisser indexable créerait un site concurrent du vrai.
 */

/**
 * Robots d'analyse SEO et d'aspiration, refusés en bloc.
 *
 * Ils explorent aussi vite que le site répond, ne renvoient aucun visiteur, et leur
 * seul produit est une base de données vendue à des tiers. Pour un club de badminton,
 * c'est du trafic payé — en requêtes Worker — contre rien.
 *
 * Les moteurs de recherche et les robots d'assistants (GPTBot, ClaudeBot,
 * PerplexityBot…) ne sont **pas** de la liste : eux citent leurs sources et amènent
 * des adhérents. Les y ajouter est une décision éditoriale, pas une mesure de charge.
 */
const UNWANTED_AGENTS = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'DataForSeoBot',
  'Bytespider',
  'PetalBot',
  'SeekportBot',
  'ImagesiftBot'
];

export const GET: APIRoute = ({ locals, url }) => {
  const env = resolveEnv(locals);
  const appEnv = env.APP_ENV ?? import.meta.env.PUBLIC_APP_ENV;
  const siteUrl = env.SITE_URL ?? import.meta.env.PUBLIC_SITE_URL ?? url.origin;

  const production = [
    'User-agent: *',
    'Allow: /',
    '',
    // Le filtre par rubrique et la pagination des actualités se combinent : rubriques
    // × pages, pour un contenu qui figure déjà, article par article, dans le sitemap.
    // Interdire la chaîne de requête de cette page évite à un robot d'explorer cette
    // combinatoire. Elle seule : la règle valait autrefois pour tout le site
    // (`/*?`), et Google ne pouvait alors plus constater que les URL héritées de
    // WordPress — `?replytocom=`, `/wp-includes/…?ver=` — répondent 410 ou 403. Il
    // les gardait donc dans son index, « indexées malgré le blocage ». Pour sortir de
    // l'index, une adresse doit rester explorable. Ailleurs, la chaîne de requête ne
    // change rien au rendu, et la balise canonique règle les marqueurs de campagne.
    '# Le filtre et la pagination des actualités n’ont pas de contenu propre : le sitemap dit tout.',
    'Disallow: /actualites/?',
    '',
    // Ignoré par Google, qui règle sa cadence seul et la respecte ; honoré par Bing,
    // Yandex et la plupart des robots de moindre qualité, qui sont précisément ceux
    // dont la cadence pose problème.
    'Crawl-delay: 10',
    '',
    ...UNWANTED_AGENTS.flatMap((agent) => [`User-agent: ${agent}`, 'Disallow: /', '']),
    `Sitemap: ${new URL('/sitemap.xml', siteUrl)}`,
    ''
  ];

  const body = (appEnv === 'production' ? production : ['User-agent: *', 'Disallow: /', '']).join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  });
};
