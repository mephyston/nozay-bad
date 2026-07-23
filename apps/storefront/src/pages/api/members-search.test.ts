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
  });

  afterEach(() => {
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

    // 1. Send 30 requests
    for (let i = 0; i < 30; i++) {
      const request = new Request('http://localhost/api/members-search?q=pierre', { headers: ipHeaders });
      const res = await GET({ request } as any);
      expect(res.status).toBe(200);
    }

    // 2. 31st request triggers rate limit (429)
    const blockedRequest = new Request('http://localhost/api/members-search?q=pierre', { headers: ipHeaders });
    const blockedRes = await GET({ request: blockedRequest } as any);
    expect(blockedRes.status).toBe(429);
    const blockedJson = await blockedRes.json();
    expect(blockedJson.error).toContain('Rate limit exceeded');

    // 3. Stub global fetch for Turnstile siteverify
    const mockGlobalFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    vi.stubGlobal('fetch', mockGlobalFetch);

    // 4. Request with valid Turnstile token resets rate limit
    const bypassRequest = new Request('http://localhost/api/members-search?q=pierre&token=fresh-token-1', {
      headers: ipHeaders
    });
    const bypassRes = await GET({ request: bypassRequest } as any);
    expect(bypassRes.status).toBe(200);
    expect(mockGlobalFetch).toHaveBeenCalledWith(
      DEFAULT_TURNSTILE_SITEVERIFY_URL,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'fresh-token-1' })
      })
    );
  });

  it('rejects duplicate token presentation (token replay attack)', async () => {
    const ipHeaders = { 'CF-Connecting-IP': '192.168.1.2' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] })
    });

    // Exhaust rate limit limit (30 requests)
    for (let i = 0; i < 30; i++) {
      await GET({ request: new Request('http://localhost/api/members-search?q=test', { headers: ipHeaders }) } as any);
    }

    // Stub global fetch for Turnstile verification
    const mockGlobalFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    vi.stubGlobal('fetch', mockGlobalFetch);

    // Presentation 1: Valid fresh token succeeds and resets rate limit
    const req1 = new Request('http://localhost/api/members-search?q=test&token=reused-token-xyz', { headers: ipHeaders });
    const res1 = await GET({ request: req1 } as any);
    expect(res1.status).toBe(200);

    // Exhaust rate limit again (30 requests)
    for (let i = 0; i < 30; i++) {
      await GET({ request: new Request('http://localhost/api/members-search?q=test', { headers: ipHeaders }) } as any);
    }

    // Presentation 2: Same token presented again -> MUST FAIL (token replay attempt)
    const req2 = new Request('http://localhost/api/members-search?q=test&token=reused-token-xyz', { headers: ipHeaders });
    const res2 = await GET({ request: req2 } as any);
    expect(res2.status).toBe(429);
    const body2 = await res2.json();
    expect(body2.error).toContain('Token captcha déjà utilisé');
  });
});
