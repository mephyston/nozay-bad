import { type DbOrTx } from '@nba/db';
import { CHAMPIONSHIP_LABELS, getDivision, teamName } from '../shared/championship';
import { GetPlayerCardRepository } from './repository';
import type { GetPlayerCardInput, GetPlayerCardOutput, PlayerTeam } from './dto';

const repo = new GetPlayerCardRepository();

/**
 * Ce qu'un adhérent a d'interclubs : ses équipes de la saison et ses classements.
 *
 * Une tranche à part plutôt qu'un emprunt à l'existant : `GET /teams/rankings` rend le
 * barème nominatif de tout le club et reste fermé à l'espace adhérent, tandis que
 * `my-fixtures` répond sur les rencontres, pas sur l'appartenance. Ici on ne divulgue
 * qu'une licence à la fois, ce qui est exactement ce qu'affiche une fiche.
 *
 * Les classements sont lus à la date d'import la plus récente, et cette date est rendue
 * avec eux : la référence figée par championnat est une affaire de composition d'équipe,
 * elle n'a pas de sens sur une fiche.
 */
export async function getPlayerCard(db: DbOrTx, input: GetPlayerCardInput): Promise<GetPlayerCardOutput> {
  const [teamRows, referenceEloDate] = await Promise.all([
    repo.teamsFor(db, input.licence, input.seasonCode),
    repo.latestEloDate(db)
  ]);

  const teams: PlayerTeam[] = teamRows.map((team) => ({
    teamId: team.id,
    name: teamName(team.number),
    championshipLabel: CHAMPIONSHIP_LABELS[team.championship],
    // Le code de division est stocké tel quel (« D1 », « PN ») ; son libellé vient du
    // référentiel, et l'on retombe sur le code si la division n'y figure plus.
    divisionLabel: getDivision(team.championship, team.division)?.label ?? team.division
  }));

  const ranking = referenceEloDate
    ? await repo.rankingAt(db, input.licence, referenceEloDate)
    : undefined;

  return {
    teams,
    rankings: {
      singles: ranking?.singles ?? null,
      doubles: ranking?.doubles ?? null,
      mixed: ranking?.mixed ?? null,
      hasRanking: ranking !== undefined
    },
    referenceEloDate
  };
}
