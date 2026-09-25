import { type Db } from '@nba/db';
import { ClubEventNotFoundError } from '../shared/errors';
import { ListEventRegistrationsRepository } from './repository';
import type { ListEventRegistrationsInput, ListEventRegistrationsOutput } from './dto';

/**
 * Qui vient, nom par nom.
 *
 * C'est la liste complète — adresse et identifiant d'adhésion compris — et elle n'est
 * **pas** ouverte aux appelants de service : elle ne sort qu'auprès d'une identité
 * d'administration porteuse du droit. L'espace adhérent a sa propre lecture, réduite aux
 * noms et au nombre d'accompagnants (`list-event-attendees`) ; le site public n'obtient
 * que des compteurs.
 *
 * Le total est calculé ici plutôt que dans l'écran : c'est le chiffre sur lequel le
 * bureau engage une commande, il n'a pas à dépendre d'une addition faite en JavaScript.
 */
export async function listEventRegistrations(
  db: Db,
  input: ListEventRegistrationsInput
): Promise<ListEventRegistrationsOutput> {
  const repo = new ListEventRegistrationsRepository();

  if (!(await repo.findEvent(db, input.eventId))) throw new ClubEventNotFoundError();

  const rows = await repo.listFor(db, input.eventId);
  const guests = rows.reduce((total, row) => total + row.guests, 0);

  return {
    registrations: rows.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      guests: row.guests,
      registeredAt: Math.floor(row.createdAt.getTime() / 1000)
    })),
    totals: { members: rows.length, guests, people: rows.length + guests }
  };
}
