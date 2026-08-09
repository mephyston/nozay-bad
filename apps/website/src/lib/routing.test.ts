import { describe, it, expect } from 'vitest';
import { isLocalHost, needsTrailingSlash } from './routing';

describe('isLocalHost', () => {
  /**
   * Les hôtes sont dérivés d'un vrai `URL`, jamais écrits à la main.
   *
   * La version précédente comparait à « ::1 » alors que `URL.hostname` rend « [::1] »
   * : le test validait la chaîne supposée, le middleware voyait l'autre, et
   * http://[::1]:4323 partait en 301 vers le site en ligne.
   */
  const hostOf = (url: string) => new URL(url).hostname;

  it('reconnaît les hôtes de développement, sous la forme que produit URL', () => {
    for (const url of [
      'http://localhost:4323/',
      'http://site.localhost:4323/',
      'http://127.0.0.1:4323/',
      'http://127.1.2.3/',
      'http://[::1]:4323/',
      'http://0.0.0.0:4323/'
    ]) {
      expect(isLocalHost(hostOf(url)), url).toBe(true);
    }
  });

  it('ne prend pas un domaine public pour un hôte local', () => {
    for (const url of [
      'https://nozaybad.fr/',
      'https://www.nozaybad.fr/',
      'https://staging-www.nozaybad.fr/',
      'https://notlocalhost.fr/'
    ]) {
      expect(isLocalHost(hostOf(url)), url).toBe(false);
    }
  });
});

describe('needsTrailingSlash', () => {
  it('impose la barre aux pages — la forme indexée depuis WordPress', () => {
    expect(needsTrailingSlash('/presentation')).toBe(true);
    expect(needsTrailingSlash('/le-club/partenaires')).toBe(true);
  });

  it('laisse tranquille ce qui la porte déjà, et la racine', () => {
    expect(needsTrailingSlash('/presentation/')).toBe(false);
    expect(needsTrailingSlash('/')).toBe(false);
  });

  it("ne touche jamais à un fichier", () => {
    // `trailingSlash: 'always'` d'Astro ne faisait pas la distinction et mettait tous
    // les médias en 404 : /media/<clé>/400.webp/ n'est pas une adresse d'image.
    for (const path of [
      '/media/8c7246d90904af60/400.webp',
      '/media/8c7246d90904af60/original.pdf',
      '/robots.txt',
      '/sitemap.xml',
      '/rss.xml',
      '/favicon.png'
    ]) {
      expect(needsTrailingSlash(path), path).toBe(false);
    }
  });

  it("ne se laisse pas abuser par un point ailleurs que dans le dernier segment", () => {
    expect(needsTrailingSlash('/section.1/page')).toBe(true);
  });
});
