import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { resolveEnv } from '../../lib/request-context';
import { hashCalendarToken, isCalendarToken } from '../../lib/calendar-feed';

const notFound = () => new Response('Agenda introuvable.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

/**
 * Le flux d'un abonnement, lu par les serveurs de Google, d'Apple ou de Microsoft.
 *
 * Public au sens du middleware : un agenda ne sait pas ouvrir de session, l'adresse secrète
 * est son seul identifiant. Le jeton s'arrête ici, l'API n'en reçoit que l'empreinte, et son
 * cache porte l'économie : voir `apps/api/src/shared-read-cache.ts`.
 *
 * Une panne répond une erreur et jamais un agenda vide : l'application de l'adhérent garde
 * alors ce qu'elle a déjà, au lieu d'effacer ses rendez-vous.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  if (!isCalendarToken(params.token)) return notFound();

  const api = createApiClient(resolveEnv(locals));
  const res = await api.fetch(`http://localhost/calendar-feed/${await hashCalendarToken(params.token)}`);
  if (res.status === 404) return notFound();
  if (!res.ok) return new Response('Agenda momentanément indisponible.', { status: 503, headers: { 'Retry-After': '3600' } });

  return new Response(await res.text(), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="agenda.ics"',
      'Cache-Control': 'private, max-age=3600',
      'X-Robots-Tag': 'noindex'
    }
  });
};
