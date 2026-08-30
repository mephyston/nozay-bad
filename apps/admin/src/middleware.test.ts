import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('astro:middleware', () => ({
  defineMiddleware: (fn: any) => fn,
}));

const mockJwtVerify = vi.fn();
vi.mock('jose', async (importOriginal) => {
  const original = await importOriginal<typeof import('jose')>();
  return {
    ...original,
    jwtVerify: (...args: any[]) => mockJwtVerify(...args),
  };
});

/**
 * Comptes connus de l'API IAM simulée, par adresse.
 *
 * Le middleware ne lit plus la table entière : il résout un seul compte via
 * `GET /iam/me`, en affirmant l'identité par l'en-tête `x-user-email`.
 */
const ACCOUNTS: Record<string, { roles: string[]; permissions: string[] }> = {
  'admin@nozaybad.fr': { roles: ['super_admin'], permissions: [] },
  'prod-user@nozay-bad.fr': { roles: ['super_admin'], permissions: [] }
};

let lastRequestedEmail: string | undefined;
let apiUnavailable = false;

vi.mock('@nba/api-client', () => ({
  createApiClient: (_env: unknown, identity?: { userEmail?: string }) => ({
    fetch: async (url: any) => {
      if (typeof url === 'string' && url.includes('/iam/me')) {
        lastRequestedEmail = identity?.userEmail;
        if (apiUnavailable) return new Response('nope', { status: 502 });
        const account = ACCOUNTS[identity?.userEmail ?? ''];
        return new Response(
          JSON.stringify({
            data: account
              ? {
                  id: 1,
                  email: identity!.userEmail,
                  name: 'Compte',
                  roles: account.roles,
                  permissions: account.permissions
                }
              : null
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    },
  }),
}));

import { handleAuth } from './middleware';
import { ROLE_PERMISSIONS } from '@nba/iam-ui';

// Les permissions servies par l'API simulée dérivent des rôles, comme en vrai.
for (const account of Object.values(ACCOUNTS)) {
  account.permissions = account.roles.flatMap((r) => [...(ROLE_PERMISSIONS as any)[r]]);
}

function contextFor(url: string, extra: Record<string, unknown> = {}) {
  return {
    request: new Request(url, extra.headers ? { headers: extra.headers as any } : undefined),
    locals: (extra.locals as any) ?? {},
    redirect: vi.fn()
  } as any;
}

describe('Astro Auth Middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockJwtVerify.mockReset();
    lastRequestedEmail = undefined;
    apiUnavailable = false;
    // Par défaut : flux de production.
    vi.stubEnv('DEV', '' as any);
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuse en 401 sans en-tête Cloudflare Access', async () => {
    const next = vi.fn();
    const response = await handleAuth(contextFor('https://admin.nozay-bad.fr/'), next);
    expect(response.status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('laisse passer en développement sans jeton', async () => {
    vi.stubEnv('DEV', 'true' as any);
    const next = vi.fn().mockImplementation(() => new Response('ok'));

    const context = contextFor('https://admin.nozay-bad.fr/');
    const response = await handleAuth(context, next);

    expect(response.status).toBe(200);
    expect(context.locals.user).toMatchObject({ email: 'admin@nozaybad.fr' });
    expect(next).toHaveBeenCalled();
  });

  it('vérifie le jeton et résout le compte en production', async () => {
    mockJwtVerify.mockResolvedValue({ payload: { email: 'prod-user@nozay-bad.fr' } });
    const next = vi.fn().mockImplementation(() => new Response('ok'));

    const context = contextFor('https://admin.nozay-bad.fr/', {
      headers: { 'Cf-Access-Jwt-Assertion': 'real-valid-token' }
    });
    const response = await handleAuth(context, next);

    expect(response.status).toBe(200);
    expect(context.locals.user).toMatchObject({ email: 'prod-user@nozay-bad.fr' });
    expect(context.locals.user.roles).toEqual(['super_admin']);
    expect(mockJwtVerify).toHaveBeenCalledWith('real-valid-token', expect.any(Function), {
      audience: 'mock-audience-id',
      issuer: 'https://nba91.cloudflareaccess.com'
    });
  });

  it("affirme l'identité issue du jeton, et elle seule", async () => {
    mockJwtVerify.mockResolvedValue({ payload: { email: 'prod-user@nozay-bad.fr' } });
    const next = vi.fn().mockImplementation(() => new Response('ok'));

    await handleAuth(
      contextFor('https://admin.nozay-bad.fr/', {
        headers: {
          'Cf-Access-Jwt-Assertion': 'real-valid-token',
          // En-tête forgé par le client : il ne doit jamais être repris.
          'x-user-email': 'boss@nozaybad.fr'
        }
      }),
      next
    );

    expect(lastRequestedEmail).toBe('prod-user@nozay-bad.fr');
  });

  it('refuse en 403 si le jeton est invalide', async () => {
    mockJwtVerify.mockRejectedValue(new Error('Invalid signature'));
    const next = vi.fn();

    const response = await handleAuth(
      contextFor('https://admin.nozay-bad.fr/', {
        headers: { 'Cf-Access-Jwt-Assertion': 'invalid-token' }
      }),
      next
    );

    expect(response.status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('refuse en 403 un compte non configuré', async () => {
    mockJwtVerify.mockResolvedValue({ payload: { email: 'inconnu@nozay-bad.fr' } });
    const next = vi.fn();

    const response = await handleAuth(
      contextFor('https://admin.nozay-bad.fr/', {
        headers: { 'Cf-Access-Jwt-Assertion': 'real-valid-token' }
      }),
      next
    );

    expect(response.status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  describe('API IAM injoignable', () => {
    // Le repli de développement ne doit jamais exister en production : sans réponse
    // de l'API, on ne sait pas quels droits appliquer, et deviner serait la faute.
    it('échoue en 500 en production', async () => {
      apiUnavailable = true;
      mockJwtVerify.mockResolvedValue({ payload: { email: 'prod-user@nozay-bad.fr' } });
      const next = vi.fn();

      const response = await handleAuth(
        contextFor('https://admin.nozay-bad.fr/', {
          headers: { 'Cf-Access-Jwt-Assertion': 'real-valid-token' }
        }),
        next
      );

      expect(response.status).toBe(500);
      expect(next).not.toHaveBeenCalled();
    });

    it("ne se replie pas quand l'API répond « compte inconnu »", async () => {
      // L'API est joignable et sa réponse fait autorité. Fabriquer une identité ici
      // donnerait une application à moitié fonctionnelle : les pages s'afficheraient
      // avec les droits inventés, mais l'API refuserait chacun de leurs appels.
      vi.stubEnv('DEV', 'true' as any);
      const next = vi.fn();

      // En développement l'adresse vient de DEV_EMAIL, pas du jeton Access.
      const context = contextFor('https://admin.nozay-bad.fr/', {
        locals: { runtime: { env: { DEV_EMAIL: 'inconnu@nozay-bad.fr' } } }
      });
      const response = await handleAuth(context, next);

      expect(response.status).toBe(403);
      expect(next).not.toHaveBeenCalled();
      expect(context.locals.user).toBeUndefined();
    });

    it('se replie sur DEV_ROLE en développement, et sur rien de plus', async () => {
      apiUnavailable = true;
      vi.stubEnv('DEV', 'true' as any);
      const next = vi.fn().mockImplementation(() => new Response('ok'));

      const context = contextFor('https://admin.nozay-bad.fr/', {
        locals: { runtime: { env: { DEV_ROLE: 'secretaire' } } }
      });
      const response = await handleAuth(context, next);

      expect(response.status).toBe(200);
      expect(context.locals.user.roles).toEqual(['secretaire']);
      // Surtout pas tous les droits : le repli applique un rôle, pas un laissez-passer.
      expect(context.locals.user.permissions).not.toContain('iam:users:write');
    });
  });

  it("lit les variables d'environnement depuis le runtime", async () => {
    mockJwtVerify.mockResolvedValue({ payload: { email: 'prod-user@nozay-bad.fr' } });
    const next = vi.fn().mockImplementation(() => new Response('ok'));

    const response = await handleAuth(
      contextFor('https://admin.nozay-bad.fr/', {
        headers: { 'Cf-Access-Jwt-Assertion': 'real-valid-token' },
        locals: {
          runtime: {
            env: {
              CF_TEAM_DOMAIN: 'https://custom-team.cloudflareaccess.com',
              CF_AUDIENCE: 'custom-audience-id'
            }
          }
        }
      }),
      next
    );

    expect(response.status).toBe(200);
    expect(mockJwtVerify).toHaveBeenCalledWith('real-valid-token', expect.any(Function), {
      audience: 'custom-audience-id',
      issuer: 'https://custom-team.cloudflareaccess.com'
    });
  });

  describe('autorisation de page', () => {
    beforeEach(() => {
      mockJwtVerify.mockResolvedValue({ payload: { email: 'membre@nozay-bad.fr' } });
      ACCOUNTS['membre@nozay-bad.fr'] = {
        roles: ['membre'],
        permissions: [...(ROLE_PERMISSIONS as any).membre]
      };
    });

    afterEach(() => {
      delete ACCOUNTS['membre@nozay-bad.fr'];
    });

    const withToken = (url: string) =>
      contextFor(url, { headers: { 'Cf-Access-Jwt-Assertion': 'real-valid-token' } });

    it('laisse un membre accéder à son tableau de bord', async () => {
      const next = vi.fn().mockImplementation(() => new Response('ok'));
      expect((await handleAuth(withToken('https://admin.nozay-bad.fr/'), next)).status).toBe(200);
    });

    it('refuse à un membre une page hors de son périmètre', async () => {
      const next = vi.fn();
      const response = await handleAuth(withToken('https://admin.nozay-bad.fr/admin/members'), next);
      expect(response.status).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('offre une sortie plutôt que deux mots en texte brut', async () => {
      // On tombe sur un refus sans l'avoir cherché — en empruntant une identité depuis
      // une page qu'elle n'a pas le droit d'ouvrir, par exemple. Sans lien de retour,
      // il faut connaître le bouton « précédent » pour s'en tirer.
      const response = await handleAuth(
        withToken('https://admin.nozay-bad.fr/admin/members'),
        vi.fn()
      );
      const body = await response.text();

      expect(response.headers.get('Content-Type')).toContain('text/html');
      expect(body).toContain('href="/"');
      // Le tableau de bord est joignable par construction : son droit fait partie du
      // socle réimposé à tout rôle.
      expect(body).toContain('membre@nozay-bad.fr');
    });

    it('refuse une page non déclarée dans PAGE_PERMISSIONS', async () => {
      // Le vrai filet : une page ajoutée sans y penser est refusée, elle n'hérite
      // pas d'un accès par défaut.
      const next = vi.fn();
      const response = await handleAuth(withToken('https://admin.nozay-bad.fr/admin/inconnue'), next);
      expect(response.status).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("laisse passer les points d'entrée API, gardés par l'API elle-même", async () => {
      const next = vi.fn().mockImplementation(() => new Response('ok'));
      const response = await handleAuth(
        withToken('https://admin.nozay-bad.fr/api/accounting/seasons'),
        next
      );
      expect(response.status).toBe(200);
    });
  });

  describe('usurpation', () => {
    const impersonationCookie = 'impersonate_email=cible%40nozay-bad.fr';

    // Fonctionnalité de préproduction : le middleware ignore le cookie ailleurs.
    beforeEach(() => vi.stubEnv('PUBLIC_APP_ENV', 'staging'));
    afterEach(() => vi.unstubAllEnvs());

    beforeEach(() => {
      ACCOUNTS['cible@nozay-bad.fr'] = {
        roles: ['secretaire'],
        permissions: [...(ROLE_PERMISSIONS as any).secretaire]
      };
      ACCOUNTS['sans-droit@nozay-bad.fr'] = {
        roles: ['tresorier'],
        permissions: [...(ROLE_PERMISSIONS as any).tresorier]
      };
    });

    afterEach(() => {
      delete ACCOUNTS['cible@nozay-bad.fr'];
      delete ACCOUNTS['sans-droit@nozay-bad.fr'];
    });

    it("permet à un porteur du droit d'usurper un autre compte", async () => {
      mockJwtVerify.mockResolvedValue({ payload: { email: 'prod-user@nozay-bad.fr' } });
      const next = vi.fn().mockImplementation(() => new Response('ok'));

      const context = contextFor('https://admin.nozay-bad.fr/', {
        headers: { 'Cf-Access-Jwt-Assertion': 'token', cookie: impersonationCookie }
      });
      await handleAuth(context, next);

      expect(context.locals.user.email).toBe('cible@nozay-bad.fr');
      expect(context.locals.user.roles).toEqual(['secretaire']);
      // L'identité réelle reste connue, pour le bandeau et la traçabilité.
      expect(context.locals.realUser.email).toBe('prod-user@nozay-bad.fr');
      // Et ses droits avec elle : c'est sur eux que se décide la prise d'une autre
      // identité, jamais sur ceux du compte emprunté — qui ne les a pas.
      expect(context.locals.realUser.permissions).toContain('iam:sessions:impersonate');
      expect(context.locals.user.permissions).not.toContain('iam:sessions:impersonate');
    });

    it("ignore le cookie sans le droit d'usurpation", async () => {
      mockJwtVerify.mockResolvedValue({ payload: { email: 'sans-droit@nozay-bad.fr' } });
      const next = vi.fn().mockImplementation(() => new Response('ok'));

      const context = contextFor('https://admin.nozay-bad.fr/', {
        headers: { 'Cf-Access-Jwt-Assertion': 'token', cookie: impersonationCookie }
      });
      await handleAuth(context, next);

      // Le cookie seul n'accorde rien : le droit est revérifié à chaque requête.
      expect(context.locals.user.email).toBe('sans-droit@nozay-bad.fr');
    });

    it("refuse d'usurper un super administrateur", async () => {
      // L'usurpation sert à reproduire ce que voit un utilisateur, pas à contourner
      // une limite de droits.
      mockJwtVerify.mockResolvedValue({ payload: { email: 'prod-user@nozay-bad.fr' } });
      const next = vi.fn().mockImplementation(() => new Response('ok'));

      const context = contextFor('https://admin.nozay-bad.fr/', {
        headers: {
          'Cf-Access-Jwt-Assertion': 'token',
          cookie: 'impersonate_email=admin%40nozaybad.fr'
        }
      });
      await handleAuth(context, next);

      expect(context.locals.user.email).toBe('prod-user@nozay-bad.fr');
    });
  });
});
