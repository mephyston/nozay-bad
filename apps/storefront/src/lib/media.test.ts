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
});
