import { createApiClient } from '@nba/api-client';
import { json, resolveEnv } from './http';

export async function walletOf(locals: App.Locals): Promise<any | null> {
  const res = await forCard(locals, 'wallet');
  if (!res.ok) return null;
  return ((await res.json()) as any).data;
}

/** Appel de l'API pour la carte de cet appareil. L'identifiant vient du cookie signé, jamais du client. */
export async function forCard(locals: App.Locals, action: string): Promise<Response> {
  if (!locals.card) return json({ ok: false, error: 'Non connecté.' }, 401);
  const api = createApiClient(resolveEnv<any>(locals), { caller: 'buvette' });
  const res = await api.fetch(`http://localhost/buvette/cards/${locals.card.cardId}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: locals.card.deviceId })
  });
  const payload = (await res.json().catch(() => null)) as any;
  if (!res.ok) return json({ ok: false, error: payload?.error || 'Le serveur ne répond pas.' }, res.status);
  return json({ ok: true, data: payload.data });
}
