// M-03 : en-têtes de sécurité HTTP (durcissement / défense en profondeur).
//
// Le mécanisme (mutabilité des en-têtes, pose idempotente) vit dans
// `@nba/security-headers` ; ce fichier ne déclare que la politique du storefront.
//
// La CSP est **appliquée** depuis l'audit d'août 2026, après une période
// d'observation en Report-Only. Turnstile (challenges.cloudflare.com) est autorisé
// en script, cadre et connexion.

import { applySecurityHeaders as applyPolicy, withMutableHeaders } from '@nba/security-headers';
import { websiteOrigin } from './media';

/**
 * La politique, l'origine des médias passée en argument.
 *
 * Les images d'une actualité — vignette de couverture comme images insérées dans le
 * corps — sont servies par **le site public**, seul porteur de la liaison R2 et de la
 * route `/media/…` (cf. `lib/media.ts`). C'est donc une origine tierce vue d'ici, et
 * un `img-src 'self'` la bloque : le passage de Report-Only à l'application stricte a
 * suffi à les faire disparaître, sans que rien du chargement des actualités ait bougé.
 *
 * L'origine est un argument, et non une lecture directe de `websiteOrigin`, pour que
 * le test puisse l'exercer : `PUBLIC_WEBSITE_URL` n'est inlinée que dans un build
 * d'application. Même raison que `rewriteMediaPaths` dans `lib/media.ts`.
 */
export function buildCsp(mediaOrigin: string): string {
  const imgSrc = ["'self'", 'data:', 'blob:', ...(mediaOrigin ? [mediaOrigin] : [])].join(' ');

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    // Sans repli sur default-src : absente, un formulaire injecté pourrait poster
    // n'importe où. Les formulaires de la boutique (OTP, commandes) postent chez elle.
    "form-action 'self'",
    "object-src 'none'",
    `img-src ${imgSrc}`,
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    // 'self' : l'aperçu de l'attestation CSE encadre le PDF servi par la boutique
    // elle-même. La réponse PDF, de son côté, s'y prête (frame-ancestors 'self', cf.
    // @nba/security-headers) ; sans les deux, le cadre reste « bloqué ».
    "frame-src 'self' https://challenges.cloudflare.com",
    "connect-src 'self' https://challenges.cloudflare.com"
  ].join('; ');
}

const CSP = buildCsp(websiteOrigin);

export function applySecurityHeaders(response: Response): Response {
  return applyPolicy(response, {
    csp: CSP,
    hstsMaxAge: 31536000,
    permissionsPolicy: 'geolocation=(), microphone=(), camera=()'
  });
}

// Le middleware s'en sert pour ajouter un Set-Cookie à une réponse relayée.
export { withMutableHeaders };
