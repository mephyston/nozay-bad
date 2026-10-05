import { describe, it, expect } from 'vitest';
import { securityTxt, securityTxtResponse } from './security-txt';

describe('security.txt', () => {
  it('donne le contact, une expiration à moins d’un an et l’adresse canonique', () => {
    const txt = securityTxt('securite@example.org', 'https://example.org/.well-known/security.txt', new Date('2026-10-06T00:00:00Z'));
    expect(txt).toContain('Contact: mailto:securite@example.org');
    expect(txt).toContain('Expires: 2027-04-04T00:00:00Z');
    expect(txt).toContain('Canonical: https://example.org/.well-known/security.txt');
  });

  it('garde un contact déjà sous forme d’URL', () => {
    expect(securityTxt('https://example.org/securite', 'x')).toContain('Contact: https://example.org/securite');
  });

  it('répond introuvable sans contact configuré', async () => {
    expect(securityTxtResponse(undefined, new URL('https://example.org/')).status).toBe(404);
    const ok = securityTxtResponse('a@example.org', new URL('https://example.org/x'));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toContain('Canonical: https://example.org/.well-known/security.txt');
  });
});
