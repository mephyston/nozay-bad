import { type DbOrTx } from '@nba/db';
import { getClubSettings } from '@nba/club/settings';
import { CHAMPIONSHIP_RULES, getDivision, teamName } from '../shared/championship';
import { TeamNotFoundError, UnknownChampionshipError, TeamNumberTakenError } from '../shared/errors';
import { SaveTeamRepository } from './repository';
import type { SaveTeamInput, SaveTeamOutput } from './dto';

const repo = new SaveTeamRepository();

/**
 * Crée ou modifie une équipe.
 *
 * Le nom n'est pas un champ : il se dérive du numéro (`NBA91-3`). Un libellé libre
 * finirait par contredire le numéro, et c'est le numéro que lit la règle de hiérarchie —
 * on aurait alors un écran qui affirme une chose et un calcul qui en applique une autre.
 */
export async function saveTeam(
  db: DbOrTx,
  input: SaveTeamInput,
  now: Date = new Date()
): Promise<SaveTeamOutput> {
  const rules = CHAMPIONSHIP_RULES[input.championship];
  if (!rules) throw new UnknownChampionshipError();

  const division = getDivision(input.championship, input.division);
  if (!division) {
    throw new UnknownChampionshipError(
      `La division « ${input.division} » n'existe pas en ${rules.label}.`
    );
  }

  const { teamPrefix } = await getClubSettings(db);
  const conflict = await repo.findConflict(db, {
    seasonCode: input.seasonCode,
    championship: input.championship,
    number: input.number,
    exceptId: input.id
  });
  if (conflict) throw new TeamNumberTakenError(rules.label, input.number);

  const values = {
    seasonCode: input.seasonCode,
    championship: input.championship,
    division: input.division,
    number: input.number,
    poolLabel: input.poolLabel ?? null,
    active: input.active ?? true
  };

  if (input.id === undefined) {
    const created = await repo.insert(db, { ...values, createdAt: now });
    return { id: created.id, name: teamName(teamPrefix, created.number) };
  }

  const existing = await repo.findById(db, input.id);
  if (!existing) throw new TeamNotFoundError();

  const updated = await repo.update(db, input.id, values);
  return { id: updated.id, name: teamName(teamPrefix, updated.number) };
}
