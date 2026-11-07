import { applySecurityHeaders as applyPolicy } from '@nba/security-headers';

/** La caméra sert à scanner le QR code des clients : c'est la seule différence avec le storefront. */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'"
].join('; ');

export function applySecurityHeaders(response: Response): Response {
  return applyPolicy(response, {
    csp: CSP,
    hstsMaxAge: 31536000,
    permissionsPolicy: 'geolocation=(), microphone=(), camera=(self)',
    defaultCacheControl: 'private, no-store',
    noindex: true
  });
}
