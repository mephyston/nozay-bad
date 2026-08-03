import { env as cfEnv } from 'cloudflare:workers';
import { createApiClient } from '@nba/api-client';
import { hasPermission } from '@nba/iam';

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

// POST /admin/api/members  { id, authorized } → bascule l'autorisation de note de frais.
export async function POST({ request, locals }: any) {
  const user = locals.user;
  if (
    !user ||
    (!hasPermission(user.permissions, '*') &&
      !hasPermission(user.permissions, 'members:*') &&
      !hasPermission(user.permissions, 'members:write'))
  ) {
    return json({ success: false, error: 'Accès refusé' }, 403);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Requête invalide' }, 400);
  }

  const id = Number(body?.id);
  const authorized = body?.authorized;
  if (!Number.isInteger(id) || typeof authorized !== 'boolean') {
    return json({ success: false, error: 'Paramètres invalides (id, authorized)' }, 400);
  }

  // Résout l'env comme le middleware admin (cfEnv peut être partiel selon le contexte).
  let runtimeEnv: any = {};
  try {
    runtimeEnv = (locals as any).runtime?.env || {};
  } catch {}
  const resolvedEnv = { ...(cfEnv as any), ...runtimeEnv };

  try {
    const apiService = createApiClient(resolvedEnv);
    const res = await apiService.fetch(`http://localhost/members/${id}/expense-authorization`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorized })
    });
    return new Response(await res.text(), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return json({ success: false, error: `Appel API échoué : ${e?.message ?? String(e)}` }, 502);
  }
}
