import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createApiClient } from '@nba/api-client';
import { authorizeAccountingProxy } from '../../../lib/authz';

export const ALL: APIRoute = async ({ request, locals, params }) => {
  try {
    // H-01 : autorisation au niveau du proxy (unique surface d'écriture atteignable
    // par le client). Deny-by-default selon la permission requise par méthode + chemin.
    const path = params.path || '';
    const perms = locals.user?.permissions || [];
    if (!authorizeAccountingProxy(request.method, path, perms)) {
      return new Response(JSON.stringify({ success: false, error: 'Accès refusé' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    let apiService: any = undefined;
    try {
      let runtimeEnv: Record<string, string> = {};
      try { runtimeEnv = (locals as any).runtime?.env || {}; } catch (err) {}
      const resolvedEnv = { ...env, ...runtimeEnv } as Record<string, string>;
      if (resolvedEnv?.API_SERVICE) {
        apiService = createApiClient(resolvedEnv as any);
      }
    } catch {}

    const searchParams = new URL(request.url).search;

    // Si c'est l'API_SERVICE on passe par localhost
    const targetUrl = `http://localhost/accounting/${path}${searchParams}`;

    // Le corps est un ReadableStream, on le récupère
    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.clone().arrayBuffer();
      // F-04 : ne journaliser un aperçu de corps (montants, libellés, PII) qu'en dev.
      if (import.meta.env.DEV) {
        console.log(`[PROXY] method=${request.method} target=${targetUrl} body length: ${body.byteLength}`);
        if (body.byteLength > 0) {
          console.log(`[PROXY] body preview: ${new TextDecoder().decode(body.slice(0, 100))}`);
        }
      }
    }

    const requestHeaders = new Headers(request.headers);
    // Supprimer origin / host pour éviter les problèmes de CORS interne
    requestHeaders.delete('origin');
    requestHeaders.delete('host');

    const userPermissions = locals.user?.permissions || [];
    if (userPermissions.length > 0) {
      requestHeaders.set('x-user-permissions', userPermissions.join(','));
    }

    const fetchInit: RequestInit = {
      method: request.method,
      headers: requestHeaders,
      body,
      redirect: 'manual'
    };

    if (apiService && typeof apiService.fetch === 'function') {
      return await apiService.fetch(targetUrl, fetchInit);
    }
    
    const devApiUrl = (typeof process !== 'undefined' && process.env?.API_URL) || 'http://localhost:8787';
    const fallbackUrl = `${devApiUrl}/accounting/${path}${searchParams}`;
    
    return await fetch(fallbackUrl, fetchInit);
  } catch (error) {
    console.error('API proxy error:', error);
    return new Response(JSON.stringify({ error: 'Proxy failed', details: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
