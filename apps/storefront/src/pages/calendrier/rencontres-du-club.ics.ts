import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { resolveEnv } from '../../lib/request-context';

/**
 * Toutes les rencontres du club, lues par les serveurs de Google, d'Apple ou de Microsoft.
 *
 * Une adresse unique, sans jeton : le flux ne porte que ce que tout adhérent voit déjà dans le
 * calendrier — quand, où, contre qui. Route statique, elle passe avant `[token].ics.ts`.
 *
 * Une panne répond une erreur et jamais un agenda vide : l'application garde ce qu'elle a.
 */
export const GET: APIRoute = async ({ locals }) => {
  const res = await createApiClient(resolveEnv(locals)).fetch('http://localhost/calendar-feed/club-fixtures');
  if (!res.ok) return new Response('Agenda momentanément indisponible.', { status: 503, headers: { 'Retry-After': '3600' } });

  return new Response(await res.text(), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="rencontres-du-club.ics"',
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'noindex'
    }
  });
};
