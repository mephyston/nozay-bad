import { createAdminApiClient } from '../../../../lib/api';
import { can } from '../../../../lib/guard';

/**
 * Les données de l'écran des menus, servies au navigateur.
 *
 * **Preuve de concept** — voir `/admin/website/menus-poc`. Dans l'architecture qu'on
 * évalue, la page ne rend plus rien côté serveur : elle envoie une coquille, et l'îlot
 * vient chercher ses données ici. Le worker garde donc son rôle de relais — c'est lui
 * qui détient `INTERNAL_API_KEY` et affirme l'identité — mais il ne calcule plus de HTML.
 *
 * Le contrôle de droit est refait ici : les routes sous `/admin/api/` échappent à
 * `PAGE_PERMISSIONS` (cf. `isPageRoute`), chacune répond donc d'elle-même.
 */
export async function GET({ locals }: any) {
  if (!can(locals, 'cms:pages:read')) {
    return new Response(JSON.stringify({ success: false, error: 'Accès refusé' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiService = createAdminApiClient(locals);

  try {
    const [header, footer, legal, pages] = await Promise.all([
      apiService.fetch('http://localhost/cms/nav?location=header'),
      apiService.fetch('http://localhost/cms/nav?location=footer'),
      apiService.fetch('http://localhost/cms/nav?location=legal'),
      apiService.fetch('http://localhost/cms/pages')
    ]);

    const donnees = async (res: Response) => (res.ok ? ((await res.json()) as any).data ?? [] : []);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          header: await donnees(header),
          footer: await donnees(footer),
          legal: await donnees(legal),
          pages: await donnees(pages),
          canWrite: can(locals, 'cms:pages:write')
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: `Appel API échoué : ${e?.message ?? String(e)}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
