import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Intégration Astro : pose les en-têtes de sécurité sur les **fichiers statiques**.
 *
 * Le middleware d'une application ne voit passer que les réponses du worker. Les
 * fichiers d'actifs (`/_astro/*`, logos, manifeste PWA, icônes) sont servis **avant le
 * worker**, par le stockage d'actifs de Cloudflare : ils partaient sans HSTS ni
 * `X-Content-Type-Options`, ce que le scan ZAP de la préproduction a relevé sur
 * chaque feuille de style et chaque image. Un fichier `_headers` à la racine des
 * actifs est le seul endroit où ces réponses reçoivent des en-têtes.
 *
 * Seuls les en-têtes qui ont un sens sur un actif sont posés. Pas de CSP (elle vise
 * le HTML, et celle des pages reste dans `src/lib/security-headers.ts` de chaque
 * application), pas de règle de cache (l'adaptateur pose déjà l'immuable sur
 * `/_astro/*`). L'administration garde son intégration propre, `apps/admin/plugins`,
 * qui écrit en plus la CSP et le `no-store` de ses pages figées.
 *
 * L'adaptateur Cloudflare écrit déjà `_headers` pour `/_astro/*` : on **ajoute** à la
 * suite plutôt que d'écraser, les chemins ne se recouvrant pas.
 *
 * @param {{ hstsMaxAge: number, permissionsPolicy: string }} politique
 *   Les deux valeurs propres à l'application, à tenir identiques à celles de son
 *   `src/lib/security-headers.ts` : HSTS se pose par hôte et la valeur la plus
 *   récente reçue l'emporte, deux durées différentes feraient osciller le navigateur.
 */
export function headersStatiques({ hstsMaxAge, permissionsPolicy }) {
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

        const regles = [
          '',
          '# Ajouté par nba-headers-statiques (scripts/headers-statiques.mjs) : les actifs',
          "# sont servis avant le worker, c'est ici qu'ils reçoivent leurs en-têtes.",
          '/*',
          `  Strict-Transport-Security: max-age=${hstsMaxAge}; includeSubDomains; preload`,
          '  X-Content-Type-Options: nosniff',
          '  X-Frame-Options: DENY',
          '  Referrer-Policy: strict-origin-when-cross-origin',
          `  Permissions-Policy: ${permissionsPolicy}`,
          ''
        ].join('\n');

        await writeFile(fichier, existant + regles, 'utf8');
        logger.info('en-têtes de sécurité des actifs écrits dans _headers');
      }
    }
  };
}
