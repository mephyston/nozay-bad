// M-03 : en-têtes de sécurité HTTP (durcissement / défense en profondeur).
//
// CSP posée en **Report-Only** pour calibrer sans rien casser avant application stricte.
// Google Fonts (fonts.googleapis.com / fonts.gstatic.com) est autorisé.

const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'"
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
