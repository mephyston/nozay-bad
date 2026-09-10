import { type Db } from '@nba/db';
import { isIndivEligibleGroup, sessionEndTime, slotWindows } from '../../shared/indiv';
import { ListIndivSessionsRepository } from './repository';
import type { IndivSessionListItem, ListIndivSessionsInput, ListIndivSessionsOutput } from './dto';

/** Date locale d'aujourd'hui. */
function localDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Les soirées d'indiv, avec de quoi décider quoi afficher.
 *
 * Quatre requêtes fixes quel que soit le nombre de soirées : les lignes, les gymnases,
 * les compteurs, les retenus des soirées annoncées — plus la mienne si l'on lit au nom
 * de quelqu'un. Les candidats non retenus ne sortent jamais d'ici : l'espace adhérent
 * reçoit un compte, l'annonce, et sa propre situation.
 */
export async function listIndivSessions(
  db: Db,
  input: ListIndivSessionsInput = {},
  now: Date = new Date()
): Promise<ListIndivSessionsOutput> {
  const repo = new ListIndivSessionsRepository();

  const from = input.from ?? localDate(now);
  const to = input.to;

  const [sessions, venues, tallies, announced] = await Promise.all([
    repo.list(db, { from, to }),
    repo.venues(db),
    repo.tallies(db),
    repo.selectedNamesBetween(db, from, to)
  ]);

  const mine = input.memberId ? await repo.requestsOf(db, input.memberId) : new Map();
  const venueById = new Map(venues.map((venue) => [venue.id, venue]));

  const items: IndivSessionListItem[] = sessions
    .filter((session) => (input.includeCancelled === false ? session.status !== 'cancelled' : true))
    .map((session) => {
      const tally = tallies.get(session.id) ?? { requests: 0, selected: 0 };
      return {
        ...session,
        venue: venueById.get(session.venueId) ?? null,
        endTime: sessionEndTime(session),
        slots: slotWindows(session),
        requestCount: tally.requests,
        selectedCount: tally.selected,
        myRequest: mine.get(session.id) ?? null,
        selectedNames: session.status === 'announced' ? (announced.get(session.id) ?? {}) : {}
      };
    })
    .slice(0, input.limit ?? 300);

  return { sessions: items, eligible: isIndivEligibleGroup(input.group) };
}
