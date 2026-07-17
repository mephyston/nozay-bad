import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';

  if (!q.trim()) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const apiService = env.API_SERVICE;
    const res = await apiService.fetch(`http://localhost/members?search=${encodeURIComponent(q)}&limit=10`);
    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }
    const json = (await res.json()) as any;
    const membersData = json.data || [];
    const members = membersData.map((m: any) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      licence: m.licence
    }));

    return new Response(JSON.stringify(members), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return new Response(JSON.stringify({ error: 'Failed to search members' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
