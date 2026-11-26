import { type DbOrTx } from '@nba/db';
import { getClubSettings } from '@nba/club/settings';
import { CHAMPIONSHIP_RULES, CHAMPIONSHIP_SHORT_LABELS, getDivision, teamName } from '../shared/championship';
import { normalizeLicence } from '../shared/ranking';
import { lineLabel } from '../shared/team-value';
import { publishedChampionships } from '../shared/rosters-publication';
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
 *
 * **Seul ce qui est publié.** Un championnat dont le coach n'a pas publié les effectifs
 * n'apparaît pas : l'adhérent n'y a pas encore d'équipe. Une composition en brouillon
 * ne se lit que pour le capitaine et le vice-capitaine ; les autres la voient comme
 * « pas encore saisie ».
 */
export async function listMyFixtures(
  db: DbOrTx,
  input: ListMyFixturesInput,
  now: Date = new Date()
): Promise<ListMyFixturesOutput> {
  const licence = normalizeLicence(input.licence);
  if (!licence) return { fixtures: [] };

  const [memberOf, published] = await Promise.all([
    repo.teamsOf(db, input.seasonCode, licence),
    publishedChampionships(db, input.seasonCode)
  ]);
  const teams = memberOf.filter((team) => published.has(team.championship));
  if (teams.length === 0) return { fixtures: [] };
  const { teamPrefix } = await getClubSettings(db);

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
        // Chaque rang de la journée : deux rencontres en régional et chez les vétérans.
        .flatMap((day) =>
          Array.from({ length: CHAMPIONSHIP_RULES[team.championship].fixturesPerDay }, (_, i) => i + 1).map((rank) => ({
            team,
            day,
            rank,
            fixture: fixtures.find((f) => f.teamId === team.id && f.dayId === day.id && f.slot === rank) ?? null
          }))
        )
    )
    .filter(({ fixture }) => fixture?.status !== 'bye')
    .filter(({ fixture, day }) => sortKey(fixture?.playedAt ?? null, day.matchDate, day.weekEnd) >= today)
    .sort((a, b) =>
      sortKey(a.fixture?.playedAt ?? null, a.day.matchDate, a.day.weekStart).localeCompare(
        sortKey(b.fixture?.playedAt ?? null, b.day.matchDate, b.day.weekStart)
      ) || a.rank - b.rank
    )
    .slice(0, input.limit ?? Number.MAX_SAFE_INTEGER);

  const withLineups: MyFixture[] = [];
  for (const { team, day, rank, fixture } of upcoming) {
    const rules = CHAMPIONSHIP_RULES[team.championship];
    const division = getDivision(team.championship, team.division);

    // Toutes ses lignes, et non la première : aligné en DH et en MX, l'adhérent ne lisait
    // que « DH ». Dans l'ordre de la feuille de match.
    const stored = fixture ? await repo.lineupStatus(db, fixture.id) : null;
    // Un brouillon n'existe que pour le staff de l'équipe.
    const status = stored === 'draft' && !team.viewerIsStaff ? null : stored;
    const slots = fixture && status ? await repo.slotsOf(db, [fixture.id], licence) : [];
    const rang = (s: (typeof slots)[number]) =>
      division?.format.findIndex((f) => f.discipline === s.discipline && f.position === s.position) ?? 0;
    const lignes = division ? [...slots].sort((a, b) => rang(a) - rang(b)).map((s) => lineLabel(division.format, s.discipline, s.position)) : [];

    withLineups.push({
      teamId: team.id,
      teamName: teamName(teamPrefix, team.number),
      championshipLabel: rules.label,
      championshipShortLabel: CHAMPIONSHIP_SHORT_LABELS[team.championship],
      divisionLabel: division?.label ?? team.division,
      dayNumber: day.number,
      slot: rank,
      dayLabel: day.label,
      weekStart: day.weekStart,
      weekEnd: day.weekEnd,
      date: fixture?.playedAt ?? day.matchDate ?? null,
      dateSource: fixture?.playedAt ? 'captain' : day.matchDate ? 'committee' : null,
      opponent: fixture?.opponent ?? null,
      venue: fixture?.venue ?? null,
      selected: slots.length > 0,
      slotLabel: lignes.length > 0 ? lignes.join(' et ') : null,
      lineupStatus: status,
      lineupExists: status !== null
    });
  }

  return { fixtures: withLineups };
}
