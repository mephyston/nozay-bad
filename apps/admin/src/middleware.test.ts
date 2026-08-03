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

// L'API IAM est appelée pour résoudre les permissions ; on la mocke pour renvoyer
// les comptes attendus (sinon l'appel réseau échoue et le middleware répond 403).
vi.mock('@nba/api-client', () => ({
  createApiClient: () => ({
    fetch: async (url: any) => {
      if (typeof url === 'string' && url.includes('/iam/users')) {
        return new Response(
          JSON.stringify({
            data: [
              { email: 'admin@nozaybad.fr', name: 'Admin', permissions: ['*'] },
              { email: 'prod-user@nozay-bad.fr', name: 'Prod', permissions: ['*'] },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    },
  }),
}));

import { handleAuth } from './middleware';

describe('Astro Auth Middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockJwtVerify.mockReset();
    // Default to production environment to test production flow
    vi.stubEnv('DEV', '' as any);
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return 401 if Cf-Access-Jwt-Assertion header is missing in production flow', async () => {
    const context = {
      request: new Request('https://admin.nozay-bad.fr/admin'),
      locals: {},
      redirect: vi.fn()
    } as any;
    const next = vi.fn();

    const response = await handleAuth(context, next);
    expect(response.status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow access and populate locals.user in development environment (local dev bypass)', async () => {
    vi.stubEnv('DEV', 'true' as any);
    const context = {
      request: new Request('https://admin.nozay-bad.fr/admin'),
      locals: {},
      redirect: vi.fn()
    } as any;
    const next = vi.fn().mockImplementation(() => new Response('ok'));

    const response = await handleAuth(context, next);
    expect(response.status).toBe(200);
    expect(context.locals.user).toMatchObject({ email: 'admin@nozaybad.fr' });
    expect(next).toHaveBeenCalled();
  });

  it('should verify token with jose in production flow (non-localhost) and set user if valid', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { email: 'prod-user@nozay-bad.fr' }
    });

    const context = {
      request: new Request('https://admin.nozay-bad.fr/admin', {
        headers: { 'Cf-Access-Jwt-Assertion': 'real-valid-token' }
      }),
      locals: {},
      redirect: vi.fn()
    } as any;
    const next = vi.fn().mockImplementation(() => new Response('ok'));

    const response = await handleAuth(context, next);
    expect(response.status).toBe(200);
    expect(context.locals.user).toMatchObject({ email: 'prod-user@nozay-bad.fr' });
    expect(next).toHaveBeenCalled();
    expect(mockJwtVerify).toHaveBeenCalledWith(
      'real-valid-token',
      expect.any(Function),
      {
        audience: 'mock-audience-id',
        issuer: 'https://nba91.cloudflareaccess.com'
      }
    );
  });

  it('should return 403 if token verification fails in production flow', async () => {
    mockJwtVerify.mockRejectedValue(new Error('Invalid signature'));

    const context = {
      request: new Request('https://admin.nozay-bad.fr/admin', {
        headers: { 'Cf-Access-Jwt-Assertion': 'invalid-token' }
      }),
      locals: {},
      redirect: vi.fn()
    } as any;
    const next = vi.fn();

    const response = await handleAuth(context, next);
    expect(response.status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should load environment variables dynamically from context runtime env in production flow', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { email: 'prod-user@nozay-bad.fr' }
    });

    const context = {
      request: new Request('https://admin.nozay-bad.fr/admin', {
        headers: { 'Cf-Access-Jwt-Assertion': 'real-valid-token' }
      }),
      locals: {
        runtime: {
          env: {
            CF_TEAM_DOMAIN: 'https://custom-team.cloudflareaccess.com',
            CF_AUDIENCE: 'custom-audience-id'
          }
        }
      },
      redirect: vi.fn()
    } as any;
    const next = vi.fn().mockImplementation(() => new Response('ok'));

    const response = await handleAuth(context, next);
    expect(response.status).toBe(200);
    expect(context.locals.user).toMatchObject({ email: 'prod-user@nozay-bad.fr' });
    expect(next).toHaveBeenCalled();
    expect(mockJwtVerify).toHaveBeenCalledWith(
      'real-valid-token',
      expect.any(Function),
      {
        audience: 'custom-audience-id',
        issuer: 'https://custom-team.cloudflareaccess.com'
      }
    );
  });
});

