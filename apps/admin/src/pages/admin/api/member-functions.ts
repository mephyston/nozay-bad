import { createAdminApiClient } from '../../../lib/api';
import { can } from '../../../lib/guard';

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

// GET /admin/api/member-functions → statut des fonctions de la saison en cours.
// Consommé par la barre latérale pour afficher « action à réaliser » sur Dirigeants.
export async function GET({ locals }: any) {
  if (!can(locals, 'members:members:read')) {
    return json({ success: false, error: 'Accès refusé' }, 403);
  }
  try {
    const apiService = createAdminApiClient(locals);
    const res = await apiService.fetch('http://localhost/members/club-functions/status');
    return new Response(await res.text(), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return json({ success: false, error: `Appel API échoué : ${e?.message ?? String(e)}` }, 502);
  }
}

// PUT /admin/api/member-functions  { licence, season, functions } → remplace les
// fonctions au club de l'adhérent. Même pattern que /admin/api/members : la garde
// de permission ici, la règle métier (unicité président…) côté API.
export async function PUT({ request, locals }: any) {
  if (!can(locals, 'members:members:write')) {
    return json({ success: false, error: 'Accès refusé' }, 403);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Requête invalide' }, 400);
  }

  const licence = typeof body?.licence === 'string' ? body.licence.trim() : '';
  const season = typeof body?.season === 'string' ? body.season : '';
  const functions = Array.isArray(body?.functions) ? body.functions : null;
  if (!licence || !season || !functions) {
    return json({ success: false, error: 'Paramètres invalides (licence, season, functions)' }, 400);
  }

  try {
    const apiService = createAdminApiClient(locals);
    const res = await apiService.fetch(
      `http://localhost/members/${encodeURIComponent(licence)}/club-functions`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season, functions })
      }
    );
    return new Response(await res.text(), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return json({ success: false, error: `Appel API échoué : ${e?.message ?? String(e)}` }, 502);
  }
}
