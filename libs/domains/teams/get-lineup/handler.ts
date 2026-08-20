import { type DbOrTx } from '@nba/db';
import { CHAMPIONSHIP_RULES, getDivision, teamName } from '../shared/championship';
import { loadPlayerDirectory } from '../shared/members-lookup';
import { normalizeLicence, isDouble, DISCIPLINE_RANKING } from '../shared/ranking';
import { pickRankingsAt, resolveReferenceDate } from '../shared/ranking-resolution';
import { mondayOf } from '../shared/week';
import { checkLineup, type LineupIssue } from '../shared/lineup-rules';
import { computeTeamValue, lineLabel, type LineupEntry } from '../shared/team-value';
import { eligibleDisciplines, isEligibleByCategory } from '../shared/eligibility';
import type { PlayerRanking } from '../shared/player';
import {
  ChampionshipDayNotFoundError,
  TeamNotFoundError,
  UnknownChampionshipError
} from '../shared/errors';
import { memo, type QueryCache } from '../shared/query-cache';
import { GetLineupRepository } from './repository';
import type { GetLineupOutput, LineupCandidate, LineupSlotView } from './dto';
import type { ClubTeamRow, LineupSlotRow } from '../shared/schema';

const repo = new GetLineupRepository();

/** Une paire `(discipline, position)` avec ses licences, telle que l'écran la soumet. */
export interface SubmittedSlot {
  discipline: LineupSlotRow['discipline'];
  position: number;
  licence1: string;
  licence2?: string | null;
}

function toPlayer(row: {
  licence: string; lastName: string; firstName: string; gender: 'H' | 'F';
  category: string | null; mutation: PlayerRanking['mutation'];
  singles: PlayerRanking['singles']; doubles: PlayerRanking['doubles']; mixed: PlayerRanking['mixed'];
  cpphSingles: number | null; cpphDoubles: number | null; cpphMixed: number | null;
}): PlayerRanking {
  return { ...row };
}

/**
 * Rassemble tout ce qu'il faut pour juger une composition.
 *
 * Deux lectures différentes du calendrier s'y croisent, et les confondre serait faux :
 * la **hiérarchie des valeurs** se compare à *journée* égale, la règle **« un joueur, une
 * seule équipe »** sur la *semaine* réellement jouée. Un report sépare les deux.
 */
