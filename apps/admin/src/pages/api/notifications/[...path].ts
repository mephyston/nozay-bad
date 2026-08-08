import type { APIRoute } from 'astro';
import { createAdminApiClient } from '../../../lib/api';

/**
 * Proxy des routes de notifications vers l'API interne.
 *
 * Même modèle que le proxy comptable : l'autorisation appartient à l'API, qui la
 * décide à partir de l'identité transmise et de sa table `ROUTE_PERMISSIONS`.
 */
export const ALL: APIRoute = async ({ request, locals, params }) => {
  try {
    const path = params.path || '';
    const searchParams = new URL(request.url).search;
    const targetUrl = `http://localhost/notifications/${path}${searchParams}`;

    let body: ArrayBuffer | null = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.clone().arrayBuffer();
    }

    const headers = new Headers(request.headers);
    headers.delete('origin');
    headers.delete('host');
    // Ce proxy recopie les en-têtes du navigateur : voir le proxy comptable.
    headers.delete('x-user-email');
    headers.delete('x-user-permissions');
    headers.delete('x-caller');

    return await createAdminApiClient(locals).fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'manual'
    });
  } catch (error) {
    console.error('Notifications proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Proxy failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
