import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Aucune donnée de club dans le code.
 *
 * Depuis la Phase 0 du chantier SaaS (09/2026), tout ce qui nomme le club — son nom,
 * son sigle, sa ville, son IBAN, ses adresses — vit dans `club_settings` et se règle
 * depuis l'administration. Ce test rend impossible d'en remettre une en dur : il
 * parcourt les sources des applications et des domaines, et rougit sur les formes que
 * Nozay prenait dans le code (nom, sigle, département, IBAN, BIC, boîte mail).
 *
 * Sont exclus, et pour une raison chacun :
 *  - les tests et leurs fixtures, qui ont besoin d'un club concret pour être lisibles ;
 *  - les migrations SQL, qui sèment les valeurs du club existant à l'identique ;
 *  - `scripts/build-env.mjs`, le seul endroit du dépôt qui nomme les domaines déployés ;
 *  - `scripts/wp-import/**`, l'outillage de reprise du site WordPress de Nozay ;
 *  - le schéma drizzle d'`attestation_config`, dont les défauts de colonne reflètent
 *    la DDL de la migration 0000 et ne servent à aucune écriture ;
 *  - les commentaires, où Nozay reste l'exemple qui a fait naître chaque règle.
 */
const ROOT = path.resolve(__dirname, '..');
const SCANNED = ['apps/admin/src', 'apps/api/src', 'apps/storefront/src', 'apps/website/src', 'libs/domains', 'libs/shared', 'scripts'];
const EXTENSIONS = new Set(['.ts', '.astro', '.svelte', '.mjs', '.js']);
const IGNORED_DIRS = new Set(['node_modules', 'dist', '.astro', '.wrangler', 'migrations', 'wp-import', 'mocks']);
const ALLOWED_FILES = new Set([
  'scripts/build-env.mjs',
  'scripts/upload-club-assets.mjs',
  'scripts/generate-changelog.mjs',
  'libs/domains/members/shared/schema.ts'
]);

const FORBIDDEN = /nozay|nba ?91|nozaybad|essonne|FR76 ?3000|SOGEFRPP|tresorier@|LIFB\.91|0913011863|433 ?218 ?716|00070007847/i;

function isTest(file: string): boolean {
  return /\.(test|stories)\.[a-z]+$/.test(file) || /test-fixtures|test-identity|test-utils/.test(file);
}

/** Retire les commentaires `//`, `/* … *\/`, `<!-- … -->` et les blocs `{/* … *\/}`. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) walk(full, out);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
}

describe('identité du club hors du code', () => {
  it('ne nomme le club dans aucune source, hors tests, migrations et déploiement', () => {
    const files: string[] = [];
    for (const dir of SCANNED) walk(path.join(ROOT, dir), files);

    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      if (isTest(rel) || ALLOWED_FILES.has(rel)) continue;
      const lines = withoutComments(fs.readFileSync(file, 'utf8')).split('\n');
      lines.forEach((line, i) => {
        if (FORBIDDEN.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    }
    expect(offenders, `références au club dans le code :\n${offenders.join('\n')}`).toEqual([]);
  });
});
