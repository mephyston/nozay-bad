import { createAdminApiClient } from '../../../lib/api';
import { can } from '../../../lib/guard';

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

// POST /admin/api/members  { id, authorized } → bascule l'autorisation de note de frais.
export async function POST({ request, locals }: any) {
  if (!can(locals, 'members:members:write')) {
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

  try {
    const apiService = createAdminApiClient(locals);
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
