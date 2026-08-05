import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { resolveEnv, json } from '../../../lib/request-context';

/**
 * Enregistre l'abonnement push de l'appareil courant.
 *
 * L'email est repris de la session signée, jamais du corps de la requête : le
 * client ne choisit pas le compte auquel rattacher ses notifications.
 */
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
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!endpoint || typeof p256dh !== 'string' || typeof auth !== 'string') {
    return json({ ok: false, error: 'Abonnement push incomplet.' }, 400);
  }

  const api = createApiClient(resolveEnv(locals));
  const res = await api.fetch('http://localhost/notifications/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: session.email,
      endpoint,
      keys: { p256dh, auth },
      // Sert à reconnaître l'appareil dans la liste des abonnements.
      userAgent: (request.headers.get('user-agent') || '').slice(0, 255)
    })
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as any;
    return json({ ok: false, error: err.error || "L'abonnement n'a pas pu être enregistré." }, res.status);
  }

  return json({ ok: true });
};
