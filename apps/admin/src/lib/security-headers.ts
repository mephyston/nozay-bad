// M-03 : en-têtes de sécurité HTTP (durcissement / défense en profondeur).
//
// Le mécanisme (mutabilité des en-têtes, pose idempotente) vit dans
// `@nba/security-headers` ; ce fichier ne déclare que la politique de l'admin.
//
// La CSP est **appliquée** depuis l'audit d'août 2026 : elle a tourné en
// Report-Only le temps de se calibrer, et `unsafe-inline` (script du thème,
// îles Astro) comme Google Fonts y figurent déjà. Google Fonts
// (fonts.googleapis.com / fonts.gstatic.com) est autorisé.

import { applySecurityHeaders as applyPolicy } from '@nba/security-headers';

/**
 * Origine du site public, inlinée au build par `astro.config.mjs` (même valeur que
 * celle dont `@nba/cms` tire `mediaUrl`). Vide hors build d'application — tests,
 * Storybook —, où aucune image n'est réellement chargée.
 */
const MEDIA_ORIGIN = (import.meta.env.PUBLIC_WEBSITE_URL as string | undefined) ?? '';

/**
 * La politique, l'origine des médias passée en argument.
 *
 * Les octets d'un média sont servis par **le site public**, seul porteur de la
 * liaison R2 et de la route `/media/…` : vues d'ici, la vignette de la médiathèque
 * et l'aperçu d'une image attachée à un bloc viennent d'une origine tierce, qu'un
 * `img-src 'self'` bloque. L'origine est un argument pour que le test puisse
 * l'exercer, `PUBLIC_WEBSITE_URL` n'étant inlinée que dans un build d'application.
 */
export function buildCsp(mediaOrigin: string): string {
  const imgSrc = ["'self'", 'data:', 'blob:', ...(mediaOrigin ? [mediaOrigin] : [])].join(' ');

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `img-src ${imgSrc}`,
    "font-src 'self' https://fonts.gstatic.com data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self'"
  ].join('; ');
}

const CSP = buildCsp(MEDIA_ORIGIN);

export function applySecurityHeaders(response: Response): Response {
  return applyPolicy(response, {
    csp: CSP,
    hstsMaxAge: 31536000,
    permissionsPolicy: 'geolocation=(), microphone=(), camera=()',
    // Les navigations douces (`navigate()` du ClientRouter) refont un `fetch` du HTML.
    // Sans directive de cache, le navigateur applique une heuristique et peut resservir
    // la page depuis son cache : après une écriture, l'utilisateur reverrait les données
    // d'avant. L'admin est authentifié et sert des données nominatives et financières,
    // donc `no-store` — jamais de copie sur disque. On respecte une valeur déjà posée
    // par une route (les PDF le font explicitement).
    defaultCacheControl: 'private, no-store'
  });
}
