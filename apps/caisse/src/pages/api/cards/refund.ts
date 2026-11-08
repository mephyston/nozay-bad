import type { APIRoute } from 'astro';
import { relay } from '../../../lib/relay';

/**
 * Le remboursement du solde d'une carte. Aucun courriel ne part : un tournoi compte 250 à 300
 * clients sur un week-end, et le quota d'envoi est réservé aux codes de connexion. Le
 * remboursement apparaît dans l'historique de la carte, ce qui suffit à en informer le titulaire.
 * L'adresse rendue par l'API ne sort pas vers la caisse.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const res = await relay(locals, 'cards/refund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await request.text()
  });
  const text = await res.text();
  if (!res.ok) return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  const { data } = JSON.parse(text);
  delete data.email;
  return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
