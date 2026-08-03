import { defineMiddleware } from 'astro:middleware';
import { verifySession, readSessionCookie, resolveSessionSecret } from './lib/auth';
import { resolveEnv, IS_DEV } from './lib/request-context';

// Chemins accessibles sans session : page de login, endpoints d'auth, et assets Astro (_astro/_image).
const PUBLIC_PREFIXES = ['/login', '/api/auth/', '/confidentialite', '/mentions-legales'];
// Fichiers statiques servis depuis public/ (favicon, logo, robots, manifest, polices...).
// Volontairement SANS .pdf : /api/attestation.pdf doit rester protégé (voir exclusion /api/).
const STATIC_FILE = /\.(ico|png|jpe?g|svg|webp|gif|avif|txt|xml|webmanifest|json|woff2?|ttf|otf|eot|css|js|map|mp4|webm)$/i;

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, locals } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (
    path.startsWith('/_') ||
    (!path.startsWith('/api/') && STATIC_FILE.test(path)) ||
    PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p))
  ) {
    return next();
  }

  const env = resolveEnv(locals);
  const secret = resolveSessionSecret(env, IS_DEV);

  // Fail-closed : un secret manquant en production est une erreur de configuration.
  if (!secret) {
    console.error('[auth] SESSION_SECRET non configuré');
    return new Response('Erreur de configuration serveur.', { status: 500 });
  }

  const token = readSessionCookie(request.headers.get('cookie'));
  const session = token ? await verifySession(token, secret) : null;

  if (!session) {
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ ok: false, error: 'Non authentifié.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const redirectTo = encodeURIComponent(path + url.search);
    return context.redirect(`/login?redirect=${redirectTo}`, 302);
  }

  (locals as any).session = session;
  return next();
});
