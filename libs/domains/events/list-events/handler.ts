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
 *
 * Chaque événement porte aussi ses compteurs d'inscription. Ils sont lus en une
 * requête agrégée, et sur la liste complète plutôt que sur la seule page rendue : le
 * filtrage se fait en mémoire juste après, pour quelques dizaines de lignes.
 */
export async function listEvents(
  db: Db,
  filters: ListEventsInput = {},
  now: Date = new Date()
): Promise<ListEventsOutput> {
  const repo = new ListEventsRepository();
  const [rows, tallies, mine] = await Promise.all([
    repo.list(db),
    repo.tallies(db),
    filters.memberId ? repo.registrationsOf(db, filters.memberId) : Promise.resolve(null)
  ]);

  const today = now.toISOString().slice(0, 10);

  return rows
    .filter((event) => (filters.includeUnpublished ? true : event.status === 'published'))
    .filter((event) => (filters.includePast ? true : event.startsAt.slice(0, 10) >= today))
    .slice(0, filters.limit ?? DEFAULT_LIMIT)
    .map((event) => {
      const tally = tallies.get(event.id);
      const registrationCount = tally?.registrations ?? 0;
      return {
        ...event,
        registrationCount,
        attendeeCount: registrationCount + (tally?.guests ?? 0),
        myGuests: mine?.get(event.id) ?? null
      };
    });
}
