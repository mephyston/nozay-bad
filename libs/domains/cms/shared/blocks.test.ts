import { describe, it, expect } from 'vitest';
import { flattenBlocks, isBlockColumn, NESTABLE_BLOCK_TYPES, BLOCK_TYPES } from './blocks';
import type { BlockPayload } from './blocks';

/**
 * `flattenBlocks` décide de ce que la page charge.
 *
 * Créneaux, agenda, actualités et médias sont lus **si la page en affiche**. Un parcours
 * qui s'arrêterait au premier niveau ne verrait rien à charger pour un bloc posé dans
 * une colonne, et celui-ci s'afficherait vide — sans erreur, sans trace, et sans que
 * rien ne le signale au rédacteur. D'où un test sur la traversée elle-même.
 */

const agenda: BlockPayload = { type: 'events', limit: 6, categories: [] };
const feed: BlockPayload = { type: 'posts_feed', limit: 6 };
const texte: BlockPayload = { type: 'richtext', html: '<p>A</p>' };

describe('flattenBlocks', () => {
  it('rend la liste telle quelle quand aucun bloc n\'en contient d\'autres', () => {
    expect(flattenBlocks([texte, agenda])).toEqual([texte, agenda]);
  });

  it('descend dans les colonnes, dans l\'ordre de la page', () => {
    const colonnes: BlockPayload = {
      type: 'columns',
      items: [{ block: feed }, { block: agenda }],
      ratio: 'wide-first'
    };

    expect(flattenBlocks([texte, colonnes]).map((b) => b.type)).toEqual([
      'richtext',
      'columns',
      'posts_feed',
      'events'
    ]);
  });

  it('ignore les colonnes de texte, qui ne portent aucun bloc', () => {
    const colonnes: BlockPayload = {
      type: 'columns',
      items: [{ html: '<p>A</p>' }, { block: agenda }]
    };

    expect(flattenBlocks([colonnes]).map((b) => b.type)).toEqual(['columns', 'events']);
  });

  it('conserve le bloc parent, qui a son propre rendu', () => {
    // La colonne elle-même porte un titre et une grille : la retirer de la liste
    // ferait disparaître le bloc de la page.
    const colonnes: BlockPayload = {
      type: 'columns',
      items: [{ block: feed }, { html: '<p>B</p>' }]
    };
    expect(flattenBlocks([colonnes])[0]).toBe(colonnes);
  });
});

describe('isBlockColumn', () => {
  it('distingue les deux formes de colonne', () => {
    expect(isBlockColumn({ html: '<p>A</p>' })).toBe(false);
    expect(isBlockColumn({ html: '<p>A</p>', mediaId: 4 })).toBe(false);
    expect(isBlockColumn({ block: agenda })).toBe(true);
  });
});

describe('NESTABLE_BLOCK_TYPES', () => {
  it('ne cite que des types réellement déclarés', () => {
    const unknown = NESTABLE_BLOCK_TYPES.filter((type) => !BLOCK_TYPES.includes(type));
    expect(unknown, `types imbriquables inconnus : ${unknown.join(', ')}`).toEqual([]);
  });

  it("exclut ce qui ne sait pas vivre dans un tiers de page", () => {
    // `hero` porte le h1 de la page, `carousel` occupe toute la largeur, `columns`
    // ouvrirait une imbrication sans fond, et `richtext` doublonnerait la colonne de
    // texte. Les retirer de cette liste est une décision, pas un oubli.
    for (const type of ['hero', 'carousel', 'columns', 'richtext'] as const) {
      expect(NESTABLE_BLOCK_TYPES).not.toContain(type);
    }
  });
});
