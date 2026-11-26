import { defineMiddleware } from 'astro:middleware';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { loadClubContext } from '@nba/club/context';
import { buvetteClosedResponse } from '@nba/buvette-ui';
import { applySecurityHeaders } from './lib/security';
import { isSameOrigin, IS_DEV, json, resolveEnv } from './lib/http';
import { notSignedInPage, reconnectPage, RECONNECT_PATH } from './lib/access-reconnect';

const PUBLIC_PATHS = new Set(['/retour', '/api/retour']);

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwks(teamDomain: string) {
  let set = jwksCache.get(teamDomain);
  if (!set) {
    set = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, set);
  }
  return set;
}

/**
 * Qui encaisse. Cloudflare Access filtre sur l'adresse du club devant ce Worker, et le jeton
 * qu'il pose est vérifié ici : sans audience configurée, tout jeton Access du compte passerait.
 */
async function resolveEmail(request: Request, env: Record<string, string | undefined>): Promise<string | null> {
  if (IS_DEV) return env.DEV_EMAIL || null;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  const { CF_TEAM_DOMAIN, CF_AUDIENCE } = env;
  if (!token || !CF_TEAM_DOMAIN || !CF_AUDIENCE) return null;
  try {
    const { payload } = await jwtVerify(token, jwks(CF_TEAM_DOMAIN), { audience: CF_AUDIENCE, issuer: CF_TEAM_DOMAIN });
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const env = resolveEnv<Record<string, string | undefined>>(context.locals);
  if (!isSameOrigin(context.request, context.url)) {
    return applySecurityHeaders(json({ success: false, error: 'Origine refusée.' }, 403));
  }
  // Le retour de SumUp n'a pas de session : voir pages/retour.astro.
  if (PUBLIC_PATHS.has(context.url.pathname)) return applySecurityHeaders(await next());
  // Hors Access (application Bypass) : sans jeton, elle efface les cookies Access périmés.
  if (context.url.pathname === RECONNECT_PATH) return applySecurityHeaders(reconnectPage(context.request));

  const email = await resolveEmail(context.request, env);
  if (!email) {
    const isPage = context.request.method === 'GET' && !context.url.pathname.startsWith('/api/');
    return applySecurityHeaders(isPage ? notSignedInPage() : json({ success: false, error: 'Connexion expirée ou non reconnue.' }, 401));
  }
  context.locals.email = email;

  // Éteinte par le club, la caisse le dit, au lieu d'un « ressource introuvable » sur chaque
  // appel. Le contexte du club est gardé une minute : une lecture par minute, pas par requête.
  const club = await loadClubContext(env as any, 'storefront');
  if (club.features.buvette === false) {
    return applySecurityHeaders(buvetteClosedResponse({
      title: 'La caisse est désactivée',
      message: 'La buvette a été désactivée dans les réglages du club.',
      hint: "Un membre du bureau peut la réactiver dans l'admin : Réglages du club, puis Fonctionnalités.",
      clubName: club.settings.name
    }, context.request));
  }
  return applySecurityHeaders(await next());
});
