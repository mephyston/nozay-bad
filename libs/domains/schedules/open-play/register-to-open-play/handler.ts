import { type Db } from '@nba/db';
import { MAX_OPEN_PLAY_GUESTS, isNamedGuest, isUpcomingDate } from '../../shared/open-play';
import {
  InvalidGuestNameError,
  OpenPlaySessionCancelledError,
  OpenPlaySessionNotFoundError,
  OpenPlaySessionPassedError,
  TooManyGuestsError
} from '../../shared/errors';
import { RegisterToOpenPlayRepository } from './repository';
import type { RegisterToOpenPlayInput, RegisterToOpenPlayOutput } from './dto';

/**
 * Inscrit un adhérent à une séance, avec les invités qu'il annonce.
 *
 * Les refus sont vérifiés **ici** et non à l'affichage : un écran ouvert depuis une
 * heure ne dit plus l'état réel, et entre le moment où l'adhérent a vu le bouton et
 * celui où il clique, le bureau a pu annuler.
 *
 * Pas de refus « séance pleine » — il n'y a pas de plafond, seulement un seuil bas. Pas
 * de refus « séance confirmée » non plus : une séance qui a trouvé son ouvreur reste
 * ouverte, c'est même tout son intérêt.
 */
export async function registerToOpenPlay(
  db: Db,
  input: RegisterToOpenPlayInput,
  now: Date = new Date()
): Promise<RegisterToOpenPlayOutput> {
  const repo = new RegisterToOpenPlayRepository();

  const session = await repo.findSession(db, input.sessionId);
  if (!session) throw new OpenPlaySessionNotFoundError();
  if (session.status === 'cancelled') throw new OpenPlaySessionCancelledError();
  if (!isUpcomingDate(session.date, now)) throw new OpenPlaySessionPassedError();

  const guests = input.guests ?? [];
  // Le validateur de la route le refuse déjà ; le handler revérifie parce qu'il est
  // appelable hors HTTP — par la génération de données de test, demain par un import.
  if (guests.length > MAX_OPEN_PLAY_GUESTS) throw new TooManyGuestsError();
  // Un invité « ␣ » ne dit rien au bénévole qui ouvre la porte : c'est précisément ce
  // que la table sert à éviter.
  if (!guests.every(isNamedGuest)) throw new InvalidGuestNameError();

  const statements = repo.buildUpsertStatements(
    db,
    {
      sessionId: session.id,
      memberId: input.memberId,
      licence: input.licence.trim(),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      createdAt: now,
      updatedAt: now
    },
    guests.map((guest) => ({
      firstName: guest.firstName.trim(),
      lastName: guest.lastName.trim()
    }))
  );

  // Un seul lot : deux à cinq instructions, très loin des limites de D1. C'est ce qui
  // garantit qu'un double-clic ne laisse jamais une inscription sans ses invités, ni des
  // invités orphelins.
  await db.batch(statements as any);

  // Relu plutôt que reconstitué : c'est la base qui a tranché entre insertion et mise à
  // jour, et l'appelant doit recevoir l'état réel — dont l'identifiant de l'inscription
  // et sa date de création d'origine.
  const registration = await repo.findWithGuests(db, session.id, input.memberId);
  if (!registration) throw new OpenPlaySessionNotFoundError("L'inscription n'a pas pu être relue.");

  return registration;
}
