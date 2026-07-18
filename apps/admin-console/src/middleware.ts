import { defineMiddleware } from 'astro:middleware';
import type { APIContext, MiddlewareNext } from 'astro';
import { jwtVerify, createRemoteJWKSet } from 'jose';

import { env as cfEnv } from 'cloudflare:workers';

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJWKS(teamDomain: string) {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

export const handleAuth = async (context: APIContext, next: MiddlewareNext) => {
  const request = context.request;

  // Only trust Vite/Astro's DEV flag — never hostname-based checks which can be
  // spoofed or triggered on internal network in production.
  if (import.meta.env.DEV) {
    context.locals.user = { email: 'admin@nozay-bad.fr' };
    return next();
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) {
    return new Response('Non autorisé. Authentification Cloudflare Access requise.', { status: 401 });
  }

  // Resolve environment variables from cloudflare:workers
  const resolvedEnv = cfEnv || {};

  const CF_TEAM_DOMAIN = resolvedEnv.CF_TEAM_DOMAIN;
  const CF_AUDIENCE = resolvedEnv.CF_AUDIENCE;

  // Fail fast: never use a fallback audience in production — an absent audience would
  // accept any valid Cloudflare Access JWT from any application.
  if (!CF_TEAM_DOMAIN || !CF_AUDIENCE) {
    console.error('[auth] CF_TEAM_DOMAIN or CF_AUDIENCE is not configured');
    return new Response('Erreur de configuration serveur.', { status: 500 });
  }

  try {
    const jwks = getJWKS(CF_TEAM_DOMAIN);
    const { payload } = await jwtVerify(token, jwks, {
      audience: CF_AUDIENCE,
      issuer: CF_TEAM_DOMAIN,
    });

    context.locals.user = { email: payload.email as string };
    return next();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[auth] JWT verification failed: ${reason} | issuer_configured: ${!!CF_TEAM_DOMAIN} | audience_configured: ${!!CF_AUDIENCE}`);
    return new Response('Authentification invalide ou expirée.', { status: 403 });
  }
};

export const onRequest = defineMiddleware(handleAuth);

