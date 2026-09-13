import { defineMiddleware } from 'astro:middleware';
import { loadClubContext, featureOn } from '@nba/club/context';
import { waitUntil } from 'cloudflare:workers';
import { verifyPreviewToken } from '@nba/preview';
import { applySecurityHeaders } from './lib/security-headers';
import { resolveEnv } from './lib/request-context';
import { isLocalHost, needsTrailingSlash } from './lib/routing';
import { cachedContentVersion, withPageCache } from './lib/cache';
import { getContentVersion } from './lib/cms';
import { createRenderContext } from './lib/render-context';

/**
 * Aucune authentification : tout ce que sert ce site est public.
 *
 * Le middleware ne fait donc que deux choses — ramener les visiteurs sur l'hôte
 * canonique, et poser les en-têtes de sécurité sur **toute** réponse, y compris les
 * 404, les redirections et les médias.
 */

/** Env de préproduction : `robots.txt` y interdit tout, l'hôte reste distinct. */
function canonicalHostFor(siteUrl: string | undefined): string | null {
  if (!siteUrl) return null;
  try {
    return new URL(siteUrl).hostname;
  } catch {
    return null;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const runtimeEnv = resolveEnv(context.locals);
  const appEnv = runtimeEnv.APP_ENV ?? import.meta.env.PUBLIC_APP_ENV;
  const canonical = canonicalHostFor(runtimeEnv.SITE_URL ?? import.meta.env.PUBLIC_SITE_URL);

  // `www.nozaybad.fr` et l'apex servant le même contenu diluent l'indexation et
  // dédoublent le cache. On tranche par une redirection permanente vers l'apex —
  // jamais en local, où elle enverrait le développeur sur le site en ligne.
  if (canonical && !isLocalHost(url.hostname) && appEnv !== 'development' && url.hostname !== canonical) {
    url.hostname = canonical;
    return Response.redirect(url.toString(), 301);
  }

  // Barre oblique finale : imposée aux pages, jamais aux fichiers (voir `routing.ts`).
  if (needsTrailingSlash(url.pathname)) {
    url.pathname += '/';
    return Response.redirect(url.toString(), 301);
  }

  // La préproduction ne doit jamais entrer dans un index, quoi qu'il arrive : le
  // `robots.txt` le dit déjà, l'en-tête le répète pour les pages atteintes en direct.
  const render = async () => {
    // Le club n'est lu qu'au rendu — jamais pour une page servie depuis le cache —
    // et une minute d'isolate suffit à ne pas le relire à chaque défaut de cache.
    context.locals.club = await loadClubContext(runtimeEnv as never, 'website');
    // Un club qui n'utilise pas le site public : rien ne répond, hors les médias que
    // l'administration et l'espace adhérent servent depuis ce même Worker.
    if (!featureOn(context.locals.club, 'website') && !url.pathname.startsWith('/media/')) {
      return applySecurityHeaders(new Response('Site non ouvert', { status: 404 }), { noindex: true });
    }
    return applySecurityHeaders(await next(), { noindex: appEnv === 'staging' });
  };

  /*
    Cache de page, ici et pas dans les pages elles-mêmes.

    C'est le seul endroit où `next()` fournit exactement la fonction de rendu
    qu'attend `withPageCache`, et où la réponse mise de côté porte déjà ses en-têtes
    de sécurité — un succès de cache doit les servir aussi.

    Trois requêtes ne passent jamais par le cache :
     - autre chose qu'un `GET`, qui n'a rien à relire ;
     - un aperçu de brouillon, propre à un seul lecteur et qui n'a rien à faire dans
       un cache **partagé** ;
     - la préproduction, dont le contenu n'a pas à survivre dans les mêmes entrées.

    Le jeton d'aperçu est **vérifié**, et pas seulement constaté. Se contenter de sa
    présence laisserait n'importe qui contourner le cache en ajoutant
    `?preview=nimportequoi`, et forcer un rendu complet à chaque requête — exactement
    le coût qu'on cherche à supprimer. Un jeton invalide désigne donc une page
    publique ordinaire, servie et mise en cache comme telle.

    Un aperçu valide, lui, court-circuite la **recherche** autant que l'écriture : le
    paramètre `preview` n'entrant pas dans la clé, un brouillon y trouverait sinon la
    version publiée à sa place.

    S'y ajoute la demande de plage (`Range`), qu'un lecteur de PDF mobile émet à chaque
    saut de page : la réponse est un 206 partiel, que l'API Cache refuse de ranger et
    qui n'aurait de toute façon aucun sens sous la clé du document entier.
  */
  const isPreview = await verifyPreviewToken(
    url.searchParams.get('preview'),
    url.pathname,
    runtimeEnv.PREVIEW_TOKEN_SECRET
  );

  const bypass =
    context.request.method !== 'GET' ||
    isPreview ||
    appEnv === 'staging' ||
    context.request.headers.has('range');

  if (bypass) {
    // Contexte tout de même posé : sans version, les lectures d'API ne sont pas
    // rangées, mais elles ont toujours besoin de `waitUntil` et d'un endroit où
    // signaler un repli.
    context.locals.render = createRenderContext({ waitUntil });
    return render();
  }

  const version = await cachedContentVersion(() => getContentVersion(runtimeEnv), waitUntil);
  const renderContext = createRenderContext({ version, waitUntil });
  context.locals.render = renderContext;

  return withPageCache(render, {
    pathname: url.pathname,
    search: url.searchParams,
    version,
    cacheable: true,
    waitUntil,
    // Lu après le flux, quand tous les composants ont fini : une page à laquelle il
    // manque son menu ou ses actualités est servie, jamais figée une heure au bord.
    isDegraded: () => renderContext.degraded
  });
});
