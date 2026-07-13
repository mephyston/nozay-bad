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
  const token = request.headers.get('Cf-Access-Jwt-Assertion');

  const url = new URL(request.url);
  const isDev = import.meta.env.DEV || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') || url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (isDev) {
    context.locals.user = { email: 'admin@nozay-bad.fr' };
    return next();
  }

  if (!token) {
    return new Response('Non autorisé. Authentification Cloudflare Access requise.', { status: 401 });
  }

  // Resolve environment variables from cloudflare:workers, context.locals.runtime, or process.env
  const resolvedEnv = {
    ...process.env,
    ...(cfEnv || {}),
    ...(context.locals.runtime?.env || {})
  };

  const CF_TEAM_DOMAIN = resolvedEnv.CF_TEAM_DOMAIN || 'https://nba91.cloudflareaccess.com';
  const CF_AUDIENCE = resolvedEnv.CF_AUDIENCE || 'mock-audience-id';

  try {
    const jwks = getJWKS(CF_TEAM_DOMAIN);
    const { payload } = await jwtVerify(token, jwks, {
      audience: CF_AUDIENCE,
      issuer: CF_TEAM_DOMAIN,
    });

    context.locals.user = { email: payload.email as string };
    return next();
  } catch (err) {
    return new Response('Authentification invalide ou expirée.', { status: 403 });
  }
};

export const onRequest = defineMiddleware(handleAuth);

