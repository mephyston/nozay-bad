import { defineMiddleware } from 'astro:middleware';
import { loadClubContext } from '@nba/club/context';
import { applySecurityHeaders } from './lib/security';
import { isSameOrigin, json, resolveEnv, sessionSecret } from './lib/http';
import { CARD_COOKIE, readCookie, verifyCardSession } from './lib/session';

/** Lisibles avant d'ouvrir une carte : on les accepte depuis la page de connexion. */
const LEGAL_PAGES = new Set(['/mentions-legales', '/confidentialite', '/conditions']);

export const onRequest = defineMiddleware(async (context, next) => {
  const env = resolveEnv<Record<string, any>>(context.locals);
  if (!isSameOrigin(context.request, context.url)) {
    return applySecurityHeaders(json({ ok: false, error: 'Origine refusée.' }, 403));
  }

  context.locals.club = await loadClubContext(env as any, 'storefront');
  // Éteinte par le club, la buvette n'existe pas. Les soldes restent dus : ils ne bougent pas.
  if (context.locals.club.features.buvette === false) {
    return applySecurityHeaders(new Response('Introuvable', { status: 404 }));
  }

  const secret = sessionSecret(env);
  const token = readCookie(context.request.headers.get('cookie'), CARD_COOKIE);
  if (secret && token) {
    const session = await verifyCardSession(token, secret);
    if (session) context.locals.card = session;
  }
  // Sans carte sur cet appareil, tout mène à la connexion. Les appels d'API répondent eux-mêmes.
  const path = context.url.pathname;
  const isOpen = path === '/connexion' || LEGAL_PAGES.has(path) || path.startsWith('/carte/') || path.startsWith('/api/') || path.startsWith('/_astro/') || path === '/logo.png';
  if (!context.locals.card && !isOpen) return applySecurityHeaders(context.redirect('/connexion'));
  return applySecurityHeaders(await next());
});
