import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { env } from 'cloudflare:workers';
import { GET } from './members-search';
import { rateLimiter, DEFAULT_TURNSTILE_SITEVERIFY_URL } from '../../lib/turnstile';

describe('members-search API endpoint', () => {
  let mockFetch: any;

  beforeEach(() => {
    rateLimiter.clearAll();
    vi.stubGlobal('fetch', vi.fn());
    mockFetch = vi.fn();
    (env as any).API_SERVICE = {
      fetch: mockFetch
    };
    process.env.TURNSTILE_SECRET_KEY = 'test-secret-key-123';
  });

  afterEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
    if ((env as any).TURNSTILE_SECRET_KEY) {
      delete (env as any).TURNSTILE_SECRET_KEY;
    }
    if ((env as any).RATE_LIMIT_KV) {
      delete (env as any).RATE_LIMIT_KV;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns empty array if query length is less than 3', async () => {
    const request = new Request('http://localhost/api/members-search?q=ab');
    const response = await GET({ request } as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('performs name search when query contains letters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: [
          { id: 1, firstName: 'Jean', lastName: 'Dupont', licence: '1234567' }
        ]
      })
    });

    const request = new Request('http://localhost/api/members-search?q=dup');
    const response = await GET({ request } as any);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith('http://localhost/members?search=dup&limit=10');
    expect(data).toEqual([
      { id: 1, firstName: 'Jean', lastName: 'D.', licence: '12***67' }
    ]);
  });

  it('rejects short numeric searches early without hitting the backend', async () => {
    const request = new Request('http://localhost/api/members-search?q=12345');
    const response = await GET({ request } as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('performs exact licence search for full numeric queries (length >= 7)', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve({
        success: true,
        data: { id: 2, firstName: 'Pierre', lastName: 'Dubois', licence: '7890123' }
      })
    });

    const request = new Request('http://localhost/api/members-search?q=7890123');
    const response = await GET({ request } as any);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith('http://localhost/members/7890123');
    expect(data).toEqual([
      { id: 2, firstName: 'Pierre', lastName: 'D.', licence: '78***23' }
    ]);
  });

  it('rate limits after 30 requests and allows bypass via valid Turnstile token verification', async () => {
    const ipHeaders = { 'CF-Connecting-IP': '192.168.1.1' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] })
    });

    for (let i = 0; i < 30; i++) {
      const request = new Request('http://localhost/api/members-search?q=pierre', { headers: ipHeaders });
      const res = await GET({ request } as any);
      expect(res.status).toBe(200);
    }

    const blockedRequest = new Request('http://localhost/api/members-search?q=pierre', { headers: ipHeaders });
    const blockedRes = await GET({ request: blockedRequest } as any);
    expect(blockedRes.status).toBe(429);
    const blockedJson = await blockedRes.json();
    expect(blockedJson.error).toContain('Rate limit exceeded');

    const mockGlobalFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    vi.stubGlobal('fetch', mockGlobalFetch);

    const bypassRequest = new Request('http://localhost/api/members-search?q=pierre&token=fresh-token-1', {
      headers: ipHeaders
    });
    const bypassRes = await GET({ request: bypassRequest } as any);
    expect(bypassRes.status).toBe(200);
    expect(mockGlobalFetch).toHaveBeenCalledWith(
      DEFAULT_TURNSTILE_SITEVERIFY_URL,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          secret: 'test-secret-key-123',
          response: 'fresh-token-1',
          remoteip: '192.168.1.1'
        })
      })
    );
  });

  it('uses Workers KV binding when RATE_LIMIT_KV is provided', async () => {
    const mockKvStore: Record<string, any> = {};
    const mockKv = {
      get: vi.fn(async (key: string) => mockKvStore[key] || null),
      put: vi.fn(async (key: string, val: any) => { mockKvStore[key] = typeof val === 'string' ? JSON.parse(val) : val; }),
      delete: vi.fn(async (key: string) => { delete mockKvStore[key]; })
    };
    (env as any).RATE_LIMIT_KV = mockKv;

    const ipHeaders = { 'CF-Connecting-IP': '10.0.0.1' };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) });

    const request = new Request('http://localhost/api/members-search?q=pierre', { headers: ipHeaders });
    const res = await GET({ request } as any);
    expect(res.status).toBe(200);

    expect(mockKv.get).toHaveBeenCalledWith('rl:10.0.0.1', { type: 'json' });
    expect(mockKv.put).toHaveBeenCalledWith('rl:10.0.0.1', expect.any(String), expect.any(Object));
  });

  it('logs explicit error when Workers KV operation throws an exception', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failingKv = {
      get: vi.fn().mockRejectedValue(new Error('KV connection failure')),
      put: vi.fn().mockRejectedValue(new Error('KV connection failure'))
    };
    (env as any).RATE_LIMIT_KV = failingKv;

    const ipHeaders = { 'CF-Connecting-IP': '10.0.0.2' };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) });

    const request = new Request('http://localhost/api/members-search?q=pierre', { headers: ipHeaders });
    const res = await GET({ request } as any);
    expect(res.status).toBe(200);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[RateLimiter] Workers KV'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('rejects duplicate token presentation (token replay attack)', async () => {
    const ipHeaders = { 'CF-Connecting-IP': '192.168.1.2' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] })
    });

    for (let i = 0; i < 30; i++) {
      await GET({ request: new Request('http://localhost/api/members-search?q=test', { headers: ipHeaders }) } as any);
    }

    const mockGlobalFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    vi.stubGlobal('fetch', mockGlobalFetch);

    const req1 = new Request('http://localhost/api/members-search?q=test&token=reused-token-xyz', { headers: ipHeaders });
    const res1 = await GET({ request: req1 } as any);
    expect(res1.status).toBe(200);

    for (let i = 0; i < 30; i++) {
      await GET({ request: new Request('http://localhost/api/members-search?q=test', { headers: ipHeaders }) } as any);
    }

    const req2 = new Request('http://localhost/api/members-search?q=test&token=reused-token-xyz', { headers: ipHeaders });
    const res2 = await GET({ request: req2 } as any);
    expect(res2.status).toBe(429);
    const body2 = await res2.json();
    expect(body2.error).toContain('Token captcha déjà utilisé');
  });

  it('rejects verification when Cloudflare returns success: false with error-codes', async () => {
    const ipHeaders = { 'CF-Connecting-IP': '192.168.1.3' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] })
    });

    for (let i = 0; i < 30; i++) {
      await GET({ request: new Request('http://localhost/api/members-search?q=test', { headers: ipHeaders }) } as any);
    }

    const mockGlobalFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false, 'error-codes': ['invalid-input-response'] })
    });
    vi.stubGlobal('fetch', mockGlobalFetch);

    const req = new Request('http://localhost/api/members-search?q=test&token=bad-token', { headers: ipHeaders });
    const res = await GET({ request: req } as any);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain('invalid-input-response');
  });

  it('fails closed when TURNSTILE_SECRET_KEY is missing in environment', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    (env as any).TURNSTILE_SECRET_KEY = undefined;

    const ipHeaders = { 'CF-Connecting-IP': '192.168.1.4' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] })
    });

    for (let i = 0; i < 30; i++) {
      await GET({ request: new Request('http://localhost/api/members-search?q=test', { headers: ipHeaders }) } as any);
    }

    const req = new Request('http://localhost/api/members-search?q=test&token=token-without-secret', { headers: ipHeaders });
    const res = await GET({ request: req } as any);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain('clé secrète Turnstile manquante');
  });
});
