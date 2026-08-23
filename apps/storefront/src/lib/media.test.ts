import { describe, it, expect } from 'vitest';
import { rewriteMediaPaths } from './media';

const ORIGIN = 'https://nozaybad.fr';

describe('rewriteMediaPaths', () => {
  it('résout les images insérées dans le corps d’une actualité', () => {
    expect(rewriteMediaPaths('<p><img src="/media/2026/blackminton.jpg" alt="Blackminton"></p>', ORIGIN)).toBe(
      '<p><img src="https://nozaybad.fr/media/2026/blackminton.jpg" alt="Blackminton"></p>'
    );
  });

  it('résout aussi les liens de document', () => {
    expect(rewriteMediaPaths('<a href="/media/reglement.pdf">Règlement</a>', ORIGIN)).toBe(
      '<a href="https://nozaybad.fr/media/reglement.pdf">Règlement</a>'
    );
  });

  it('ne touche ni au texte ni aux autres adresses', () => {
    // « /media/ » cité dans le texte, et un lien interne qui doit rester relatif.
    const html = '<p>Déposez dans /media/ puis <a href="/animations">publiez</a>.</p>';
    expect(rewriteMediaPaths(html, ORIGIN)).toBe(html);
  });

  it('laisse le contenu intact sans origine connue', () => {
    const html = '<img src="/media/a.jpg" alt="">';
    expect(rewriteMediaPaths(html, '')).toBe(html);
  });

  it('résout toutes les adresses d’un srcset', () => {
    // Une `<source>` qui correspond l'emporte sur l'`<img>` de repli : un srcset laissé
    // en relatif ne dégraderait pas l'image, il la ferait disparaître.
    const html =
      '<picture><source type="image/webp" srcset="/media/a1/400.webp 400w, /media/a1/800.webp 800w" sizes="400px">' +
      '<img src="/media/a1/original.webp" alt="Équipe" width="400" height="300"></picture>';

    const rewritten = rewriteMediaPaths(html, ORIGIN);

    expect(rewritten).toContain(`srcset="${ORIGIN}/media/a1/400.webp 400w, ${ORIGIN}/media/a1/800.webp 800w"`);
    expect(rewritten).toContain(`src="${ORIGIN}/media/a1/original.webp"`);
  });
});
