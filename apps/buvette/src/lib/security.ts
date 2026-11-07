import { applySecurityHeaders as applyPolicy } from '@nba/security-headers';

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "img-src 'self' data:",
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
    permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
    defaultCacheControl: 'private, no-store'
  });
}
