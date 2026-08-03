import { env } from 'cloudflare:workers';
import { createApiClient } from '@nba/api-client';
import { hasPermission } from '@nba/iam';

// POST /admin/api/members  { id, authorized } → bascule l'autorisation de note de frais.
export async function POST({ request, locals }: any) {
  const user = locals.user;
  if (
    !user ||
    (!hasPermission(user.permissions, '*') &&
      !hasPermission(user.permissions, 'members:*') &&
      !hasPermission(user.permissions, 'members:write'))
  ) {
    return new Response(JSON.stringify({ success: false, error: 'Accès refusé' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Requête invalide' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const id = Number(body?.id);
  const authorized = body?.authorized;
  if (!Number.isInteger(id) || typeof authorized !== 'boolean') {
    return new Response(JSON.stringify({ success: false, error: 'Paramètres invalides (id, authorized)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiService = createApiClient(env);
  const res = await apiService.fetch(`http://localhost/members/${id}/expense-authorization`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorized })
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' }
  });
}
