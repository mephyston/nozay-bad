import { type DbOrTx } from '@nba/db';
import { CHAMPIONSHIP_RULES, getDivision, teamName } from '../shared/championship';
import { loadPlayerDirectory, identityOf } from '../shared/members-lookup';
import { checkEligibility, describeEligibility } from '../shared/eligibility';
import { mondayOf } from '../shared/week';
import { TeamNotFoundError, UnknownChampionshipError } from '../shared/errors';
import type { PlayerRanking } from '../shared/player';
import { GetTeamRepository } from './repository';
import type { GetTeamOutput, RosterPlayer } from './dto';

const repo = new GetTeamRepository();

/** Un adhérent sans ligne de classement : traité comme non compétiteur, pas comme absent. */
function unranked(licence: string, gender: 'M' | 'F'): PlayerRanking {
  return {
    licence,
    lastName: '',
    firstName: '',
    // Le référentiel adhérents dit `M`/`F`, l'export Poona `H`/`F` : on convertit ici.
    gender: gender === 'M' ? 'H' : 'F',
    category: null,
    mutation: 'none',
    singles: null,
    doubles: null,
    mixed: null,
    cpphSingles: null,
    cpphDoubles: null,
    cpphMixed: null
  };
}

/**
 * Une équipe, son staff et son effectif, chaque joueur jugé au regard de sa division.
 *
 * La date des classements se résout différemment selon le championnat, et l'écran doit
 * pouvoir le dire : un départemental l'a épinglée pour la saison, un régional la
 * recalcule à chaque journée. Hors contexte de journée, on affiche alors les classements
 * les plus récents en le signalant (`referenceOrigin: 'latest'`), plutôt que de laisser
 * croire à une référence figée.
 */
export async function getTeam(db: DbOrTx, id: number): Promise<GetTeamOutput> {
  const team = await repo.findTeam(db, id);
  if (!team) throw new TeamNotFoundError();

  const rules = CHAMPIONSHIP_RULES[team.championship];
  const division = getDivision(team.championship, team.division);
  if (!division) throw new UnknownChampionshipError();

  const [staff, rosterLicences, directory, calendarRows] = await Promise.all([
    repo.staffFor(db, team.id),
    repo.rosterLicences(db, team.id),
    loadPlayerDirectory(db, team.seasonCode),
    repo.calendarFor(db, team)
  ]);

  const settings = await repo.settingsFor(db, team.seasonCode, team.championship);

  let referenceEloDate: string | null = null;
  let referenceOrigin: GetTeamOutput['referenceOrigin'] = 'none';

  if (rules.rankingPolicy === 'season_fixed') {
    referenceEloDate = settings?.referenceEloDate ?? null;
    referenceOrigin = referenceEloDate ? 'season' : 'none';
  } else {
    referenceEloDate = await repo.latestEloDate(db);
    referenceOrigin = referenceEloDate ? 'latest' : 'none';
  }

  const rankingRows = referenceEloDate
    ? await repo.rankingsAt(db, rosterLicences, referenceEloDate)
    : [];
  const rankingByLicence = new Map(rankingRows.map((row) => [row.licence, row]));

  const roster: RosterPlayer[] = rosterLicences
    .map((licence) => {
      const identity = identityOf(directory, licence)!;
      const row = rankingByLicence.get(licence);

      const player: PlayerRanking = row
        ? {
            licence: row.licence,
            lastName: row.lastName,
            firstName: row.firstName,
            gender: row.gender,
            category: row.category,
            mutation: row.mutation,
            singles: row.singles,
            doubles: row.doubles,
            mixed: row.mixed,
            cpphSingles: row.cpphSingles,
            cpphDoubles: row.cpphDoubles,
            cpphMixed: row.cpphMixed
          }
        : unranked(licence, identity.gender);

      const verdict = checkEligibility(division, rules.categories, player);

      return {
        ...identity,
        category: player.category,
        mutation: player.mutation,
        singles: player.singles,
        doubles: player.doubles,
        mixed: player.mixed,
        eligible: verdict.eligible,
        eligibleDisciplines: verdict.disciplines,
        ineligibilityReason: verdict.reason,
        hasRanking: Boolean(row)
      };
    })
    // Les joueurs à problème d'abord : c'est ce que le coach doit traiter.
    .sort(
      (a, b) =>
        Number(a.eligible) - Number(b.eligible) ||
        a.lastName.localeCompare(b.lastName, 'fr') ||
        a.firstName.localeCompare(b.firstName, 'fr')
    );

  /*
   * Le calendrier affiche la **date réelle** quand elle est connue, et la semaine
   * théorique sinon. Les deux sont distinctes : la semaine porte les règles, la date dit
   * seulement quand se présenter — un report ne déplace jamais la journée.
   */
  const fixtureByDay = new Map(calendarRows.fixtures.map((f) => [f.dayId, f]));
  const linesByFixture = new Map<number, number>();
  for (const slot of calendarRows.slots) {
    linesByFixture.set(slot.fixtureId, (linesByFixture.get(slot.fixtureId) ?? 0) + 1);
  }

  const calendar = calendarRows.days.map((day) => {
    const fixture = fixtureByDay.get(day.id);
    const playedAt = fixture?.playedAt ?? (day.matchDate ? `${day.matchDate}T00:00` : null);
    return {
      number: day.number,
      label: day.label,
      kind: day.kind,
      weekStart: day.weekStart,
      weekEnd: day.weekEnd,
      playedAt,
      venue: fixture?.venue ?? null,
      opponent: fixture?.opponent ?? null,
      home: fixture?.home ?? true,
      outsideTheoreticalWeek: Boolean(
        fixture?.playedAt && mondayOf(fixture.playedAt.slice(0, 10)) !== day.weekStart
      ),
      filledLines: fixture ? (linesByFixture.get(fixture.id) ?? 0) : 0
    };
  });

  const captainLicence = staff.find((s) => s.role === 'captain')?.licence ?? null;
  const viceCaptainLicence = staff.find((s) => s.role === 'vice_captain')?.licence ?? null;

  return {
    id: team.id,
    seasonCode: team.seasonCode,
    championship: team.championship,
    championshipLabel: rules.label,
    division: team.division,
    divisionLabel: division.label,
    number: team.number,
    name: teamName(team.number),
    poolLabel: team.poolLabel,
    active: team.active,
    matchCount: division.format.length,
    eligibilityRule: describeEligibility(division.eligibility),
    captain: identityOf(directory, captainLicence),
    viceCaptain: identityOf(directory, viceCaptainLicence),
    roster,
    calendar,
    referenceEloDate,
    referenceOrigin,
    rulesUrl: settings?.rulesUrl ?? null,
    rulesLabel: settings?.rulesLabel ?? null
  };
}
