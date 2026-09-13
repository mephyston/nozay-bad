import { type DbOrTx } from '@nba/db';
import { getClubSettings } from '@nba/club/settings';
import { CHAMPIONSHIPS, CHAMPIONSHIP_RULES, getDivision, teamName } from '../shared/championship';
import { loadPlayerDirectory, identityOf } from '../shared/members-lookup';
import { normalizeLicence } from '../shared/ranking';
import { ListTeamsRepository } from './repository';
import type { ListTeamsOutput, TeamListItem, TeamViewerRole } from './dto';

const repo = new ListTeamsRepository();

/**
 * Les équipes engagées sur une saison, staff résolu et effectif compté.
 *
 * Le tri suit l'ordre des championnats puis le **numéro d'équipe**, et non l'ordre
 * d'insertion : c'est dans cet ordre que la règle de hiérarchie se lit, donc celui dans
 * lequel le coach doit voir ses équipes pour repérer une valeur qui dépasse.
 *
 * `viewerLicence` ne filtre rien : la liste reste celle de tout le club. Elle sert
 * seulement à marquer les équipes qui concernent le lecteur, pour qu'il les retrouve
 * d'un coup d'œil au milieu des autres.
 */
export async function listTeams(
  db: DbOrTx,
  seasonCode: string,
  viewerLicence?: string | null
): Promise<ListTeamsOutput> {
  const teams = await repo.listBySeason(db, seasonCode);
  const { teamPrefix } = await getClubSettings(db);
  const teamIds = teams.map((team) => team.id);
  const viewer = viewerLicence ? normalizeLicence(viewerLicence) : '';

  const [staff, rosterCounts, directory, viewerRosterTeams] = await Promise.all([
    repo.staffFor(db, teamIds),
    repo.rosterCounts(db, teamIds),
    loadPlayerDirectory(db, seasonCode),
    repo.rosterTeamsOf(db, teamIds, viewer)
  ]);

  const staffByTeam = new Map<number, { captain?: string; viceCaptain?: string }>();
  for (const row of staff) {
    const entry = staffByTeam.get(row.teamId) ?? {};
    if (row.role === 'captain') entry.captain = row.licence;
    else entry.viceCaptain = row.licence;
    staffByTeam.set(row.teamId, entry);
  }

  const championshipOrder = new Map(CHAMPIONSHIPS.map((code, index) => [code, index]));

  const items: TeamListItem[] = teams
    .map((team) => {
      const rules = CHAMPIONSHIP_RULES[team.championship];
      const division = getDivision(team.championship, team.division);
      const assigned = staffByTeam.get(team.id) ?? {};

      let viewerRole: TeamViewerRole = null;
      if (viewer) {
        if (assigned.captain === viewer) viewerRole = 'captain';
        else if (assigned.viceCaptain === viewer) viewerRole = 'viceCaptain';
        else if (viewerRosterTeams.has(team.id)) viewerRole = 'player';
      }

      return {
        id: team.id,
        seasonCode: team.seasonCode,
        championship: team.championship,
        championshipLabel: rules.label,
        division: team.division,
        // Une division retirée du règlement ne doit pas faire disparaître l'équipe de
        // l'écran : on retombe sur le code brut, qui reste lisible.
        divisionLabel: division?.label ?? team.division,
        number: team.number,
        name: teamName(teamPrefix, team.number),
        poolLabel: team.poolLabel,
        active: team.active,
        captain: identityOf(directory, assigned.captain),
        viceCaptain: identityOf(directory, assigned.viceCaptain),
        rosterCount: rosterCounts.get(team.id) ?? 0,
        matchCount: division?.format.length ?? 0,
        viewerRole
      };
    })
    .sort(
      (a, b) =>
        (championshipOrder.get(a.championship) ?? 0) - (championshipOrder.get(b.championship) ?? 0) ||
        a.number - b.number
    );

  return { seasonCode, teams: items };
}
