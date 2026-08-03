import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { resolveEnv, json } from '../../lib/request-context';

// Sert l'attestation CSE du PROFIL ACTIF uniquement (id pris dans la session, jamais dans l'URL).
// L'API re-valide le paiement (MemberNotFullyPaidError) : double garde.
export const GET: APIRoute = async ({ locals }) => {
  const session = (locals as any).session;
  if (!session?.activeMemberId) {
    return json({ ok: false, error: 'Non authentifié.' }, 401);
  }

  const env = resolveEnv(locals);
  const api = createApiClient(env);
  const res = await api.fetch(`http://localhost/members/${session.activeMemberId}/cse-attestation.pdf`);

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
