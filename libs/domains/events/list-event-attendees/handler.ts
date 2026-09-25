import { type Db } from '@nba/db';
import { ClubEventNotFoundError } from '../shared/errors';
import { ListEventAttendeesRepository } from './repository';
import type { ListEventAttendeesInput, ListEventAttendeesOutput } from './dto';

/**
 * Qui vient, tel que l'espace adhérent l'affiche.
 *
 * Le pendant de « Voir qui vient » du jeu libre : on s'inscrit à une soirée ou à un stage
 * aussi parce que d'autres y vont. Distinct de la liste du bureau, et c'est l'intérêt d'une
 * tranche à part : elle ne rend **que des noms** et le nombre d'accompagnants — ni adresse,
 * ni identifiant d'adhésion.
 *
 * Réservée à l'espace adhérent, derrière sa connexion : le site public n'obtient toujours
 * que des compteurs. Un brouillon, ou un rendez-vous sans inscription, n'a pas de liste à
 * montrer : il répond comme s'il n'existait pas.
 */
export async function listEventAttendees(db: Db, input: ListEventAttendeesInput): Promise<ListEventAttendeesOutput> {
  const repo = new ListEventAttendeesRepository();

  const event = await repo.findEvent(db, input.eventId);
  if (!event || event.status !== 'published' || event.registration === 'none') throw new ClubEventNotFoundError();

  const attendees = await repo.listFor(db, input.eventId);
  const guests = attendees.reduce((total, row) => total + row.guests, 0);

  return {
    attendees,
    totals: { members: attendees.length, guests, people: attendees.length + guests }
  };
}
