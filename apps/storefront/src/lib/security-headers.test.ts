import { describe, it, expect } from 'vitest';
import { applySecurityHeaders, buildCsp } from './security-headers';

/**
 * Simule la réponse d'un service binding : dans workerd, ses en-têtes sont
 * immuables et toute mutation lève `TypeError: Can't modify immutable headers`.
 */
function withImmutableHeaders(response: Response): Response {
  const headers = response.headers;
  headers.set = () => {
    throw new TypeError("Can't modify immutable headers.");
  };
  headers.delete = () => {
    throw new TypeError("Can't modify immutable headers.");
  };
  return response;
}

describe('applySecurityHeaders', () => {
  it('pose les en-têtes sur une réponse classique', async () => {
    const res = applySecurityHeaders(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    // Appliquée, plus seulement observée : la période Report-Only a servi à calibrer.
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(res.headers.get('Content-Security-Policy')).toContain("form-action 'self'");
    expect(res.headers.get('Content-Security-Policy-Report-Only')).toBeNull();
    expect(await res.json()).toEqual({ success: true });
  });

  it('préserve corps et statut quand les en-têtes sont immuables (réponse relayée par l’API)', async () => {
    const relayed = withImmutableHeaders(
      new Response(JSON.stringify({ success: true, data: { id: 42 } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const res = applySecurityHeaders(relayed);

    expect(res.status).toBe(201);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    // La régression : le corps était perdu (500 vide) alors que l'écriture avait eu lieu.
    expect(await res.json()).toEqual({ success: true, data: { id: 42 } });
  });
});

/**
 * La régression d'août 2026 : la CSP passe de Report-Only à appliquée, et les images
 * des actualités disparaissent — elles viennent du site public, seul à servir
 * `/media/…`, donc d'une origine tierce vue d'ici.
 */
describe('buildCsp', () => {
  it("autorise en image l'origine qui sert les médias", () => {
    const csp = buildCsp('https://nozaybad.fr');

    expect(csp).toContain("img-src 'self' data: blob: https://nozaybad.fr");
  });

  it("s'en tient à l'origine propre quand aucune n'est connue", () => {
    const csp = buildCsp('');

    expect(csp).toContain("img-src 'self' data: blob:;");
  });
});
