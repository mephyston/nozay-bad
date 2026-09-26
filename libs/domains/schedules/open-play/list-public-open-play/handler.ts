import { type Db } from '@nba/db';
import { publicName } from '../../shared/open-play';
import { ListPublicOpenPlayRepository } from './repository';
import type {
  ListPublicOpenPlayInput,
  ListPublicOpenPlayOutput,
  PublicOpenPlaySession
} from './dto';

/** Six sur une page ; au-delà, l'espace adhérent fait mieux le travail. */
export const DEFAULT_PUBLIC_OPEN_PLAY_LIMIT = 6;
export const MAX_PUBLIC_OPEN_PLAY_LIMIT = 24;

/**
 * Les prochaines séances de jeu libre, telles que le site public les affiche.
 *
 * Tranche distincte de `list-open-play-sessions` et de `list-open-play-attendees`,
 * parce que le lecteur n'est pas le même : ici, **n'importe qui**, et une page que les
 * moteurs indexent. Le club a tranché ce qu'on y montre :
 *
 *  - les adhérents inscrits, en « Camille D. » — prénom, initiale du nom ;
 *  - les invités, **comptés** mais jamais nommés : ce ne sont pas des adhérents, ils
 *    n'ont rien accepté du club ;
 *  - l'ouvreur, sous la même forme, ou son absence.
 *
 * La réduction du nom se fait **ici**, côté API, et non au rendu : un nom complet qui
 * transiterait jusqu'au site pour y être tronqué finirait tôt ou tard dans un attribut,
 * un JSON-LD ou un journal.
 *
 * Trois requêtes fixes, quel que soit le nombre de séances.
 */
export async function listPublicOpenPlay(
  db: Db,
  input: ListPublicOpenPlayInput = {},
  now: Date = new Date()
): Promise<ListPublicOpenPlayOutput> {
  const repo = new ListPublicOpenPlayRepository();

  const requested = input.limit ?? DEFAULT_PUBLIC_OPEN_PLAY_LIMIT;
  const limit = Math.min(Math.max(1, Math.trunc(requested) || 1), MAX_PUBLIC_OPEN_PLAY_LIMIT);

  // Même règle que l'espace adhérent : une séance reste affichée jusqu'à la fin de son
  // jour — celui qui arrive en cours de séance doit encore la trouver.
  const today = now.toISOString().slice(0, 10);
  const rows = await repo.upcoming(db, today, limit);
  const ids = rows.map((row) => row.id);

  const [players, guestCounts] = await Promise.all([
    repo.players(db, ids),
    repo.guestCounts(db, ids)
  ]);

  const playersBySession = new Map<number, string[]>();
  for (const player of players) {
    const names = playersBySession.get(player.sessionId) ?? [];
    names.push(publicName(player.firstName, player.lastName));
    playersBySession.set(player.sessionId, names);
  }

  const sessions: PublicOpenPlaySession[] = rows.map((row) => {
    const names = playersBySession.get(row.id) ?? [];
    const guestCount = guestCounts.get(row.id) ?? 0;
    return {
      id: row.id,
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      label: row.label,
      status: row.status,
      venueName: row.venueName,
      minPlayers: row.minPlayers,
      playerCount: names.length + guestCount,
      guestCount,
      players: names,
      // L'identité recopiée fait foi : c'est elle qui dit qui a pris la séance, même
      // si la personne a quitté la liste des ouvreurs depuis. Une séance annulée n'a
      // plus d'ouvreur à montrer.
      opener:
        row.status !== 'cancelled' && row.openerFirstName !== null
          ? publicName(row.openerFirstName, row.openerLastName ?? '')
          : null
    };
  });

  return { sessions };
}
