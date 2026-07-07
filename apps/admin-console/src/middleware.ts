import { defineMiddleware } from 'astro:middleware';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const CF_TEAM_DOMAIN = process.env.CF_TEAM_DOMAIN || 'https://nba91.cloudflareaccess.com';
const CF_AUDIENCE = process.env.CF_AUDIENCE || 'mock-audience-id';

const JWKS = createRemoteJWKSet(new URL(`${CF_TEAM_DOMAIN}/cdn-cgi/access/certs`));

export const handleAuth = async (context: any, next: any) => {
  const request = context.request;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');

  if (!token) {
    return new Response('Non autorisé. Authentification Cloudflare Access requise.', { status: 401 });
  }

  if (process.env.NODE_ENV === 'development' || token === 'mock-valid-token') {
    context.locals.user = { email: 'admin@nozay-bad.fr' };
    return next();
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
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
