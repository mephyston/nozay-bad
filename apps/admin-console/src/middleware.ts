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

  // Resolve environment variables from cloudflare:workers, context.locals.runtime, or process.env
  const resolvedEnv = {
    ...process.env,
    ...(cfEnv || {}),
    ...(context.locals.runtime?.env || {})
  };

  const CF_TEAM_DOMAIN = resolvedEnv.CF_TEAM_DOMAIN;
  const CF_AUDIENCE = resolvedEnv.CF_AUDIENCE;

  // Fail fast: never use a fallback audience in production — an absent audience would
  // accept any valid Cloudflare Access JWT from any application.
  if (!CF_TEAM_DOMAIN || !CF_AUDIENCE) {
    const debugInfo = {
      hasProcessEnv: !!process.env,
      processEnvKeys: process.env ? Object.keys(process.env) : [],
      hasCfEnv: !!cfEnv,
      cfEnvKeys: cfEnv ? Object.keys(cfEnv) : [],
      hasRuntime: !!context.locals.runtime,
      runtimeKeys: context.locals.runtime ? Object.keys(context.locals.runtime) : [],
      runtimeEnvKeys: context.locals.runtime?.env ? Object.keys(context.locals.runtime.env) : [],
      keysOfResolvedEnv: Object.keys(resolvedEnv),
    };
    console.error('[auth] CF_TEAM_DOMAIN or CF_AUDIENCE is not configured', debugInfo);
    return new Response('Erreur de configuration serveur.\n' + JSON.stringify(debugInfo, null, 2), { status: 500 });
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
    return new Response('Authentification invalide ou expirée.', { status: 403 });
  }
};

export const onRequest = defineMiddleware(handleAuth);

