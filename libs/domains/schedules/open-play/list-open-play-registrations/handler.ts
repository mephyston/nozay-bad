import { type Db } from '@nba/db';
import { OpenPlaySessionNotFoundError } from '../../shared/errors';
import { ListOpenPlayRegistrationsRepository } from './repository';
import type { ListOpenPlayRegistrationsInput, ListOpenPlayRegistrationsOutput } from './dto';

/**
 * Qui vient, nom par nom, et avec qui.
 *
 * C'est la seule lecture nominative du jeu libre, et elle n'est **pas** ouverte aux
 * appelants de service : l'espace adhérent obtient des compteurs, jamais des noms. Une
 * liste d'inscrits — a fortiori d'invités non licenciés — est une donnée personnelle,
 * elle ne sort qu'auprès d'une identité d'administration porteuse du droit.
 *
 * Le total est calculé ici plutôt que dans l'écran : c'est le chiffre sur lequel un
 * bénévole décide de traverser la ville, il n'a pas à dépendre d'une addition faite en
 * JavaScript.
 */
export async function listOpenPlayRegistrations(
  db: Db,
  input: ListOpenPlayRegistrationsInput
): Promise<ListOpenPlayRegistrationsOutput> {
  const repo = new ListOpenPlayRegistrationsRepository();

  if (!(await repo.findSession(db, input.sessionId))) throw new OpenPlaySessionNotFoundError();

  const [rows, guestsByRegistration] = await Promise.all([
    repo.listFor(db, input.sessionId),
    repo.guestsFor(db, input.sessionId)
  ]);

  const registrations = rows.map((row) => ({
    id: row.id,
    memberId: row.memberId,
    licence: row.licence,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    guests: guestsByRegistration.get(row.id) ?? [],
    registeredAt: Math.floor(row.createdAt.getTime() / 1000)
  }));

  const guests = registrations.reduce((total, row) => total + row.guests.length, 0);

  return {
    registrations,
    totals: { members: registrations.length, guests, players: registrations.length + guests }
  };
}
