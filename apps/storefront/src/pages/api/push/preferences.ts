import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { resolveEnv, json } from '../../../lib/request-context';

/**
 * Réglages des catégories de notifications du compte connecté.
 *
 * L'email vient de la session signée, jamais du corps de la requête : un adhérent
 * ne règle que ses propres notifications.
 */
export const GET: APIRoute = async ({ locals }) => {
  const session = (locals as any).session;
  if (!session?.email) {
    return json({ ok: false, error: 'Non authentifié.' }, 401);
  }

  const api = createApiClient(resolveEnv(locals));
  const res = await api.fetch(
    `http://localhost/notifications/preferences?email=${encodeURIComponent(session.email)}`
  );

  if (!res.ok) {
    return json({ ok: false, error: 'Réglages indisponibles.' }, res.status);
  }
  const body = (await res.json()) as any;
  return json({ ok: true, preferences: body.data });
};

export const PUT: APIRoute = async ({ request, locals }) => {
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

  const disabled = Array.isArray(body?.disabled)
    ? body.disabled.filter((value: unknown) => typeof value === 'string')
    : [];

  const api = createApiClient(resolveEnv(locals));
  const res = await api.fetch('http://localhost/notifications/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: session.email, disabled })
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as any;
    return json({ ok: false, error: err.error || "Les réglages n'ont pas pu être enregistrés." }, res.status);
  }
  const updated = (await res.json()) as any;
  return json({ ok: true, preferences: updated.data });
};
