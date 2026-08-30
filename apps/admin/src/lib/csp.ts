/**
 * La politique de sécurité du contenu de l'administration.
 *
 * Isolée dans son propre fichier, **sans aucun import** : elle est lue à deux moments qui
 * n'ont pas les mêmes résolutions de modules — par le middleware à l'exécution, et par
 * `astro.config.mjs` au chargement de la configuration, pour écrire le fichier `_headers`
 * des pages figées. Laissée dans `security-headers.ts`, elle traînait avec elle un import
 * de `@nba/security-headers` que le chargeur de configuration ne sait pas résoudre.
 *
 * Une seule politique, deux lecteurs : les tenir en double divergerait, et l'écart ne se
 * verrait qu'en lisant les en-têtes d'une réponse en production.
 */
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
