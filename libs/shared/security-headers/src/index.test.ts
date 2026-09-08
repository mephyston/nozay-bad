import { describe, it, expect } from 'vitest';
import { applySecurityHeaders, withMutableHeaders } from './index';

const POLICY = {
  csp: "default-src 'self'",
  hstsMaxAge: 31536000,
  permissionsPolicy: 'geolocation=()'
};

describe('applySecurityHeaders (mécanisme partagé)', () => {
  it('applique la CSP par défaut, ne fait que la rapporter en reportOnly', () => {
    const applied = applySecurityHeaders(new Response('ok'), POLICY);
    expect(applied.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
    expect(applied.headers.get('Content-Security-Policy-Report-Only')).toBeNull();

    const observed = applySecurityHeaders(new Response('ok'), { ...POLICY, reportOnly: true });
    expect(observed.headers.get('Content-Security-Policy-Report-Only')).toBe("default-src 'self'");
    expect(observed.headers.get('Content-Security-Policy')).toBeNull();
  });

  it('ne pose le Cache-Control par défaut que si la route n’a rien décidé', () => {
    const bare = applySecurityHeaders(new Response('ok'), {
      ...POLICY,
      defaultCacheControl: 'private, no-store'
    });
    expect(bare.headers.get('Cache-Control')).toBe('private, no-store');

    const pdf = applySecurityHeaders(
      new Response('ok', { headers: { 'Cache-Control': 'public, max-age=60' } }),
      { ...POLICY, defaultCacheControl: 'private, no-store' }
    );
    expect(pdf.headers.get('Cache-Control')).toBe('public, max-age=60');
  });

  /*
    L'aperçu de l'attestation CSE est un <iframe> de même origine : avec l'interdiction
    d'encadrement des pages, Chrome y affichait « Ce contenu est bloqué ».
  */
  it("laisse un PDF s'encadrer depuis sa propre origine, et seulement elle", () => {
    const policy = { ...POLICY, csp: "default-src 'self'; frame-ancestors 'none'; object-src 'none'" };
    const pdf = applySecurityHeaders(
      new Response('%PDF', { headers: { 'Content-Type': 'application/pdf' } }),
      policy
    );
    expect(pdf.headers.get('Content-Security-Policy')).toBe(
      "default-src 'self'; frame-ancestors 'self'; object-src 'none'"
    );
    expect(pdf.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');

    const page = applySecurityHeaders(
      new Response('<p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
      policy
    );
    expect(page.headers.get('Content-Security-Policy')).toBe(policy.csp);
    expect(page.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('recopie une réponse aux en-têtes immuables sans perdre corps ni statut', async () => {
    const relayed = new Response(JSON.stringify({ ok: true }), { status: 201 });
    relayed.headers.set = () => {
      throw new TypeError("Can't modify immutable headers.");
    };

    const res = withMutableHeaders(relayed);
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
