import { type DbOrTx } from '@nba/db';
import { CHAMPIONSHIP_RULES, getDivision, teamName } from '../shared/championship';
import { normalizeLicence } from '../shared/ranking';
import { lineLabel } from '../shared/team-value';
import { ListMyFixturesRepository } from './repository';
import type { ListMyFixturesInput, ListMyFixturesOutput, MyFixture } from './dto';

const repo = new ListMyFixturesRepository();

/** Jour retenu pour classer les rencontres, et pour décider laquelle est la plus proche. */
function sortKey(playedAt: string | null, matchDate: string | null, weekStart: string): string {
  return (playedAt ?? matchDate ?? weekStart).slice(0, 10);
}

/**
 * Les rencontres d'interclubs à venir d'un adhérent, dans l'ordre.
 *
 * **Trois sources de date, dans cet ordre.** La date saisie par le capitaine fait foi,
 * heure comprise. À défaut, le jour commun du calendrier — le dimanche des vétérans. À
 * défaut encore, le lundi de la semaine théorique : le mixte et le masculin se jouent en
 * semaine sans jour commun, et c'est au capitaine de préciser lequel.
 *
 * Le comité arrête ce calendrier en septembre-octobre et le président le transmet aux
 * capitaines : une date absente n'est pas une décision en attente mais une saisie qui
 * n'a pas été faite, et les écrans le disent ainsi.
 *
 * La semaine en cours reste éligible jusqu'à son dimanche : une rencontre du samedi ne
 * doit pas disparaître de l'agenda le samedi matin.
 */
export async function listMyFixtures(
  db: DbOrTx,
  input: ListMyFixturesInput,
  now: Date = new Date()
): Promise<ListMyFixturesOutput> {
  const licence = normalizeLicence(input.licence);
  if (!licence) return { fixtures: [] };

  const teams = await repo.teamsOf(db, input.seasonCode, licence);
  if (teams.length === 0) return { fixtures: [] };

  const today = now.toISOString().slice(0, 10);
  const championships = [...new Set(teams.map((team) => team.championship))];
  const days = await repo.upcomingDays(db, input.seasonCode, championships, today);
  if (days.length === 0) return { fixtures: [] };

  const fixtures = await repo.fixturesFor(
    db,
    teams.map((team) => team.id),
    days.map((day) => day.id)
  );

  // Une rencontre non encore créée n'empêche pas d'annoncer la journée : le calendrier du
  // comité existe avant que le capitaine n'ouvre l'écran. On raisonne donc sur les
  // journées, la rencontre venant seulement compléter l'affichage quand elle existe.
  const upcoming = teams
    .flatMap((team) =>
      days
        .filter((day) => day.championship === team.championship)
        .map((day) => ({
          team,
          day,
          fixture: fixtures.find((f) => f.teamId === team.id && f.dayId === day.id) ?? null
        }))
    )
    .filter(({ fixture }) => fixture?.status !== 'bye')
    .filter(({ fixture, day }) => sortKey(fixture?.playedAt ?? null, day.matchDate, day.weekEnd) >= today)
    .sort((a, b) =>
      sortKey(a.fixture?.playedAt ?? null, a.day.matchDate, a.day.weekStart).localeCompare(
        sortKey(b.fixture?.playedAt ?? null, b.day.matchDate, b.day.weekStart)
      )
    )
    .slice(0, input.limit ?? Number.MAX_SAFE_INTEGER);

  const withLineups: MyFixture[] = [];
  for (const { team, day, fixture } of upcoming) {
    const rules = CHAMPIONSHIP_RULES[team.championship];
    const division = getDivision(team.championship, team.division);

    const slot = fixture ? (await repo.slotsOf(db, [fixture.id], licence))[0] : undefined;
    const lineupExists = fixture ? await repo.hasLineup(db, fixture.id) : false;

    withLineups.push({
      teamId: team.id,
      teamName: teamName(team.number),
      championshipLabel: rules.label,
      divisionLabel: division?.label ?? team.division,
      dayNumber: day.number,
      dayLabel: day.label,
      weekStart: day.weekStart,
      weekEnd: day.weekEnd,
      date: fixture?.playedAt ?? day.matchDate ?? null,
      dateSource: fixture?.playedAt ? 'captain' : day.matchDate ? 'committee' : null,
      opponent: fixture?.opponent ?? null,
      home: fixture?.home ?? true,
      venue: fixture?.venue ?? null,
      selected: Boolean(slot),
      slotLabel: slot && division ? lineLabel(division.format, slot.discipline, slot.position) : null,
      lineupStatus: slot?.status ?? null,
      lineupExists
    });
  }

  return { fixtures: withLineups };
}
