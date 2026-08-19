import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { resolveEnv, json } from '../../../lib/request-context';

export const POST: APIRoute = async ({ request, locals }) => {
  const session = (locals as any).session;
  if (!session?.email) {
    return json({ ok: false, error: 'Non authentifié.' }, 401);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Requête invalide.' }, 400);
  }

  const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
  if (!endpoint) {
    return json({ ok: false, error: 'Abonnement inconnu.' }, 400);
  }

  const api = createApiClient(resolveEnv(locals));
  const res = await api.fetch('http://localhost/notifications/subscriptions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: session.email, endpoint })
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as any;
    return json({ ok: false, error: err.error || 'Le désabonnement a échoué.' }, res.status);
  }

  return json({ ok: true });
};
