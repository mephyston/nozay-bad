import { describe, it, expect } from 'vitest';
import { applySecurityHeaders } from './security-headers';

/**
 * La politique de sécurité du site, verrouillée par un test.
 *
 * Elle n'a pas d'écran ni de comportement visible : une directive élargie par mégarde
 * ne se remarque qu'au moment où quelqu'un en profite. Ce fichier fige donc ce qui est
 * ouvert, et surtout ce qui doit rester fermé.
 */
const csp = () => {
  const response = applySecurityHeaders(new Response('<p>ok</p>'), { noindex: false });
  return response.headers.get('Content-Security-Policy') ?? '';
};

/** Extrait une directive, pour comparer des ensembles plutôt que des chaînes. */
const directive = (name: string) =>
  csp()
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `))
    ?.slice(name.length + 1)
    .split(' ') ?? [];

describe('politique de sécurité du site', () => {
  it("autorise nos propres documents en cadre, pour l'aperçu des PDF", () => {
    expect(directive('frame-src')).toContain("'self'");
  });

  it('garde la liste des fournisseurs tiers fermée', () => {
    const allowed = directive('frame-src').filter((origin) => origin.startsWith('http'));
    expect(allowed.sort()).toEqual([
      'https://calendar.google.com',
      'https://docs.google.com',
      'https://www.youtube-nocookie.com',
      'https://www.youtube.com'
    ]);
  });

  it("laisse object-src fermé — un <object> accepterait n'importe quel contenu", () => {
    expect(directive('object-src')).toEqual(["'none'"]);
  });

  it("n'autorise aucune image distante : le sanitiseur le dit déjà, l'en-tête le répète", () => {
    expect(directive('img-src')).toEqual(["'self'", 'data:']);
  });

  it("interdit que le site soit embarqué ailleurs", () => {
    expect(directive('frame-ancestors')).toEqual(["'none'"]);
  });
});
