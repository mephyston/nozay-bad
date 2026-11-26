import { type DbOrTx } from '@nba/db';
import { getClubSettings } from '@nba/club/settings';
import { CHAMPIONSHIP_RULES, getDivision, teamName } from '../shared/championship';
import { publishedChampionships } from '../shared/rosters-publication';
import { ListClubFixturesRepository } from './repository';
import type { ClubFixture, ListClubFixturesInput, ListClubFixturesOutput } from './dto';

const repo = new ListClubFixturesRepository();

/**
 * Les rencontres à venir de toutes les équipes du club, sur une période.
 *
 * Mêmes règles de date que « mes rencontres » (`list-my-fixtures`) : la date du capitaine
 * fait foi, puis le jour commun du comité, puis seule la semaine. Une rencontre datée tombe
 * dans la période par sa date ; une rencontre sans date, par sa semaine.
 *
 * Seuls les championnats dont le coach a publié les effectifs : avant, l'équipe n'existe pas
 * pour les adhérents. Les équipes au repos ne jouent pas, et ne figurent pas.
 *
 * Rien sur les compositions : qui joue ne regarde que l'équipe.
 */
export async function listClubFixtures(db: DbOrTx, input: ListClubFixturesInput, now: Date = new Date()): Promise<ListClubFixturesOutput> {
  const from = input.from ?? now.toISOString().slice(0, 10);
  const [allTeams, published] = await Promise.all([repo.teams(db, input.seasonCode), publishedChampionships(db, input.seasonCode)]);
  const teams = allTeams.filter((team) => published.has(team.championship)).sort((a, b) => a.number - b.number);
  if (teams.length === 0) return { fixtures: [], teams: [] };
  const { teamPrefix } = await getClubSettings(db);

  const championships = [...new Set(teams.map((team) => team.championship))];
  const days = await repo.days(db, input.seasonCode, championships, from, input.to);
  const fixtures = await repo.fixtures(db, teams.map((t) => t.id), days.map((d) => d.id));

  const inRange = (day: string, weekEnd: string, weekStart: string, dated: boolean) =>
    dated ? day >= from && (!input.to || day <= input.to) : weekEnd >= from && (!input.to || weekStart <= input.to);

  const rows: ClubFixture[] = teams.flatMap((team) =>
    days
      .filter((day) => day.championship === team.championship)
      .map((day) => ({ day, fixture: fixtures.find((f) => f.teamId === team.id && f.dayId === day.id) ?? null }))
      .filter(({ fixture }) => fixture?.status !== 'bye')
      .flatMap(({ day, fixture }) => {
        const date = fixture?.playedAt ?? day.matchDate ?? null;
        if (!inRange((date ?? '').slice(0, 10), day.weekEnd, day.weekStart, date !== null)) return [];
        const division = getDivision(team.championship, team.division);
        return [{
          teamId: team.id,
          teamNumber: team.number,
          teamName: teamName(teamPrefix, team.number),
          championshipLabel: CHAMPIONSHIP_RULES[team.championship].label,
          divisionLabel: division?.label ?? team.division,
          dayNumber: day.number,
          dayLabel: day.label,
          weekStart: day.weekStart,
          weekEnd: day.weekEnd,
          date,
          dateSource: fixture?.playedAt ? ('captain' as const) : day.matchDate ? ('committee' as const) : null,
          opponent: fixture?.opponent ?? null,
          venue: fixture?.venue ?? null
        }];
      })
  );

  // Par date, puis semaine pour celles qui n'en ont pas encore, puis numéro d'équipe.
  const key = (f: ClubFixture) => f.date ?? f.weekStart;
  rows.sort((a, b) => key(a).localeCompare(key(b)) || a.teamNumber - b.teamNumber);

  return {
    fixtures: rows,
    teams: teams.map((team) => ({
      id: team.id,
      number: team.number,
      name: teamName(teamPrefix, team.number),
      championshipLabel: CHAMPIONSHIP_RULES[team.championship].label
    }))
  };
}
