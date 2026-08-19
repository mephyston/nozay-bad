import type { APIRoute } from 'astro';
import { createAdminApiClient } from '../../lib/api';
import { can, forbidden } from '../../lib/guard';

export const GET: APIRoute = async ({ request, locals }) => {
  // Ce point d'entrée n'avait aucun contrôle : tout compte authentifié pouvait
  // énumérer les adhérents par nom ou par licence.
  if (!can(locals, 'members:members:read')) return forbidden();

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();

  if (q.length > 0 && q.length < 3) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const apiService = createAdminApiClient(locals);
    const fetchApi = (path: string) => apiService.fetch(`http://localhost${path}`);

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
