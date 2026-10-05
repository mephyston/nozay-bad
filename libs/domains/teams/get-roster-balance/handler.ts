import { type DbOrTx } from '@nba/db';
import { getClubSettings } from '@nba/club/settings';
import { CHAMPIONSHIP_RULES, getDivision, teamName } from '../shared/championship';
import { loadPlayerDirectory } from '../shared/members-lookup';
import { normalizeLicence } from '../shared/ranking';
import { UnknownChampionshipError } from '../shared/errors';
import { GetRosterBalanceRepository } from './repository';
import type { GetRosterBalanceInput, GetRosterBalanceOutput, RosterBalancePlayer } from './dto';

const repo = new GetRosterBalanceRepository();

/**
 * Le vivier d'un championnat : les joueurs inscrits dans ses équipes, avec leur
 * classement de référence.
 *
 * La référence est celle que les compositions emploieront : la date épinglée pour la
 * saison en départemental, le dernier import en régional (qui la recalcule chaque
 * semaine, et dont la première semaine n'est pas encore connue en début de saison).
 */
export async function getRosterBalance(db: DbOrTx, input: GetRosterBalanceInput): Promise<GetRosterBalanceOutput> {
  const rules = CHAMPIONSHIP_RULES[input.championship];
  if (!rules) throw new UnknownChampionshipError();

  const [teams, directory, { teamPrefix }] = await Promise.all([
    repo.teams(db, input.seasonCode, input.championship),
    loadPlayerDirectory(db, input.seasonCode),
    getClubSettings(db)
  ]);
  const rosters = await repo.rosters(db, teams.map((t) => t.id));

  const referenceEloDate =
    rules.rankingPolicy === 'season_fixed'
      ? await repo.seasonReferenceDate(db, input.seasonCode, input.championship)
      : await repo.latestEloDate(db);

  // Un joueur inscrit dans deux équipes du même championnat compte une fois, dans la
  // plus haute : c'est elle qui le réclame en premier.
  const teamOf = new Map<string, number>();
  for (const team of teams) {
    for (const r of rosters.filter((x) => x.teamId === team.id)) {
      const licence = normalizeLicence(r.licence);
      if (!teamOf.has(licence)) teamOf.set(licence, team.id);
    }
  }
  const licences = [...teamOf.keys()].filter((l) => directory.has(l));
  const rankings = referenceEloDate ? await repo.rankingsAt(db, licences, referenceEloDate) : [];
  const rankingOf = new Map(rankings.map((r) => [normalizeLicence(r.licence), r]));

  const players: RosterBalancePlayer[] = licences.map((licence) => {
    const identity = directory.get(licence)!;
    const row = rankingOf.get(licence);
    return {
      licence,
      firstName: identity.firstName,
      lastName: identity.lastName,
      photoUpdatedAt: identity.photoUpdatedAt,
      // Le référentiel adhérents dit `M`/`F`, l'export Poona `H`/`F`.
      gender: row?.gender ?? (identity.gender === 'M' ? 'H' : 'F'),
      category: row?.category ?? null,
      mutation: row?.mutation ?? 'none',
      singles: row?.singles ?? null,
      doubles: row?.doubles ?? null,
      mixed: row?.mixed ?? null,
      cpphSingles: row?.cpphSingles ?? null,
      cpphDoubles: row?.cpphDoubles ?? null,
      cpphMixed: row?.cpphMixed ?? null,
      teamId: teamOf.get(licence)!
    };
  });

  return {
    championship: input.championship,
    referenceEloDate,
    teams: teams.map((t) => ({
      id: t.id,
      number: t.number,
      name: teamName(teamPrefix, t.number),
      division: t.division,
      divisionLabel: getDivision(input.championship, t.division)?.label ?? t.division
    })),
    players,
    unknown: [...teamOf.entries()].filter(([l]) => !directory.has(l)).map(([licence, teamId]) => ({ licence, teamId }))
  };
}
