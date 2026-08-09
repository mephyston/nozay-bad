import { type Db } from '@nba/db';
import { ListEventsRepository } from './repository';
import type { ListEventsInput, ListEventsOutput } from './dto';

const DEFAULT_LIMIT = 50;

/**
 * Événements, à venir par défaut.
 *
 * La comparaison se fait sur la chaîne locale, au même format que celui stocké : un
 * événement du jour reste visible jusqu'à minuit, ce qui est le comportement attendu
 * d'un agenda — une compétition ne disparaît pas de l'affiche à son heure de début.
 */
export async function listEvents(
  db: Db,
  filters: ListEventsInput = {},
  now: Date = new Date()
): Promise<ListEventsOutput> {
  const rows = await new ListEventsRepository().list(db);
  const today = now.toISOString().slice(0, 10);

  return rows
    .filter((event) => (filters.includeUnpublished ? true : event.status === 'published'))
    .filter((event) => (filters.includePast ? true : event.startsAt.slice(0, 10) >= today))
    .slice(0, filters.limit ?? DEFAULT_LIMIT);
}
