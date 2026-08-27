import { type Db } from '@nba/db';
import { seasonCodeForDate } from '../../shared/season';
import { ListOpenPlaySessionsRepository } from './repository';
import type {
  ListOpenPlaySessionsInput,
  ListOpenPlaySessionsOutput,
  OpenPlaySessionListItem
} from './dto';

/** Date locale d'aujourd'hui, plus un décalage en jours. */
function localDate(now: Date, plusDays = 0): string {
  const date = new Date(now.getTime() + plusDays * 86_400_000);
  return date.toISOString().slice(0, 10);
}

/**
 * Les séances de jeu libre, avec de quoi décider quoi afficher.
 *
 * Quatre requêtes fixes quel que soit le nombre de séances : les lignes, les gymnases,
 * les compteurs agrégés, et — si l'on lit au nom de quelqu'un — ses propres inscriptions.
 *
 * **Aucun nom d'inscrit ne sort d'ici.** L'espace adhérent reçoit des compteurs et des
 * booléens ; savoir qu'il y a six joueurs n'apprend rien sur personne, savoir lesquels,
 * si. Seuls les invités de l'adhérent au nom duquel on lit lui reviennent — ce sont les
 * siens, il vient de les saisir.
 */
export async function listOpenPlaySessions(
  db: Db,
  input: ListOpenPlaySessionsInput = {},
  now: Date = new Date()
): Promise<ListOpenPlaySessionsOutput> {
  const repo = new ListOpenPlaySessionsRepository();

  const from = input.from ?? localDate(now);
  const to =
    input.to ??
    (input.needsOpenerWithinDays ? localDate(now, input.needsOpenerWithinDays) : undefined);

  const [sessions, venues, tallies] = await Promise.all([
    repo.list(db, { from, to, sessionIds: input.sessionIds }),
    repo.venues(db),
    repo.tallies(db)
  ]);

  const mine = input.memberId ? await repo.registrationsOf(db, input.memberId) : new Map();
  const venueById = new Map(venues.map((venue) => [venue.id, venue]));

  // Un seul contrôle d'ouvreur pour toute la liste, et il porte sur la saison **en
  // cours** : « puis-je ouvrir ? » est une question au présent. Elle se lisait avant sur
  // la première séance rendue, ce qui donnait la mauvaise réponse à l'administration, qui
  // remonte l'historique depuis 2000 — la saison de la plus vieille séance de la liste.
  const seasonCode = seasonCodeForDate(localDate(now));
  const canOpen = input.licence ? await repo.isOpener(db, seasonCode, input.licence) : false;

  const items: OpenPlaySessionListItem[] = sessions
    .filter((session) => (input.includeCancelled === false ? session.status !== 'cancelled' : true))
    .map((session) => {
      const tally = tallies.get(session.id) ?? { registrations: 0, guests: 0 };
      // Les invités comptent : le seuil est un seuil de raquettes sur les terrains, pas
      // de licences. Un bénévole ne traverse pas la ville pour ouvrir un gymnase où
      // trois adhérents et leurs invités joueraient.
      const playerCount = tally.registrations + tally.guests;

      return {
        ...session,
        venue: venueById.get(session.venueId) ?? null,
        registrationCount: tally.registrations,
        guestCount: tally.guests,
        playerCount,
        needsOpener:
          session.status === 'open' &&
          session.openerLicence === null &&
          playerCount >= session.minPlayers,
        myGuests: mine.has(session.id) ? (mine.get(session.id) as never) : null,
        iAmOpener: Boolean(input.licence) && session.openerLicence === input.licence
      };
    })
    .filter((item) => (input.needsOpenerWithinDays ? item.needsOpener : true))
    .slice(0, input.limit ?? 200);

  return { sessions: items, canOpen };
}
