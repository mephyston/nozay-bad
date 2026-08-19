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
    // Interdire la chaîne de requête évite à un robot d'explorer cette combinatoire —
    // et écarte du même coup les liens d'aperçu partagés par erreur, ainsi que les
    // marqueurs de campagne, qui multiplieraient les adresses d'une même page.
    '# Rien de ce qui suit un « ? » n’a de contenu propre : le sitemap dit tout.',
    'Disallow: /*?',
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
