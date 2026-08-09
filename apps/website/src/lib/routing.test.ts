import { describe, it, expect } from 'vitest';
import { isLocalHost, needsTrailingSlash } from './routing';

describe('isLocalHost', () => {
  it('reconnaît les hôtes de développement', () => {
    for (const host of ['localhost', 'site.localhost', '127.0.0.1', '127.1.2.3', '::1', '0.0.0.0']) {
      expect(isLocalHost(host), host).toBe(true);
    }
  });

  it('ne prend pas un domaine public pour un hôte local', () => {
    for (const host of ['nozaybad.fr', 'www.nozaybad.fr', 'staging-www.nozaybad.fr', 'notlocalhost.fr']) {
      expect(isLocalHost(host), host).toBe(false);
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
