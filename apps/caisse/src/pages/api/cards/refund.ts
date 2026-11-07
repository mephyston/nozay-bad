import type { APIRoute } from 'astro';
import { deliver } from '@nba/mailer';
import { loadClubContext } from '@nba/club/context';
import { relay } from '../../../lib/relay';
import { resolveEnv } from '../../../lib/http';
import { refundMail } from '../../../lib/refund-mail';

/**
 * Le remboursement, plus l'information du titulaire. L'argent est déjà rendu quand le courriel
 * part : son échec se journalise et n'annule rien. Un rejeu ne renvoie pas de courriel.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const res = await relay(locals, 'cards/refund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await request.text()
  });
  const text = await res.text();
  if (res.ok) {
    const { data } = JSON.parse(text);
    // Une carte papier n'a pas d'adresse : il n'y a personne à prévenir.
    if (!data.replayed && data.email) {
      try {
        const env = resolveEnv<any>(locals);
        const { settings } = await loadClubContext(env, 'storefront');
        const club = {
          name: settings.name,
          senderName: settings.senderName || settings.name,
          contactEmail: settings.contactEmail || '',
          membershipUrl: '',
          signature: settings.emailSignature || settings.name
        };
        await deliver(env, club, data.email, refundMail(club.name, data.amountCents), (mode) =>
          console.info(`[caisse][${mode}] courriel de remboursement non envoyé`)
        );
      } catch (error) {
        console.error('[caisse] courriel de remboursement en échec', error);
      }
    }
    delete data.email;
    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
};