export async function loadLineup(
  db: DbOrTx,
  input: { teamId: number; dayNumber: number; slot?: number; viewerLicence?: string | null; override?: SubmittedSlot[] },
  /**
   * Déduplication des lectures qui ne dépendent pas de l'équipe (annuaire, classements,
   * historique, journée, date de référence). Optionnel : sans lui le comportement est
   * inchangé. `listDayValues` en passe un, partagé par les six équipes qu'il charge.
   */
  cache?: QueryCache
): Promise<GetLineupOutput> {
  const team = await memo(cache, `team:${input.teamId}`, () => repo.findTeam(db, input.teamId));
  if (!team) throw new TeamNotFoundError();

  const rules = CHAMPIONSHIP_RULES[team.championship];
  const division = getDivision(team.championship, team.division);
  if (!division) throw new UnknownChampionshipError();

  const day = await memo(cache, `day:${team.seasonCode}:${team.championship}:${input.dayNumber}`, () =>
    repo.findDay(db, team, input.dayNumber)
  );
  if (!day) throw new ChampionshipDayNotFoundError();

  const fixtureSlot = input.slot ?? 1;
  const fixture = await repo.findFixture(db, team.id, day.id, fixtureSlot);

  const [staff, rosterLicences, directory, settingsDate] = await Promise.all([
    repo.staffLicences(db, team.id),
    repo.rosterLicences(db, team.id),
    memo(cache, `directory:${team.seasonCode}`, () => loadPlayerDirectory(db, team.seasonCode)),
    memo(cache, `eloDate:${team.seasonCode}:${team.championship}`, () =>
      repo.referenceEloDate(db, team)
    )
  ]);

  const reference = resolveReferenceDate(
    rules,
    { referenceEloDate: settingsDate },
    { number: day.number, weekStart: day.weekStart, referenceEloDate: day.referenceEloDate }
  );

  const rankingRows = reference.date
    ? await memo(cache, `rankings:${reference.date}`, () => repo.rankingsUpTo(db, reference.date!))
    : [];
  const byLicence = pickRankingsAt(rankingRows, reference.date);

  /** Le classement d'une licence, ou un profil sans classement — jamais rien. */
  const playerFor = (licence: string): PlayerRanking => {
    const row = byLicence.get(licence);
    if (row) return toPlayer(row);
    const identity = directory.get(licence);
    return {
      licence,
      lastName: identity?.lastName ?? 'Licence inconnue',
      firstName: identity?.firstName ?? '',
      gender: identity?.gender === 'F' ? 'F' : 'H',
      category: null,
      mutation: 'none',
      singles: null, doubles: null, mixed: null,
      cpphSingles: null, cpphDoubles: null, cpphMixed: null
    };
  };

  /** L'équipe immédiatement supérieure et sa valeur, à journée égale. */
  const loadUpperTeamValue = async (): Promise<{ team: ClubTeamRow | null; value: number | null }> => {
    // Liste mémoïsée sans exclusion : le filtre `number < team.number` écarte de toute
    // façon l'équipe elle-même, et une clé sans `teamId` se partage entre les six.
    const siblings = await memo(cache, `champTeams:${team.seasonCode}:${team.championship}`, () =>
      repo.championshipTeams(db, team.seasonCode, team.championship)
    );
    const upper = siblings
      .filter((sib) => sib.number < team.number)
      .sort((a, b) => b.number - a.number)[0];
    if (!upper) return { team: null, value: null };

    const upperFixtures = await memo(cache, `fixturesOnDay:${upper.id}:${day.id}`, () =>
      repo.fixturesOnDay(db, [upper.id], day.id)
    );
    const upperSlots = await repo.slotsForFixtures(db, upperFixtures.map((f) => f.id));
    const upperDivision = getDivision(upper.championship, upper.division);
    if (!upperDivision || upperSlots.length === 0) return { team: upper, value: null };

    const upperEntries: LineupEntry[] = upperSlots.map((sl) => ({
      discipline: sl.discipline,
      position: sl.position,
      players: [playerFor(sl.licence1), ...(sl.licence2 ? [playerFor(sl.licence2)] : [])]
    }));
    return { team: upper, value: computeTeamValue(rules, upperDivision.format, upperEntries).value };
  };

  /** Qui est déjà pris cette semaine, et par quelle équipe. */
  const loadWeekOccupancy = async (): Promise<Map<string, string>> => {
    const weekFixtures = await repo.fixturesInWeek(db, team, day.weekStart, fixture?.id ?? null);
    const weekSlots = await repo.slotsForFixtures(db, weekFixtures.map((w) => w.fixture.id));
    const busy = new Map<string, string>();
    for (const sl of weekSlots) {
      const owner = weekFixtures.find((w) => w.fixture.id === sl.fixtureId);
      if (!owner) continue;
      busy.set(sl.licence1, teamName(owner.team.number));
      if (sl.licence2) busy.set(sl.licence2, teamName(owner.team.number));
    }
    return busy;
  };

  /*
   * Trois lectures indépendantes, menées de front.
   *
   * La composition, la valeur de l'équipe supérieure et l'occupation de la semaine ne
   * dépendent que de `fixture` et de `day`, jamais l'une de l'autre — mais elles
   * s'enchaînaient en série, portant la profondeur de la chaîne à neuf allers-retours
   * par équipe. Mesuré sur `/teams/day-values` : 284 ms de temps total pour 32 ms de
   * calcul, autrement dit neuf dixièmes du temps passés à *attendre* la base.
   *
   * Les six équipes tournant déjà de front, c'est cette profondeur — et non le nombre
   * total de requêtes — qui fixe désormais le temps de réponse.
   */
  const [storedSlots, upperResult, weekOccupancy] = await Promise.all([
    fixture ? repo.listSlots(db, fixture.id) : Promise.resolve([] as LineupSlotRow[]),
    loadUpperTeamValue(),
    loadWeekOccupancy()
  ]);

  const submitted: SubmittedSlot[] =
    input.override ??
    storedSlots.map((s) => ({
      discipline: s.discipline,
      position: s.position,
      licence1: s.licence1,
      licence2: s.licence2
    }));

  const entries: LineupEntry[] = submitted
    .filter((s) => s.licence1)
    .map((s) => ({
      discipline: s.discipline,
      position: s.position,
      players: [playerFor(normalizeLicence(s.licence1)), ...(s.licence2 ? [playerFor(normalizeLicence(s.licence2))] : [])]
    }));

  // Nommés pour la suite du calcul, qui les attend sous ces noms.
  const upper = upperResult.team;
  const upperTeamValue = upperResult.value;
  const busyThisWeek = weekOccupancy;

  // Les règles d'historique regardent la saison **avant** cette journée.
  const history = await memo(cache, `history:${team.seasonCode}:${day.weekStart}`, () =>
    repo.playerHistory(db, team.seasonCode, day.weekStart)
  );

  const verdict = checkLineup({
    rules,
    division,
    entries,
    teamNumber: team.number,
    history,
    upperTeamValue,
    upperTeamName: upper ? teamName(upper.number) : null,
    busyThisWeek
  });

  // ── Vue des lignes, format en main ──
  const byKey = new Map(submitted.map((s) => [`${s.discipline}${s.position}`, s]));
  const lineByKey = new Map(verdict.value.lines.map((l) => [`${l.discipline}${l.position}`, l]));

  const slots: LineupSlotView[] = division.format.map((slot) => {
    const key = `${slot.discipline}${slot.position}`;
    const s = byKey.get(key);
    const line = lineByKey.get(key);
    return {
      discipline: slot.discipline,
      position: slot.position,
      label: lineLabel(division.format, slot.discipline, slot.position),
      double: isDouble(slot.discipline),
      licence1: s?.licence1 ?? null,
      licence2: s?.licence2 ?? null,
      rankings: line?.rankings ?? '—',
      points: line?.points ?? null
    };
  });

  /*
   * ── Candidats : l'effectif déclaré de l'équipe, et lui seul ──
   *
   * La liste partait auparavant de l'annuaire de la saison entière — près de trois cents
   * personnes — l'effectif n'étant qu'un critère de tri. Un capitaine y cherchait ses
   * joueurs parmi tout le club. L'effectif est la déclaration qui fait foi : aligner
   * quelqu'un qui n'y figure pas suppose de l'y ajouter d'abord, ce qui est un acte
   * délibéré et tracé.
   */
  const rosterSet = new Set(rosterLicences.map(normalizeLicence));
  const candidates: LineupCandidate[] = [...rosterSet]
    .map((licence) => {
      const identity = directory.get(licence);
      const player = playerFor(licence);
      const busy = busyThisWeek.get(licence);

      /*
       * L'éligibilité se juge **par discipline**, jamais globalement.
       *
       * En régional, PN à R2 exigent un classement minimum *dans la discipline jouée* :
       * un joueur classé en simple mais sans classement en double est admis sur les
       * simples et refusé sur les doubles. Le modèle précédent ne transportait qu'un
       * booléen « éligible quelque part », qui se trompait dans les deux sens — il
       * proposait ce joueur en double, et aurait écarté des simples quelqu'un dont seul
       * le double était insuffisant.
       */
      const eligible = eligibleDisciplines(division.eligibility, player);
      /*
       * La catégorie compte autant que le classement.
       *
       * Sans elle, un Minibad restait proposé au capitaine, qui le choisissait et voyait
       * sa composition refusée à l'enregistrement — le motif arrivait après coup, alors
       * qu'il tenait à une donnée connue d'avance.
       */
      const categoryAdmitted = isEligibleByCategory(rules.categories, player);
      return {
        licence,
        firstName: identity?.firstName ?? '',
        lastName: identity?.lastName ?? `Licence ${licence}`,
        gender: player.gender,
        category: player.category,
        mutation: player.mutation,
        singles: player.singles,
        doubles: player.doubles,
        mixed: player.mixed,
        inRoster: true,
        eligibleDisciplines: categoryAdmitted ? eligible : [],
        // Ne portent ici que les motifs valables sur **toutes** les lignes ; le refus
        // propre à un tableau se lit dans `eligibleDisciplines`.
        unavailableReason: busy
          ? `Déjà aligné avec ${busy} cette semaine`
          : !categoryAdmitted
            ? `Catégorie ${player.category ?? 'inconnue'} non admise`
            : eligible.length === 0
              ? 'Classement hors de cette division'
              : null
      };
    })
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'fr'));

  const viewer = input.viewerLicence ? normalizeLicence(input.viewerLicence) : null;

  return {
    teamId: team.id,
    teamName: teamName(team.number),
    championship: team.championship,
    championshipLabel: rules.label,
    divisionLabel: division.label,
    dayNumber: day.number,
    dayLabel: day.label,
    weekStart: day.weekStart,
    weekEnd: day.weekEnd,
    matchDate: day.matchDate,
    playedAt: fixture?.playedAt ?? null,
    outsideTheoreticalWeek: Boolean(
      fixture?.playedAt && mondayOf(fixture.playedAt.slice(0, 10)) !== day.weekStart
    ),
    venue: fixture?.venue ?? null,
    opponent: fixture?.opponent ?? null,
    home: fixture?.home ?? true,
    status: fixture?.status ?? 'scheduled',
    slots,
    candidates,
    total: verdict.value.total,
    divisor: verdict.value.divisor,
    value: verdict.value.value,
    errors: verdict.errors as LineupIssue[],
    warnings: verdict.warnings as LineupIssue[],
    upperTeamName: upper ? teamName(upper.number) : null,
    upperTeamValue,
    referenceEloDate: reference.date,
    /*
     * Diagnostic explicite plutôt que cul-de-sac muet.
     *
     * Le régional lit les cotes d'une mise à jour propre à chaque journée
     * (`rankingPolicy: 'per_day'`). Quand aucun classement n'existe à cette date — cotes
     * non importées pour la période —, tous les joueurs sont lus comme non classés, et
     * une division à plancher les déclare tous inéligibles. Le capitaine voyait alors
     * toutes les lignes grisées sans la moindre explication.
     */
    rankingsUnavailableReason:
      reference.date === null
        ? "Aucune date de référence des classements n'est définie pour ce championnat."
        : byLicence.size === 0
          ? `Aucun classement n'est disponible à la date de référence du ${reference.date}. Les cotes de cette période n'ont pas été importées.`
          : null,
    canEdit: Boolean(viewer && (viewer === staff.captain || viewer === staff.vice)),
    captainLicence: staff.captain ?? null,
    viceCaptainLicence: staff.vice ?? null
  };
}
