import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { rateLimiter, verifyTurnstileToken } from '../../lib/turnstile';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();

  // 1. Min length requirement
  if (q.length < 3) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. IP-based rate limiting with KV / Shared Store persistence
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-real-ip') || '127.0.0.1';
  const kv = (env as any)?.RATE_LIMIT_KV;

  if (await rateLimiter.isRateLimited(ip, 30, 60000, kv)) {
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
    const apiService = (env as any).API_SERVICE;
    let membersData: any[] = [];

    // 3. Exact licence match if query is numeric
    if (/^\d+$/.test(q)) {
      if (q.length >= 7) {
        // Fetch exact member by licence
        const res = await apiService.fetch(`http://localhost/members/${encodeURIComponent(q)}`);
        if (res.status === 200) {
          const json = await res.json() as any;
          if (json.success && json.data) {
            membersData = [json.data];
          }
        }
      } else {
        // Shorter numeric queries are ignored for licence matching
        membersData = [];
      }
    } else {
      // Name-based autocomplete search
      const res = await apiService.fetch(`http://localhost/members?search=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const json = await res.json() as any;
        membersData = json.data || [];
      }
    }

    // 4. Return masked fields to preserve privacy
    const members = membersData.map((m: any) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName ? `${m.lastName[0]}.` : '',
      licence: m.licence ? `${m.licence.slice(0, 2)}***${m.licence.slice(-2)}` : '***'
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
