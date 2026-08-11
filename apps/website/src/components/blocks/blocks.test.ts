import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { BLOCK_TYPES } from '@nba/cms/public';

/**
 * Couverture des blocs, dans les deux sens.
 *
 * Même idiome que `coverage.test.ts` pour les routes et `page-permissions.test.ts`
 * pour l'administration : un type déclaré sans rendu ne produirait rien à l'écran, et
 * un rendu sans type serait du code mort. Le `switch` de `BlockRenderer` ne lève pas
 * sur un type inconnu — c'est voulu pour survivre à un déploiement en retard — donc
 * sans ce test l'oubli passerait inaperçu.
 */

const BLOCKS_DIR = __dirname;

/** Types dont le rendu n'est pas encore écrit, avec la phase qui les apportera. */
const NOT_YET_RENDERED = new Set(['person_cards']);

/**
 * Correspondance type → composant, explicite.
 *
 * Une dérivation automatique depuis le nom du type se tromperait sur `richtext`, qui
 * se rend par `RichText.astro`. Une table courte se lit mieux qu'une heuristique à
 * exceptions.
 */
const COMPONENT_BY_TYPE: Record<string, string> = {
  richtext: 'RichText',
  hero: 'Hero',
  cta_grid: 'CtaGrid',
  carousel: 'Carousel',
  gallery: 'Gallery',
  embed: 'Embed',
  person_cards: 'PersonCards',
  schedule: 'Schedule',
  pdf_link: 'PdfLink',
  posts_feed: 'PostsFeed',
  columns: 'Columns'
};

function componentName(type: string): string {
  const name = COMPONENT_BY_TYPE[type];
  if (!name) throw new Error(`type de bloc sans composant attendu : ${type}`);
  return name;
}

function renderedTypes(): string[] {
  return fs
    .readdirSync(BLOCKS_DIR)
    .filter((f) => f.endsWith('.astro') && f !== 'BlockRenderer.astro')
    .map((f) => f.replace('.astro', ''));
}

describe('couverture des blocs', () => {
  it('rend chaque type déclaré, hors ceux explicitement différés', () => {
    const rendered = new Set(renderedTypes());
    const missing = BLOCK_TYPES.filter(
      (type) => !NOT_YET_RENDERED.has(type) && !rendered.has(componentName(type))
    );
    expect(missing, `types sans composant de rendu : ${missing.join(', ')}`).toEqual([]);
  });

  it('ne conserve aucun composant orphelin', () => {
    const expected = new Set(BLOCK_TYPES.map(componentName));
    const orphans = renderedTypes().filter((name) => !expected.has(name));
    expect(orphans, `composants sans type correspondant : ${orphans.join(', ')}`).toEqual([]);
  });

  it('branche dans BlockRenderer tout ce qui est rendu', () => {
    const source = fs.readFileSync(path.join(BLOCKS_DIR, 'BlockRenderer.astro'), 'utf-8');
    const unwired = BLOCK_TYPES.filter(
      (type) => !NOT_YET_RENDERED.has(type) && !source.includes(`block.type === '${type}'`)
    );
    expect(unwired, `types non branchés dans BlockRenderer : ${unwired.join(', ')}`).toEqual([]);
  });

  it('ne diffère que des types réellement déclarés', () => {
    // Empêche la liste des reports de survivre au type qu'elle couvrait.
    const stale = [...NOT_YET_RENDERED].filter((type) => !BLOCK_TYPES.includes(type as never));
    expect(stale, `reports obsolètes : ${stale.join(', ')}`).toEqual([]);
  });

  it('attend un composant pour chaque type du catalogue', () => {
    // La table de correspondance doit suivre BLOCK_TYPES, sinon le contrôle ci-dessus
    // deviendrait aveugle à un type ajouté sans y être déclaré.
    const unmapped = BLOCK_TYPES.filter((type) => !COMPONENT_BY_TYPE[type]);
    expect(unmapped, `types absents de la table : ${unmapped.join(', ')}`).toEqual([]);
  });
});
