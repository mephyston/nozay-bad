import { defineMiddleware } from 'astro:middleware';
import { verifySession, readSessionCookie, resolveSessionSecret } from './lib/auth';
import { resolveEnv, IS_DEV } from './lib/request-context';
import { applySecurityHeaders } from './lib/security-headers';

// Chemins accessibles sans session : page de login, endpoints d'auth, et assets Astro (_astro/_image).
const PUBLIC_PREFIXES = ['/login', '/api/auth/', '/confidentialite', '/mentions-legales'];

/**
 * Pages publiques qui doivent tout de même reconnaître un visiteur connecté.
 *
 * Elles restent lisibles sans session — une politique de confidentialité doit
 * l'être — mais sans résoudre la session, `locals.session` reste vide et la barre
 * de navigation, conditionnée par elle, disparaît : on y arrivait depuis le menu et
 * on s'y retrouvait sans aucun moyen de revenir.
 */
const OPTIONAL_SESSION_PAGES = ['/confidentialite', '/mentions-legales'];
// Fichiers statiques servis depuis public/ (favicon, logo, robots, manifest, polices...).
// Volontairement SANS .pdf : /api/attestation.pdf doit rester protégé (voir exclusion /api/).
const STATIC_FILE = /\.(ico|png|jpe?g|svg|webp|gif|avif|txt|xml|webmanifest|json|woff2?|ttf|otf|eot|css|js|map|mp4|webm)$/i;

/**
 * Renseigne `locals.session` si un cookie valide accompagne la requête, sans jamais
 * l'exiger. Une session absente, expirée ou invalide laisse simplement la page en
 * mode déconnecté : c'est une commodité de navigation, pas un contrôle d'accès.
 */
async function attachSessionIfAny(
  context: Parameters<Parameters<typeof defineMiddleware>[0]>[0]
): Promise<void> {
  try {
    const { request, locals } = context;
    const secret = resolveSessionSecret(resolveEnv(locals), IS_DEV);
    if (!secret) return;
    const token = readSessionCookie(request.headers.get('cookie'));
    if (!token) return;
    const session = await verifySession(token, secret);
    if (session) (locals as any).session = session;
  } catch {
    // Une page publique ne doit pas échouer parce que la session est illisible.
  }
}

const handleRequest = async (
  context: Parameters<Parameters<typeof defineMiddleware>[0]>[0],
  next: Parameters<Parameters<typeof defineMiddleware>[0]>[1]
): Promise<Response> => {
  const { request, locals } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (
    path.startsWith('/_') ||
    (!path.startsWith('/api/') && STATIC_FILE.test(path)) ||
    PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p))
  ) {
    if (OPTIONAL_SESSION_PAGES.some((p) => path === p || path.startsWith(p))) {
      await attachSessionIfAny(context);
    }
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
};

// M-03 : toutes les réponses (pages, API, redirections, 401) reçoivent les en-têtes
// de sécurité.
export const onRequest = defineMiddleware(async (context, next) => {
  return applySecurityHeaders(await handleRequest(context, next));
});
