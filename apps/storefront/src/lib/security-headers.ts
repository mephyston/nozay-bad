// M-03 : en-têtes de sécurité HTTP (durcissement / défense en profondeur).
//
// Le mécanisme (mutabilité des en-têtes, pose idempotente) vit dans
// `@nba/security-headers` ; ce fichier ne déclare que la politique du storefront.
//
// La CSP est **appliquée** depuis l'audit d'août 2026, après une période
// d'observation en Report-Only. Turnstile (challenges.cloudflare.com) est autorisé
// en script, cadre et connexion.

import { applySecurityHeaders as applyPolicy, withMutableHeaders } from '@nba/security-headers';

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "connect-src 'self' https://challenges.cloudflare.com"
].join('; ');

export function applySecurityHeaders(response: Response): Response {
  return applyPolicy(response, {
    csp: CSP,
    hstsMaxAge: 31536000,
    permissionsPolicy: 'geolocation=(), microphone=(), camera=()'
  });
}

// Le middleware s'en sert pour ajouter un Set-Cookie à une réponse relayée.
export { withMutableHeaders };
