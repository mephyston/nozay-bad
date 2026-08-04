// M-03 : en-têtes de sécurité HTTP (durcissement / défense en profondeur).
//
// La CSP est posée en **Report-Only** dans un premier temps : elle n'impacte pas le
// fonctionnement (aucun blocage), mais permet de détecter les violations avant de
// basculer en application stricte. Turnstile (challenges.cloudflare.com) est autorisé.

const CSP_REPORT_ONLY = [
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

/** Applique les en-têtes de sécurité sur une réponse (idempotent). */
export function applySecurityHeaders(response: Response): Response {
  const h = response.headers;
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  h.set('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY);
  return response;
}
