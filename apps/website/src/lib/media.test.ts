import { describe, it, expect } from 'vitest';
import { mediaIdsInBlocks } from './cms';
import { isSafeMediaKey, variantKey } from '@nba/cms/public';
import type { BlockPayload } from '@nba/cms/public';

describe('mediaIdsInBlocks', () => {
  it('collecte les identifiants de tous les types qui en portent', () => {
    const blocks: BlockPayload[] = [
      { type: 'hero', title: 'A', mediaId: 1, ctas: [] },
      { type: 'gallery', mediaIds: [2, 3], layout: 'grid' },
      { type: 'cta_grid', columns: 2, items: [{ label: 'L', href: '/x/', mediaId: 4 }] },
      { type: 'pdf_link', mediaId: 5, label: 'PDF', thumbnailMediaId: 6 },
      { type: 'person_cards', people: [{ name: 'N', role: 'R', responsibilities: [], mediaId: 7 }] },
      { type: 'carousel', slides: [{ mediaId: 8, title: 'T' }] },
      { type: 'richtext', html: '<p>sans média</p>' }
    ];
    expect(mediaIdsInBlocks(blocks).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('ne rend rien quand aucun bloc ne porte de média', () => {
    expect(mediaIdsInBlocks([{ type: 'richtext', html: '<p>x</p>' }])).toEqual([]);
  });
});

describe('isSafeMediaKey', () => {
  it('accepte une clé bien formée', () => {
    expect(isSafeMediaKey('a1b2c3d4e5f60718/800.avif')).toBe(true);
    expect(isSafeMediaKey('a1b2c3d4e5f60718/original.pdf')).toBe(true);
  });

  it('refuse toute tentative de sortir de la médiathèque', () => {
    // Le chemin vient de l'URL : sans ce contrôle, R2 servirait des objets voisins.
    expect(isSafeMediaKey('../secrets/key')).toBe(false);
    expect(isSafeMediaKey('a1b2c3d4e5f60718/../../x')).toBe(false);
    expect(isSafeMediaKey('/etc/passwd')).toBe(false);
    expect(isSafeMediaKey('ZZZZ/800.avif')).toBe(false);
  });
});

describe('variantKey', () => {
  it('compose une clé stable, dérivée du contenu', () => {
    expect(variantKey('a1b2c3d4e5f60718', 800, 'avif')).toBe('media/a1b2c3d4e5f60718/800.avif');
  });
});
