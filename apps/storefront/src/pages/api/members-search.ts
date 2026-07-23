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
  let kv: any = undefined;
  try {
    kv = (env as any)?.RATE_LIMIT_KV;
  } catch {}

  if (await rateLimiter.isRateLimited(ip, 30, 60000, kv)) {
    const turnstileToken = request.headers.get('cf-turnstile-response') || url.searchParams.get('token') || '';
    if (turnstileToken) {
      let runtimeEnv: any = undefined;
      try { runtimeEnv = env; } catch {}
      const verifyResult = await verifyTurnstileToken(turnstileToken, ip, { kv, runtimeEnv });
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
    let apiService: any = undefined;
    try {
      apiService = (env as any)?.API_SERVICE;
    } catch {}

    const fetchApi = (path: string) => {
      if (apiService && typeof apiService.fetch === 'function') {
        return apiService.fetch(`http://localhost${path}`);
      }
      const devApiUrl = (typeof process !== 'undefined' && process.env?.API_URL) || 'http://localhost';
      return fetch(`${devApiUrl}${path}`);
    };

    let membersData: any[] = [];

    if (/^\d+$/.test(q)) {
      if (q.length >= 7) {
        const res = await fetchApi(`/members/${encodeURIComponent(q)}`);
        if (res && res.status === 200) {
          const json = await res.json() as any;
          if (json.success && json.data) {
            membersData = [json.data];
          }
        }
      }
    } else {
      const searchParam = q ? `search=${encodeURIComponent(q)}&limit=10` : 'limit=10';
      const res = await fetchApi(`/members?${searchParam}`);
      if (res && res.ok) {
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
