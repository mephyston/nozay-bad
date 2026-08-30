import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Écrit les en-têtes de sécurité dans le fichier `_headers` des actifs.
 *
 * Une page figée par `prerender` est servie **depuis les actifs, avant le worker** : le
 * middleware ne tourne plus, et `applySecurityHeaders` non plus. Sans ce fichier, elle
 * partirait sans CSP, sans `X-Frame-Options` et sans `no-store` — trois choses que
 * l'administration ne peut pas se permettre de perdre au passage.
 *
 * Cloudflare Access, lui, filtre en amont des actifs : la porte reste fermée. Ce qui se
 * perd n'est pas l'authentification, ce sont les en-têtes.
 *
 * La politique n'est pas recopiée ici : elle vient de `buildCsp`, la même fonction que le
 * middleware emploie. Deux politiques à tenir en accord divergent toujours, et celle-ci ne
 * se serait vue qu'en lisant les en-têtes d'une réponse en production.
 *
 * L'adaptateur Cloudflare écrit déjà ce fichier pour `/_astro/*` ; on **ajoute** à la
 * suite plutôt que d'écraser, l'ordre des règles n'important pas ici — les chemins ne se
 * recouvrent pas.
 */
export function headersStatiques({ csp }) {
  return {
    name: 'nba-headers-statiques',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const fichier = path.join(fileURLToPath(dir), '_headers');

        let existant = '';
        try {
          existant = await readFile(fichier, 'utf8');
        } catch {
          /* Premier écrit : l'adaptateur n'a rien posé. */
        }

        /*
          Deux blocs, et pas un seul.

          `Cache-Control: private, no-store` sur `/*` écraserait le cache immuable que
          l'adaptateur pose sur `/_astro/*` — les actifs hachés seraient retéléchargés à
          chaque visite. La directive de cache ne vise donc que les **pages**, là où elle
          a un sens : les navigations douces refont un `fetch` du HTML, et sans elle le
          navigateur peut resservir une page d'avant une écriture.

          Les en-têtes de sécurité, eux, ne gênent aucun actif et restent sur `/*`.
        */
        const regles = [
          '',
          '# Ajouté par nba-headers-statiques : les pages figées échappent au middleware,',
          "# c'est ici qu'elles reçoivent la politique de sécurité de l'administration.",
          '/*',
          `  Content-Security-Policy: ${csp}`,
          '  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
          '  X-Content-Type-Options: nosniff',
          '  X-Frame-Options: DENY',
          '  Referrer-Policy: strict-origin-when-cross-origin',
          '  Permissions-Policy: geolocation=(), microphone=(), camera=()',
          '',
          '# Le HTML ne se garde pas : il est nominatif, et une navigation douce le relit.',
          '/',
          '  Cache-Control: private, no-store',
          '/admin/*',
          '  Cache-Control: private, no-store',
          ''
        ].join('\n');

        await writeFile(fichier, existant + regles, 'utf8');
        logger.info('en-têtes de sécurité écrits dans _headers');
      }
    }
  };
}
