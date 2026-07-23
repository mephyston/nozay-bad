import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { rateLimiter, verifyTurnstileToken } from '../../lib/turnstile';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();

  // Require minimum 3 characters when a search query is provided
  if (q.length > 0 && q.length < 3) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // IP-based rate limiting with KV / Shared Store persistence
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-real-ip') || '127.0.0.1';
  const kv = (env as any)?.RATE_LIMIT_KV;

  if (await rateLimiter.isRateLimited(ip, 60, 60000, kv)) {
    const turnstileToken = request.headers.get('cf-turnstile-response') || url.searchParams.get('token') || '';
    if (turnstileToken) {
      const verifyResult = await verifyTurnstileToken(turnstileToken, ip, { kv, runtimeEnv: env });
      if (!verifyResult.success) {
        return new Response(JSON.stringify({ error: `Rate limit exceeded. ${verifyResult.error || 'Captcha verification failed.'}` }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Captcha required.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  try {
    const apiService = (env as any)?.API_SERVICE;
    const fetchApi = (path: string, opts?: any) => {
      if (apiService && typeof apiService.fetch === 'function') {
        return apiService.fetch(`http://localhost${path}`, opts);
      }
      // Fallback for standalone local dev when API worker runs on port 8787
      const devApiUrl = (typeof process !== 'undefined' && process.env?.API_URL) || 'http://127.0.0.1:8787';
      return fetch(`${devApiUrl}${path}`, opts);
    };

    let membersData: any[] = [];

    if (/^\d+$/.test(q) && q.length >= 7) {
      const res = await fetchApi(`/members/${encodeURIComponent(q)}`);
      if (res.status === 200) {
        const json = await res.json() as any;
        if (json.success && json.data) {
          membersData = [json.data];
        }
      }
    } else {
      const searchParam = q ? `search=${encodeURIComponent(q)}&limit=30` : 'limit=30';
      const res = await fetchApi(`/members?${searchParam}`);
      if (res.ok) {
        const json = await res.json() as any;
        membersData = json.data || [];
      }
    }

    // Return masked fields to preserve privacy
    const members = membersData.map((m: any) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName ? (m.lastName.length > 2 && !m.lastName.endsWith('.') ? `${m.lastName[0]}.` : m.lastName) : '',
      licence: m.licence ? (m.licence.includes('*') ? m.licence : `${m.licence.slice(0, 2)}***${m.licence.slice(-2)}`) : '***'
    }));

    return new Response(JSON.stringify(members), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return new Response(JSON.stringify({ error: 'Failed to search members' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
