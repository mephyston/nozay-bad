import type { APIRoute } from 'astro';
import { createAdminApiClient } from '../../../../lib/api';
import { can, forbidden } from '../../../../lib/guard';

/**
 * Relais d'édition des droits d'un rôle.
 *
 * La garde est doublée par l'API, qui exige `iam:roles:write` sur cette route et
 * refuse `super_admin` : ce contrôle-ci sert le confort (refus immédiat et en
 * français), pas la sécurité.
 */
export const PUT: APIRoute = async ({ request, locals, params }) => {
  if (!can(locals, 'iam:roles:write')) return forbidden();

  const res = await createAdminApiClient(locals).fetch(
    `http://localhost/iam/roles/${encodeURIComponent(params.role || '')}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: await request.text()
    }
  );

  return new Response(await res.text(), {
    status: res.status,
    headers: { 'Content-Type': 'application/json' }
  });
};
