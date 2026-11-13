import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { resolveEnv, json } from '../../lib/request-context';

/**
 * Le payeur signe un reçu d'espèces en scannant le QR code de l'encaisseur (RF-ACC-003).
 *
 * `preview` montre ce qu'il s'apprête à signer, `confirm` le signe. L'adresse et les
 * adhésions du foyer viennent de la session signée, jamais du corps : l'API refuse un reçu
 * qui n'est pas pour ce foyer, et c'est ce qui fait de la confirmation une vraie signature.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const session = (locals as any).session;
  if (!session?.email || !Array.isArray(session.members) || session.members.length === 0) {
    return json({ ok: false, error: 'Non authentifié.' }, 401);
  }

  const body = (await request.json().catch(() => null)) as { action?: string; qr?: string } | null;
  const action = body?.action === 'confirm' ? 'confirm' : body?.action === 'preview' ? 'preview' : null;
  const qr = typeof body?.qr === 'string' ? body.qr.trim().slice(0, 200) : '';
  if (!action || !qr) return json({ ok: false, error: 'Requête invalide.' }, 400);

  const api = createApiClient(resolveEnv(locals));
  const res = await api.fetch(`http://localhost/accounting/cash-receipts/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qr, email: session.email, memberIds: session.members.map((m: { id: number }) => m.id) })
  });
  const data = (await res.json().catch(() => ({}))) as { data?: unknown; error?: string };
  if (!res.ok) return json({ ok: false, error: data.error || 'Ce QR code ne peut pas être signé.' }, res.status);
  return json({ ok: true, data: data.data });
};
