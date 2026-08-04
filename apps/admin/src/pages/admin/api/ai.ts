import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createApiClient } from '@nba/api-client';
import { hasPermission } from '@nba/iam';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Droit unique « Assistant IA » (ai:*) requis.
    const perms = locals.user?.permissions || [];
    if (!hasPermission(perms, 'ai:*')) {
      return new Response(JSON.stringify({ success: false, error: 'Accès refusé' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const apiService = createApiClient(env);

    // Call the internal Hono API (on transmet les permissions pour le contrôle serveur).
    const res = await apiService.fetch('http://localhost/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-permissions': perms.join(',')
      },
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
