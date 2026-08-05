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

/**
 * Applique les en-têtes de sécurité sur une réponse (idempotent).
 *
 * Une réponse renvoyée telle quelle par un service binding (les pages qui relaient
 * l'API : POST /boutique, POST /note-de-frais) a des en-têtes **immuables** : les
 * muter lève `TypeError: Can't modify immutable headers`, l'erreur remonte au
 * middleware et Astro répond 500 au corps vide — côté client `res.json()` échoue sur
 * « Unexpected end of JSON input » alors que la commande a bien été enregistrée.
 * On repasse donc par une copie mutable dans ce cas.
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
