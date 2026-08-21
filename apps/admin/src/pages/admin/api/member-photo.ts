import { createAdminApiClient } from '../../../lib/api';
import { can } from '../../../lib/guard';

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/** Licence de la requête, normalisée comme partout ailleurs : 8 chiffres. */
function licenceOf(url: URL): string {
  return String(url.searchParams.get('licence') ?? '').replace(/\D/g, '');
}

const relay = (res: Response, contentType = 'application/json') =>
  new Response(res.body, { status: res.status, headers: { 'Content-Type': contentType } });

/**
 * GET /admin/api/member-photo?licence=…&size=…&v=… → les octets du portrait.
 *
 * Passe par l'origine de l'administration et non par celle du site public : le bucket
 * ne sert les portraits par aucune route publique, et la CSP de l'admin n'autorise les
 * images que depuis `'self'` et le domaine du site.
 */
export async function GET({ request, locals }: any) {
  if (!can(locals, 'members:members:read')) {
    return json({ success: false, error: 'Accès refusé' }, 403);
  }

  const url = new URL(request.url);
  const licence = licenceOf(url);
  if (!licence) return json({ success: false, error: 'Licence manquante' }, 400);

  try {
    const res = await createAdminApiClient(locals).fetch(
      `http://localhost/members/${encodeURIComponent(licence)}/photo?size=${encodeURIComponent(url.searchParams.get('size') ?? '512')}`
    );
    if (!res.ok) return json({ success: false, error: 'Aucune photo' }, res.status);

    // Les en-têtes de l'API font foi : type réel de l'objet R2 et cache privé.
    return new Response(res.body, { status: 200, headers: res.headers });
  } catch (e: any) {
    return json({ success: false, error: `Appel API échoué : ${e?.message ?? String(e)}` }, 502);
  }
}

/**
 * POST /admin/api/member-photo?licence=…  (multipart)
 *
 * `action=photo` dépose le fichier joint, `action=delete-photo` retire le portrait.
 * Deux actions sur un même verbe parce qu'une page `.astro` ne reçoit que GET et POST,
 * et que `MemberPhotoField` parle le même dialecte des deux côtés — administration ici,
 * page de fiche dans l'espace adhérent.
 */
export async function POST({ request, locals }: any) {
  if (!can(locals, 'members:members:write')) {
    return json({ success: false, error: 'Accès refusé' }, 403);
  }

  const licence = licenceOf(new URL(request.url));
  if (!licence) return json({ success: false, error: 'Licence manquante' }, 400);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ success: false, error: 'Requête invalide' }, 400);
  }

  const apiService = createAdminApiClient(locals);
  const path = `http://localhost/members/${encodeURIComponent(licence)}/photo`;

  try {
    if (form.get('action') === 'delete-photo') {
      return relay(await apiService.fetch(path, { method: 'DELETE' }));
    }

    const file = form.get('file');
    if (!(file instanceof File)) return json({ success: false, error: 'Aucun fichier reçu' }, 400);

    const forwarded = new FormData();
    forwarded.set('file', file, file.name);
    // Pas d'en-tête `Content-Type` posée à la main : `fetch` compose la frontière du
    // multipart lui-même, et l'écrire ici la ferait diverger du corps envoyé.
    return relay(await apiService.fetch(path, { method: 'POST', body: forwarded }));
  } catch (e: any) {
    return json({ success: false, error: `Appel API échoué : ${e?.message ?? String(e)}` }, 502);
  }
}
