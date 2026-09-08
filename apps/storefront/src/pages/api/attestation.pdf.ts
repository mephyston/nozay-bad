import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { resolveEnv, json } from '../../lib/request-context';

// Sert l'attestation CSE d'un profil DE LA SESSION. `?memberId=` permet à un parent de
// récupérer celle de ses enfants sans changer de profil, mais l'id n'est jamais repris tel
// quel : il doit figurer dans `session.members`, sinon on retombe sur le profil actif.
// Sans paramètre, c'est le profil actif. L'API re-valide le paiement
// (MemberNothingPaidError) : double garde.
export const GET: APIRoute = async ({ locals, url }) => {
  const session = (locals as any).session;
  if (!session?.activeMemberId) {
    return json({ ok: false, error: 'Non authentifié.' }, 401);
  }

  const requested = Number(url.searchParams.get('memberId'));
  const owned = (session.members ?? []).some((m: any) => m.id === requested);
  const memberId = owned ? requested : session.activeMemberId;

  const env = resolveEnv(locals);
  const api = createApiClient(env);
  const res = await api.fetch(`http://localhost/members/${memberId}/cse-attestation.pdf`);

  if (res.ok) {
    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': res.headers.get('Content-Disposition') ?? 'inline',
        'Cache-Control': 'no-store'
      }
    });
  }

  const err = (await res.json().catch(() => ({ error: 'Attestation indisponible.' }))) as any;
  return json({ ok: false, error: err.error || 'Attestation indisponible.' }, res.status);
};
