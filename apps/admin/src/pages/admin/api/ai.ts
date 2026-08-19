import type { APIRoute } from 'astro';
import { createAdminApiClient } from '../../../lib/api';
import { can } from '../../../lib/guard';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    if (!can(locals, 'ai:assistant:use')) {
      return new Response(JSON.stringify({ success: false, error: 'Accès refusé' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const apiService = createAdminApiClient(locals);

    // L'API revérifie « ai:assistant:use » à partir de l'identité transmise par le
    // client : aucune permission ne circule ici.
    const res = await apiService.fetch('http://localhost/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('API Error in /admin/api/ai:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
