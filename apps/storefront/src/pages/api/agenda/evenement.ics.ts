import type { APIRoute } from 'astro';
import { createApiClient } from '@nba/api-client';
import { resolveEnv } from '../../../lib/request-context';

const text = (message: string, status: number) =>
  new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

/**
 * Ajouter un seul rendez-vous : le fichier `.ics`, ou `?cible=google` pour le formulaire
 * prérempli de Google Agenda.
 *
 * Le rendez-vous se relit à chaque appui plutôt que de voyager dans le lien : une adresse
 * du club ne peut ainsi servir de fichier d'agenda qu'à ce que le club a réellement publié.
 * C'est une copie, qui ne suivra pas les changements : l'abonnement est là pour ça.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  const session = locals.session;
  const licence = session?.members.find((m) => m.id === session.activeMemberId)?.licence;
  if (!licence) return text('Non authentifié.', 401);

  const query = new URLSearchParams({
    licence,
    kind: url.searchParams.get('kind') ?? '',
    ref: url.searchParams.get('ref') ?? ''
  });
  const res = await createApiClient(resolveEnv(locals)).fetch(`http://localhost/calendar-feed/item?${query}`);
  if (res.status === 400 || res.status === 404) return text("Ce rendez-vous n'est plus à l'agenda.", 404);
  if (!res.ok) return text("L'agenda est momentanément indisponible.", 502);

  const { data } = (await res.json()) as { data: { ics: string; googleUrl: string } };
  if (url.searchParams.get('cible') === 'google') {
    return new Response(null, { status: 302, headers: { Location: data.googleUrl, 'Cache-Control': 'no-store' } });
  }
  return new Response(data.ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rendez-vous.ics"',
      'Cache-Control': 'no-store'
    }
  });
};
