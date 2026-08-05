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

/**
 * Applique les en-têtes de sécurité sur une réponse (idempotent).
 *
 * Une réponse renvoyée telle quelle par un service binding (les pages qui relaient
 * l'API) a des en-têtes **immuables** : les muter lève `TypeError: Can't modify
 * immutable headers`, l'erreur remonte au middleware et Astro répond 500 au corps
 * vide — le client échoue alors sur « Unexpected end of JSON input » bien que
 * l'écriture ait eu lieu. On repasse donc par une copie mutable dans ce cas.
 */
export function applySecurityHeaders(response: Response): Response {
  const target = withMutableHeaders(response);
  const h = target.headers;
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  h.set('X-Frame-Options', 'DENY');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  h.set('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY);
  return target;
}

/**
 * Renvoie la réponse elle-même si ses en-têtes sont modifiables, sinon une copie
 * qui l'est (le corps est transmis tel quel, sans le bufferiser).
 */
function withMutableHeaders(response: Response): Response {
  try {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  } catch {
    const copy = new Response(response.body, response);
    copy.headers.set('X-Content-Type-Options', 'nosniff');
    return copy;
  }
}
