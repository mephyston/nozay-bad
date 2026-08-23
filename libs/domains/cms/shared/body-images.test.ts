import { describe, it, expect } from 'vitest';
import { enhanceBodyImages, mediaHashesInHtml } from './body-images';
import type { CmsMediaVariantRow } from './schema';

const HASH = '61e8179aed4382cc';

function variant(width: number, format: string, hash = HASH): CmsMediaVariantRow {
  return {
    id: width,
    mediaId: 1,
    format,
    width,
    height: Math.round(width * 0.75),
    sizeBytes: width * 40,
    key: `media/${hash}/${width}.${format}`
  } as CmsMediaVariantRow;
}

const IMG = `<img src="/media/${HASH}/original.webp" alt="Équipe" width="400" height="300" loading="lazy" decoding="async">`;

describe('mediaHashesInHtml', () => {
  it('relève les empreintes citées, sans doublon', () => {
    const html = `<p>a</p>${IMG}<p>b</p>${IMG}`;
    expect(mediaHashesInHtml(html)).toEqual([HASH]);
  });

  it('ignore un texte sans image', () => {
    expect(mediaHashesInHtml('<p>Rien à signaler</p>')).toEqual([]);
  });
});

describe('enhanceBodyImages', () => {
  it('enveloppe l’image dans un picture, avif puis webp', () => {
    const html = enhanceBodyImages(IMG, [variant(400, 'avif'), variant(800, 'avif'), variant(400, 'webp'), variant(800, 'webp')]);

    expect(html).toContain('<picture>');
    expect(html.indexOf('image/avif')).toBeLessThan(html.indexOf('image/webp'));
    expect(html).toContain(`srcset="/media/${HASH}/400.avif 400w, /media/${HASH}/800.avif 800w"`);
  });

  it("conserve l'img d'origine comme repli", () => {
    const html = enhanceBodyImages(IMG, [variant(400, 'webp')]);
    expect(html).toContain(IMG);
  });

  it('déduit sizes de la largeur affichée', () => {
    // Sans cela, le navigateur suppose une pleine largeur et reprend la plus grande
    // déclinaison : le redimensionnement à 400 px ne pèserait alors rien de moins.
    const html = enhanceBodyImages(IMG, [variant(400, 'webp'), variant(1600, 'webp')]);
    expect(html).toContain('sizes="(max-width: 400px) 100vw, 400px"');
  });

  it('laisse intacte une image dont on ne connaît aucune déclinaison', () => {
    const html = enhanceBodyImages(IMG, [variant(400, 'webp', 'ffffffffffffffff')]);
    expect(html).toBe(IMG);
  });

  it('ne touche pas au texte sans image ni au HTML sans déclinaison', () => {
    expect(enhanceBodyImages('<p>Texte</p>', [variant(400, 'webp')])).toBe('<p>Texte</p>');
    expect(enhanceBodyImages(IMG, [])).toBe(IMG);
  });

  it('traite plusieurs images du même article', () => {
    const other = `<img src="/media/aaaabbbbccccdddd/original.jpg" alt="Autre" width="800" height="600">`;
    const html = enhanceBodyImages(`${IMG}<p>x</p>${other}`, [
      variant(400, 'webp'),
      variant(800, 'webp', 'aaaabbbbccccdddd')
    ]);
    expect(html.match(/<picture>/g)).toHaveLength(2);
    expect(html).toContain('sizes="(max-width: 800px) 100vw, 800px"');
  });
});
