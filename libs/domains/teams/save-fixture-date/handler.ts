import { type DbOrTx } from '@nba/db';
import { normalizeLicence } from '../shared/ranking';
import { mondayOf, sundayOf } from '../shared/week';
import { CHAMPIONSHIP_RULES, checkMatchDay, type MatchDayVerdict } from '../shared/championship';
import {
  ChampionshipDayNotFoundError,
  InvalidLineupError,
  NotTeamCaptainError,
  TeamNotFoundError
} from '../shared/errors';
import { SaveFixtureDateRepository } from './repository';
import type { SaveFixtureDateInput, SaveFixtureDateOutput } from './dto';

const repo = new SaveFixtureDateRepository();

/**
 * Le capitaine fixe la date réelle de **sa** rencontre.
 *
 * Deux notions coexistent, et tout le sens de cette fonction est de ne pas les mélanger :
 *
 * - **La semaine théorique de la journée** vient du calendrier du comité. Elle est figée,
 *   commune à toutes les équipes de la journée, et porte les règles transverses : valeur
 *   d'équipe, mouvements de joueurs, « un joueur ne tient qu'une seule équipe du club ».
 *   Rien de ce qui se passe ici ne la déplace.
 * - **La date réelle** est propre à cette équipe. Elle tombe normalement dans la semaine
 *   théorique, mais un gymnase indisponible ou des intempéries peuvent l'en faire sortir.
 *
 * Une date hors semaine est donc **refusée par défaut** — c'est presque toujours une
 * faute de frappe — et acceptée si le capitaine la confirme explicitement. Le refus porte
 * le message qui explique ce qu'il confirme au juste : la rencontre bouge, pas la journée.
 */
export async function saveFixtureDate(
  db: DbOrTx,
  input: SaveFixtureDateInput,
  now: Date = new Date()
): Promise<SaveFixtureDateOutput> {
  const team = await repo.findTeam(db, input.teamId);
  if (!team) throw new TeamNotFoundError();

  const licence = normalizeLicence(input.licence);
  if (!(await repo.isStaff(db, team.id, licence))) throw new NotTeamCaptainError();

  const day = await repo.findDay(db, team.seasonCode, team.championship, input.dayNumber);
  if (!day) throw new ChampionshipDayNotFoundError();

  const rules = CHAMPIONSHIP_RULES[team.championship];
  const slot = input.slot ?? 1;

  let outsideTheoreticalWeek = false;
  let matchDay: MatchDayVerdict = 'allowed';
  if (input.playedAt) {
    const playedDay = input.playedAt.slice(0, 10);
    outsideTheoreticalWeek = mondayOf(playedDay) !== day.weekStart;

    if (outsideTheoreticalWeek && !input.confirmOutsideWeek) {
      throw new InvalidLineupError(
        `Le ${playedDay} sort de la semaine de la journée J${day.number} (du ${day.weekStart} au ${sundayOf(day.weekStart)}). ` +
          "Confirmez s'il s'agit d'un report exceptionnel : la date de la rencontre changera, mais la journée restera la même — c'est elle qui porte les règles de valeur et de composition."
      );
    }

    // Le jour de la semaine, lui, ne bloque jamais : les comités accordent des
    // dérogations qui ne figurent dans aucun règlement, et refuser obligerait le
    // capitaine à saisir une date fausse. L'écran le signale, c'est tout.
    matchDay = checkMatchDay(rules, playedDay);
  }

  const fixture = await repo.upsertDate(
    db,
    { teamId: team.id, dayId: day.id, slot },
    { playedAt: input.playedAt ?? null, venue: input.venue ?? null, opponent: input.opponent ?? null },
    now
  );

  return {
    teamId: team.id,
    dayNumber: day.number,
    playedAt: fixture.playedAt,
    venue: fixture.venue,
    opponent: fixture.opponent,
    outsideTheoreticalWeek,
    matchDay
  };
}
