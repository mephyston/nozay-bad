import type { APIRoute } from 'astro';
import { createAdminApiClient } from '../../../lib/api';

/**
 * Proxy comptable vers l'API interne.
 *
 * L'autorisation n'est plus décidée ici : l'API applique sa propre table
 * `ROUTE_PERMISSIONS` à partir de l'identité transmise par `createAdminApiClient`.
 * Un second jeu de règles côté admin ne pourrait que diverger du premier — et c'est
 * bien ce qui était arrivé, ce proxy prétendant être « l'unique surface d'écriture
 * atteignable par le client » alors qu'une dizaine de pages écrivaient sans garde.
 */
export const ALL: APIRoute = async ({ request, locals, params }) => {
  try {
    const path = params.path || '';
    const searchParams = new URL(request.url).search;
    const targetUrl = `http://localhost/accounting/${path}${searchParams}`;

    let body: ArrayBuffer | null = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.clone().arrayBuffer();
      // F-04 : ne journaliser un aperçu de corps (montants, libellés, données
      // personnelles) qu'en développement.
      if (import.meta.env.DEV) {
        console.log(`[PROXY] method=${request.method} target=${targetUrl} body length: ${body.byteLength}`);
      }
    }

    const requestHeaders = new Headers(request.headers);
    // Supprimer origin / host pour éviter les problèmes de CORS interne.
    requestHeaders.delete('origin');
    requestHeaders.delete('host');
    // Ce proxy recopie les en-têtes du navigateur : sans ce nettoyage, un client
    // pourrait injecter sa propre identité et se faire passer pour un autre compte.
    // `createAdminApiClient` les repose ensuite à partir de la session vérifiée.
    requestHeaders.delete('x-user-email');
    requestHeaders.delete('x-user-permissions');
    requestHeaders.delete('x-caller');

    return await createAdminApiClient(locals).fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      body,
      redirect: 'manual'
    });
  } catch (error) {
    console.error('API proxy error:', error);
    return new Response(JSON.stringify({ error: 'Proxy failed', details: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
