import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createApiClient } from '@nba/api-client';
import { authorizeNotificationsProxy } from '../../../lib/authz';

/**
 * Proxy des routes de notifications vers l'API interne.
 *
 * Même modèle que le proxy comptable : l'autorisation est appliquée ici, seule
 * surface atteignable par le navigateur (H-01).
 */
export const ALL: APIRoute = async ({ request, locals, params }) => {
  try {
    const path = params.path || '';
    const perms = locals.user?.permissions || [];
    if (!authorizeNotificationsProxy(request.method, path, perms)) {
      return new Response(JSON.stringify({ success: false, error: 'Accès refusé' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let runtimeEnv: Record<string, string> = {};
    try {
      runtimeEnv = (locals as any).runtime?.env || {};
    } catch {
      /* Astro.locals.runtime.env peut throw en prod : on ignore. */
    }
    const resolvedEnv = { ...env, ...runtimeEnv } as Record<string, string>;
    const api = createApiClient(resolvedEnv as any);

    const searchParams = new URL(request.url).search;
    const targetUrl = `http://localhost/notifications/${path}${searchParams}`;

    let body: ArrayBuffer | null = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.clone().arrayBuffer();
    }

    const headers = new Headers(request.headers);
    headers.delete('origin');
    headers.delete('host');

    return await api.fetch(targetUrl, {
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
