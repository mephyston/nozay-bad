/**
 * En-têtes de sécurité du site public.
 *
 * Reprise de ceux du storefront, avec une différence de fond : la politique de
 * sécurité du contenu est **appliquée**, et non seulement rapportée. Le storefront
 * doit composer avec Turnstile et un widget d'authentification tiers ; ici nous
 * maîtrisons chaque octet de balisage, donc rien ne justifie de rester en observation.
 */

/** Fournisseurs d'intégration autorisés en cadre, alignés sur le bloc `embed`. */
const FRAME_SRC = [
  'https://www.youtube-nocookie.com',
  'https://www.youtube.com',
  'https://docs.google.com',
  'https://calendar.google.com'
].join(' ');

const CSP = [
  "default-src 'self'",
  // Les îles Astro sont des fichiers externes ; `unsafe-inline` reste nécessaire pour
  // le script anti-scintillement du thème, qui doit s'exécuter avant le premier rendu.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // Aucune image distante : le sanitiseur restreint déjà `src` à /media/, cette ligne
  // ferme la porte côté navigateur.
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  `frame-src ${FRAME_SRC}`,
  "form-action 'self'",
  // Le site n'est jamais embarqué ailleurs.
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'"
].join('; ');

/**
 * Les réponses issues d'un service binding portent des en-têtes immuables : les
 * modifier lève. On recopie donc la réponse plutôt que de la muter.
 */
function withMutableHeaders(response: Response): Response {
  try {
    response.headers.set('x-headers-probe', '1');
    response.headers.delete('x-headers-probe');
    return response;
  } catch {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers)
    });
  }
}

export function applySecurityHeaders(input: Response, options: { noindex?: boolean } = {}): Response {
  const response = withMutableHeaders(input);

  response.headers.set('Content-Security-Policy', CSP);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  if (options.noindex) response.headers.set('X-Robots-Tag', 'noindex, nofollow');

  return response;
}
