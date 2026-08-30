import { createAdminApiClient } from '../../../lib/api';
import { can, impersonationEnabled } from '../../../lib/guard';

export async function GET({ locals }: any) {
  // Sert la liste des comptes usurpables dans le menu : c'est bien le droit
  // d'usurpation qui la gouverne, pas la simple gestion des accès.
  // Hors préproduction, la liste n'a plus d'objet : la section « Se connecter en tant
  // que » disparaît alors du menu d'elle-même, sans code d'affichage conditionnel.
  if (!impersonationEnabled() || !can(locals, 'iam:sessions:impersonate')) {
    return new Response(JSON.stringify([]), { status: 403 });
  }

  const apiService = createAdminApiClient(locals);
  const res = await apiService.fetch('http://localhost/iam/users');
  return new Response(await res.text(), {
    headers: { 'Content-Type': 'application/json' }
  });
}
