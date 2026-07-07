import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { handleAuth } from './middleware';

describe('Astro Auth Middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockJwtVerify.mockReset();
  });

  it('should return 401 if Cf-Access-Jwt-Assertion header is missing', async () => {
    const context = {
      request: new Request('http://localhost/admin'),
      locals: {},
      redirect: vi.fn()
    } as any;
    const next = vi.fn();

    const response = await handleAuth(context, next);
    expect(response.status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow access and populate locals.user if token is mock-valid (dev mode)', async () => {
    const context = {
      request: new Request('http://localhost/admin', {
        headers: { 'Cf-Access-Jwt-Assertion': 'mock-valid-token' }
      }),
      locals: {},
      redirect: vi.fn()
    } as any;
    const next = vi.fn().mockImplementation(() => new Response('ok'));

    const response = await handleAuth(context, next);
    expect(response.status).toBe(200);
    expect(context.locals.user).toEqual({ email: 'admin@nozay-bad.fr' });
    expect(next).toHaveBeenCalled();
  });

  it('should verify token with jose in production flow and set user if valid', async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { email: 'prod-user@nozay-bad.fr' }
    });

    const context = {
      request: new Request('http://localhost/admin', {
        headers: { 'Cf-Access-Jwt-Assertion': 'real-valid-token' }
      }),
      locals: {},
      redirect: vi.fn()
    } as any;
    const next = vi.fn().mockImplementation(() => new Response('ok'));

    const response = await handleAuth(context, next);
    expect(response.status).toBe(200);
    expect(context.locals.user).toEqual({ email: 'prod-user@nozay-bad.fr' });
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

  it('should return 403 if token verification fails', async () => {
    mockJwtVerify.mockRejectedValue(new Error('Invalid signature'));

    const context = {
      request: new Request('http://localhost/admin', {
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
});
