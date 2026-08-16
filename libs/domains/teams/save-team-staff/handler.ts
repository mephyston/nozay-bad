import { type DbOrTx } from '@nba/db';
import { normalizeLicence } from '../shared/ranking';
import { loadPlayerDirectory } from '../shared/members-lookup';
import { TeamNotFoundError, InvalidLineupError } from '../shared/errors';
import { SaveTeamStaffRepository } from './repository';
import type { SaveTeamStaffInput, SaveTeamStaffOutput } from './dto';

const repo = new SaveTeamStaffRepository();

/**
 * Désigne le capitaine et le vice-capitaine d'une équipe.
 *
 * Cette désignation **est** le droit d'écriture côté espace adhérent : c'est elle, et non
 * un rôle d'administration, qui autorise à composer l'équipe. D'où deux exigences :
 *
 *   * les deux licences doivent appartenir au référentiel des adhérents de la saison —
 *     accorder un droit à une licence inconnue serait accorder un droit à personne ;
 *   * elles doivent différer, sinon la suppléance que le vice-capitaine assure n'existe
 *     pas, et le club croirait avoir un remplaçant.
 *
 * Passer `null` retire la désignation.
 */
export async function saveTeamStaff(
  db: DbOrTx,
  input: SaveTeamStaffInput,
  now: Date = new Date()
): Promise<SaveTeamStaffOutput> {
  const team = await repo.findTeam(db, input.teamId);
  if (!team) throw new TeamNotFoundError();

  const captain = input.captainLicence ? normalizeLicence(input.captainLicence) : null;
  const viceCaptain = input.viceCaptainLicence ? normalizeLicence(input.viceCaptainLicence) : null;

  if (captain && viceCaptain && captain === viceCaptain) {
    throw new InvalidLineupError(
      'Le capitaine et le vice-capitaine ne peuvent pas être la même personne.'
    );
  }

  const directory = await loadPlayerDirectory(db, team.seasonCode);
  for (const licence of [captain, viceCaptain]) {
    if (licence && !directory.has(licence)) {
      throw new InvalidLineupError(
        `La licence ${licence} ne figure pas au référentiel des adhérents de la saison.`
      );
    }
  }

  await repo.replaceStaff(db, team.id, { captain, viceCaptain }, now);
  return { teamId: team.id, captainLicence: captain, viceCaptainLicence: viceCaptain };
}
