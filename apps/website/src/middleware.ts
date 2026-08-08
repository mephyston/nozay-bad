import { defineMiddleware } from 'astro:middleware';
import { applySecurityHeaders } from './lib/security-headers';
import { resolveEnv } from './lib/request-context';

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
  // dédoublent le cache. On tranche par une redirection permanente vers l'apex.
  if (canonical && appEnv !== 'development' && url.hostname !== canonical) {
    url.hostname = canonical;
    return Response.redirect(url.toString(), 301);
  }

  const response = await next();

  // La préproduction ne doit jamais entrer dans un index, quoi qu'il arrive : le
  // `robots.txt` le dit déjà, l'en-tête le répète pour les pages atteintes en direct.
  return applySecurityHeaders(response, { noindex: appEnv === 'staging' });
});
