import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createApiClient } from '@nba/api-client';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();

  if (q.length > 0 && q.length < 3) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let apiService: any = undefined;
    try {
      let runtimeEnv: Record<string, string> = {};
      try { runtimeEnv = (locals as any).runtime?.env || {}; } catch (err) {}
      const resolvedEnv = { ...env, ...runtimeEnv } as Record<string, string>;
      if (resolvedEnv?.API_SERVICE) {
        apiService = createApiClient(resolvedEnv as any);
      }
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

    const members = membersData.map((m: any) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      licence: m.licence
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
