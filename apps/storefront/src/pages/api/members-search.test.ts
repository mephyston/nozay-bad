import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { env } from 'cloudflare:workers';
import { GET } from './members-search';

describe('members-search API endpoint', () => {
  let mockFetch: any;

  beforeEach(() => {
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

  it('rate limits after 30 requests and allows bypass via Turnstile token verification', async () => {
    // 1. Simulate 30 successful requests from same IP
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

    // 2. The 31st request should be rate-limited (429)
    const blockedRequest = new Request('http://localhost/api/members-search?q=pierre', { headers: ipHeaders });
    const blockedRes = await GET({ request: blockedRequest } as any);
    expect(blockedRes.status).toBe(429);
    const blockedJson = await blockedRes.json();
    expect(blockedJson.error).toContain('Rate limit exceeded');

    // 3. Stub global fetch to mock the Turnstile verification worker success response
    const mockGlobalFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true })
    });
    vi.stubGlobal('fetch', mockGlobalFetch);

    // 4. Request with a Turnstile token should bypass the rate limit
    const bypassRequest = new Request('http://localhost/api/members-search?q=pierre&token=valid-token', {
      headers: ipHeaders
    });
    const bypassRes = await GET({ request: bypassRequest } as any);
    expect(bypassRes.status).toBe(200);
    expect(mockGlobalFetch).toHaveBeenCalledWith(
      'https://turnstile-siteverify-nba.mephyston.workers.dev',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'valid-token' })
      })
    );
  });
});
