import { createApiClient } from '@nba/api-client';

export interface AgendaEvent {
  id: number;
  slug: string;
  title: string;
  /** Date-heure locale ISO sans fuseau : « 2026-11-14T09:00 ». */
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  category: 'competition' | 'interclubs' | 'tournoi' | 'stage' | 'vie_du_club' | 'assemblee';
  venueLabel: string | null;
  externalUrl: string | null;
  /** État des inscriptions. `none` : l'événement n'en propose pas. */
  registration: 'none' | 'open' | 'closed';
  registrationCount: number;
  /** Couverts à prévoir : les inscrits et leurs accompagnants. */
  attendeeCount: number;
  /**
   * Accompagnants annoncés par l'adhérent au nom duquel on lit, ou `null` s'il n'est
   * pas inscrit — ce qui n'est pas la même chose que zéro, et décide du libellé du
   * bouton. Toujours `null` quand la lecture est faite sans adhérent.
   */
  myGuests: number | null;
}

/**
 * Les prochains rendez-vous de l'agenda du club.
 *
 * L'API ne rend que les événements publiés et à venir tant que l'appelant n'est pas
 * l'administration : le tri et le filtrage n'ont donc pas à être refaits ici.
 *
 * Comme pour les actualités, une API muette dégrade l'encart mais n'empêche pas
 * l'accueil de s'ouvrir — il porte aussi la cotisation et les raccourcis.
 */
export async function fetchUpcomingEvents(
  env: unknown,
  limit: number,
  memberId?: number
): Promise<AgendaEvent[]> {
  try {
    const api = createApiClient(env as never);
    // `memberId` vient de la session, jamais du navigateur : c'est ce qui fait que
    // l'API peut répondre « voici où *tu* en es » sans qu'on puisse le demander pour
    // quelqu'un d'autre.
    const query = memberId ? `&memberId=${memberId}` : '';
    const res = await api.fetch(`http://localhost/events?limit=${limit}${query}`);
    if (!res.ok) return [];

    const json = (await res.json()) as { data?: AgendaEvent[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}
