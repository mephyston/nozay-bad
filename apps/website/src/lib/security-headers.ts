/**
 * En-têtes de sécurité du site public.
 *
 * Le mécanisme vit dans `@nba/security-headers` ; ce fichier ne déclare que la
 * politique du site. La CSP y est appliquée depuis l'origine : nous maîtrisons
 * chaque octet de balisage, rien ne justifie l'observation.
 */

import { applySecurityHeaders as applyPolicy } from '@nba/security-headers';

/**
 * Origines autorisées en cadre.
 *
 * Les quatre fournisseurs sont alignés sur le bloc `embed`, dont la liste fermée est
 * la raison d'être — accepter un `src` libre ferait de l'administration un vecteur
 * d'injection de cadre.
 *
 * `'self'` s'y ajoute pour l'aperçu des documents du bloc `pdf_link` : le PDF est
 * servi par `/media/…`, donc par nous. L'ouverture est bornée à notre propre origine
 * et ne concède rien à un tiers. `object-src` reste à `'none'` : `<object>` et
 * `<embed>` accepteraient n'importe quel type de contenu, là où une `iframe`
 * de même origine ne sert que ce que nous avons déposé.
 */
const FRAME_SRC = [
  "'self'",
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

export function applySecurityHeaders(input: Response, options: { noindex?: boolean } = {}): Response {
  return applyPolicy(input, {
    csp: CSP,
    hstsMaxAge: 63072000,
    permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=()',
    noindex: options.noindex
  });
}
