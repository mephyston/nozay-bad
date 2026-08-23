import { type Db } from '@nba/db';
import { OpenPlaySessionNotFoundError } from '../../shared/errors';
import { ListOpenPlayAttendeesRepository } from './repository';
import type { ListOpenPlayAttendeesInput, ListOpenPlayAttendeesOutput } from './dto';

/**
 * Qui vient jouer, tel que l'espace adhérent l'affiche.
 *
 * Distinct de la liste d'appel du bureau, et c'est tout l'intérêt d'une tranche à part :
 * celle-ci ne rend **que des noms**. Ni licence, ni adresse, ni identifiant d'adhésion —
 * un adhérent choisit de venir parce que ses partenaires viennent, il n'a pas besoin de
 * l'annuaire pour cela.
 *
 * Les invités y sont nommés, sous leur hôte. Le club l'a voulu ainsi : on vient jouer
 * avec des gens, et savoir que Camille amène deux personnes sans savoir lesquelles
 * n'apprend rien. C'est aussi ce que voit déjà l'effectif d'une équipe.
 */
export async function listOpenPlayAttendees(
  db: Db,
  input: ListOpenPlayAttendeesInput
): Promise<ListOpenPlayAttendeesOutput> {
  const repo = new ListOpenPlayAttendeesRepository();

  if (!(await repo.findSession(db, input.sessionId))) throw new OpenPlaySessionNotFoundError();

  const [rows, guestsByRegistration] = await Promise.all([
    repo.listFor(db, input.sessionId),
    repo.guestsFor(db, input.sessionId)
  ]);

  const attendees = rows.map((row) => ({
    firstName: row.firstName,
    lastName: row.lastName,
    guests: guestsByRegistration.get(row.id) ?? []
  }));

  const guests = attendees.reduce((total, row) => total + row.guests.length, 0);

  return {
    attendees,
    totals: { members: attendees.length, guests, players: attendees.length + guests }
  };
}
