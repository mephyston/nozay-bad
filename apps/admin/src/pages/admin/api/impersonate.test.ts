import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from './impersonate';

/**
 * Prise et abandon d'identité.
 *
 * La régression que ces tests ferment : la garde portait sur `locals.user`, donc sur
 * l'identité *empruntée*. Comme `iam:sessions:impersonate` n'appartient qu'à
 * `super_admin` et qu'on ne peut pas usurper un super administrateur, l'usurpateur
 * perdait toujours le droit au moment même où il s'en servait. Le bandeau
 * « Revenir à … » répondait 403 et ne faisait rien : il fallait vider ses cookies.
 */
function call(body: unknown, locals: Record<string, unknown>) {
  return POST({
    request: new Request('https://admin.nozay-bad.fr/admin/api/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),
    locals
  } as never);
}

/** Ce que le middleware pose pendant une usurpation : l'emprunté d'un côté, le vrai de l'autre. */
const pendantUsurpation = {
  user: { email: 'cible@nozay-bad.fr', permissions: ['dashboard:overview:read'] },
  realUser: { email: 'admin@nozaybad.fr', permissions: ['iam:sessions:impersonate'] }
};

describe('POST /admin/api/impersonate', () => {
  /*
   * L'usurpation est un outil de préproduction : `impersonationEnabled()` la ferme
   * partout ailleurs, et le repli en l'absence de variable est « production ». Ces tests
   * déclarent donc leur environnement, plutôt que de dépendre d'un défaut.
   */
  beforeEach(() => vi.stubEnv('PUBLIC_APP_ENV', 'staging'));
  afterEach(() => vi.unstubAllEnvs());

  it('laisse revenir à son compte depuis une identité sans le moindre droit', async () => {
    const res = await call({ email: null }, pendantUsurpation);

    expect(res.status).toBe(200);
    // Cookie expiré : c'est lui, et lui seul, qui portait l'usurpation.
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  it("n'exige aucun droit pour abandonner une identité", async () => {
    // Cas limite du même principe : même sans identité réelle résolue, sortir doit
    // rester possible — reposer le cookie ne peut que réduire les droits.
    const res = await call({ email: null }, { user: { email: 'x@y.fr', permissions: [] } });

    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  it('accorde la prise d’identité sur les droits du compte réellement connecté', async () => {
    const res = await call({ email: 'cible@nozay-bad.fr' }, {
      user: { email: 'admin@nozaybad.fr', permissions: ['iam:sessions:impersonate'] },
      realUser: { email: 'admin@nozaybad.fr', permissions: ['iam:sessions:impersonate'] }
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toContain('impersonate_email=cible%40nozay-bad.fr');
    expect(res.headers.get('Set-Cookie')).toContain('HttpOnly');
  });

  it("refuse d'enchaîner vers une autre identité depuis une usurpation en cours", async () => {
    // Les droits de l'emprunté ne servent jamais de tremplin, même s'il en avait.
    const res = await call({ email: 'autre@nozay-bad.fr' }, {
      user: { email: 'cible@nozay-bad.fr', permissions: ['iam:sessions:impersonate'] },
      realUser: { email: 'sans-droit@nozay-bad.fr', permissions: ['dashboard:overview:read'] }
    });

    expect(res.status).toBe(403);
  });

  it('refuse de s’emprunter soi-même', async () => {
    const res = await call({ email: 'admin@nozaybad.fr' }, {
      user: { email: 'admin@nozaybad.fr', permissions: ['iam:sessions:impersonate'] },
      realUser: { email: 'admin@nozaybad.fr', permissions: ['iam:sessions:impersonate'] }
    });

    expect(res.status).toBe(400);
  });

  it('refuse un corps illisible', async () => {
    const res = await POST({
      request: new Request('https://admin.nozay-bad.fr/admin/api/impersonate', {
        method: 'POST',
        body: 'pas du json'
      }),
      locals: pendantUsurpation
    } as never);

    expect(res.status).toBe(400);
  });

  describe('en production', () => {
    beforeEach(() => vi.stubEnv('PUBLIC_APP_ENV', 'production'));

    it("refuse de prendre l'identité d'un autre", async () => {
      const res = await call(
        { email: 'cible@nozaybad.fr' },
        { user: { permissions: ['iam:sessions:impersonate'] }, realUser: { permissions: ['iam:sessions:impersonate'] } }
      );

      expect(res.status).toBe(403);
      expect(res.headers.get('set-cookie')).toBeNull();
    });

    it("laisse toujours abandonner une identité empruntée", async () => {
      /*
       * Sans cette exception, un compte portant encore un cookie d'un environnement où
       * la fonctionnalité existait serait enfermé : refusé à l'entrée comme à la sortie.
       */
      const res = await call({ email: null }, { user: {}, realUser: {} });

      expect(res.status).toBe(200);
      expect(res.headers.get('set-cookie')).toContain('impersonate_email=;');
    });
  });
});
