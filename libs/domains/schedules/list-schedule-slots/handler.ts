import { type Db } from '@nba/db';
import { ListScheduleSlotsRepository } from './repository';
import type { ListScheduleSlotsInput, ListScheduleSlotsOutput } from './dto';

/**
 * Créneaux, joints à leur gymnase.
 *
 * Le filtrage se fait en mémoire : le club en compte une vingtaine, et une requête
 * dynamique multi-critères coûterait plus en complexité qu'elle ne rapporte.
 */
export async function listScheduleSlots(
  db: Db,
  filters: ListScheduleSlotsInput = {}
): Promise<ListScheduleSlotsOutput> {
  const repo = new ListScheduleSlotsRepository();
  const [slots, venues] = await Promise.all([repo.list(db), repo.venues(db)]);
  const byId = new Map(venues.map((venue) => [venue.id, venue]));

  return slots
    .filter((slot) => (filters.includeInactive ? true : slot.active))
    .filter((slot) => (filters.venueId ? slot.venueId === filters.venueId : true))
    .filter((slot) =>
      filters.audiences && filters.audiences.length > 0 ? filters.audiences.includes(slot.audience) : true
    )
    .map((slot) => ({ ...slot, venue: byId.get(slot.venueId) ?? null }));
}
