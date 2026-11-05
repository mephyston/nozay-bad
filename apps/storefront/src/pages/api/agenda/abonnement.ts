import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { json, resolveEnv } from '../../../lib/request-context';
import { calendarFeedUrl, calendarLinks, generateCalendarToken, hashCalendarToken } from '../../../lib/calendar-feed';

/**
 * L'abonnement du **profil actif** à son agenda.
 *
 * Un flux par profil : un parent s'abonne pour lui, change de profil, s'abonne pour son
 * enfant. La licence vient de la session, jamais de la requête.
 */
function activeLicence(locals: App.Locals): string | null {
  const session = locals.session;
  return session?.members.find((m) => m.id === session.activeMemberId)?.licence ?? null;
}

export const GET: APIRoute = async ({ locals }) => {
  const licence = activeLicence(locals);
  if (!licence) return json({ ok: false, error: 'Non authentifié.' }, 401);

  const res = await createApiClient(resolveEnv(locals)).fetch(
    `http://localhost/members/calendar-feed?licence=${encodeURIComponent(licence)}`
  );
  if (!res.ok) return json({ ok: false, error: 'Abonnement indisponible.' }, 502);
  const body = (await res.json()) as { data: { subscribed: boolean } };
  return json({ ok: true, subscribed: body.data.subscribed });
};

/**
 * Crée l'adresse, ou la remplace : l'ancienne cesse de valoir. C'est la seule fois où elle
 * est visible, seule son empreinte étant gardée.
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const licence = activeLicence(locals);
  if (!licence) return json({ ok: false, error: 'Non authentifié.' }, 401);

  const token = generateCalendarToken();
  const res = await createApiClient(resolveEnv(locals)).fetch('http://localhost/members/calendar-feed', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licence, tokenHash: await hashCalendarToken(token) })
  });
  if (!res.ok) return json({ ok: false, error: "L'adresse n'a pas pu être créée." }, 502);

  return json(
    { ok: true, links: calendarLinks(calendarFeedUrl(request.url, token)) },
    200,
    { 'Cache-Control': 'no-store' }
  );
};

export const DELETE: APIRoute = async ({ locals }) => {
  const licence = activeLicence(locals);
  if (!licence) return json({ ok: false, error: 'Non authentifié.' }, 401);

  const res = await createApiClient(resolveEnv(locals)).fetch(
    `http://localhost/members/calendar-feed?licence=${encodeURIComponent(licence)}`,
    { method: 'DELETE' }
  );
  if (!res.ok) return json({ ok: false, error: "L'abonnement n'a pas pu être coupé." }, 502);
  return json({ ok: true });
};
