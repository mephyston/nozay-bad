import { Hono } from 'hono';
import { importRankingsRoute } from './import-rankings/route';
import { listRankingsRoute } from './list-rankings/route';
import { saveRankingRoute } from './save-ranking/route';
import { listChampionshipSettingsRoute } from './list-championship-settings/route';
import { saveChampionshipSettingsRoute } from './save-championship-settings/route';
import { listChampionshipDaysRoute } from './list-championship-days/route';
import { saveChampionshipDaysRoute } from './save-championship-days/route';
import { listTeamsRoute } from './list-teams/route';
import { saveTeamRoute } from './save-team/route';
import { getTeamRoute } from './get-team/route';
import { getPlayerCardRoute } from './get-player-card/route';
import { listClubPlayersRoute } from './list-club-players/route';
import { deleteTeamRoute } from './delete-team/route';
import { saveTeamStaffRoute } from './save-team-staff/route';
import { saveTeamRosterRoute } from './save-team-roster/route';
import { saveFixtureRoute } from './save-fixture/route';
import { listDayValuesRoute } from './list-day-values/route';
import { getLineupRoute } from './get-lineup/route';
import { saveLineupRoute } from './save-lineup/route';
import { saveFixtureDateRoute } from './save-fixture-date/route';
import { notifyCaptainRoute } from './notify-captain/route';
import { listMyFixturesRoute } from './list-my-fixtures/route';

export type Bindings = {
  DB: D1Database;
};

export const teamsRouter = new Hono<{ Bindings: Bindings }>();

// L'ordre compte : toutes les routes littérales (`/rankings`, `/days`,
// `/championship-settings`) doivent précéder `/:id`, qui les capturerait sinon et lirait
// « rankings » comme un identifiant d'équipe.
teamsRouter.route('/', importRankingsRoute);
teamsRouter.route('/', listRankingsRoute);
teamsRouter.route('/', saveRankingRoute);
teamsRouter.route('/', listChampionshipSettingsRoute);
teamsRouter.route('/', saveChampionshipSettingsRoute);
teamsRouter.route('/', listChampionshipDaysRoute);
teamsRouter.route('/', saveChampionshipDaysRoute);
teamsRouter.route('/', listMyFixturesRoute);
teamsRouter.route('/', listTeamsRoute);
teamsRouter.route('/', saveTeamRoute);
teamsRouter.route('/', saveTeamStaffRoute);
teamsRouter.route('/', saveTeamRosterRoute);
teamsRouter.route('/', saveFixtureRoute);
teamsRouter.route('/', listDayValuesRoute);
teamsRouter.route('/', getLineupRoute);
teamsRouter.route('/', saveLineupRoute);
teamsRouter.route('/', saveFixtureDateRoute);
teamsRouter.route('/', notifyCaptainRoute);
// `/players/:licence` avant `/:id` : deux segments, mais on garde l'usage du domaine
// — les routes qui portent un littéral passent devant le paramètre nu. `/players` nu
// ne recouvre ni l'un ni l'autre : un segment de moins que la fiche, un littéral de
// plus que `/:id`.
teamsRouter.route('/', listClubPlayersRoute);
teamsRouter.route('/', getPlayerCardRoute);
teamsRouter.route('/', getTeamRoute);
teamsRouter.route('/', deleteTeamRoute);

// ── API publique du domaine ──────────────────────────────────────────────────
export { importRankings } from './import-rankings/handler';
export { listRankings } from './list-rankings/handler';
export { listClubPlayers } from './list-club-players/handler';
export { saveRanking } from './save-ranking/handler';
export { listChampionshipSettings } from './list-championship-settings/handler';
export { saveChampionshipSettings } from './save-championship-settings/handler';
export { listChampionshipDays } from './list-championship-days/handler';
export { saveChampionshipDays } from './save-championship-days/handler';
export { listTeams } from './list-teams/handler';
export { getTeam } from './get-team/handler';
export { saveTeam } from './save-team/handler';
export { deleteTeam } from './delete-team/handler';
export { saveTeamStaff } from './save-team-staff/handler';
export { saveTeamRoster } from './save-team-roster/handler';
export { saveFixture } from './save-fixture/handler';
export { listDayValues } from './list-day-values/handler';
export { loadLineup } from './get-lineup/handler';
export { saveLineup } from './save-lineup/handler';
export { saveFixtureDate } from './save-fixture-date/handler';
export { notifyCaptain } from './notify-captain/handler';
export { listMyFixtures } from './list-my-fixtures/handler';
export { notifyLineup } from './notify-lineup/handler';

export type { ImportRankingsInput, ImportRankingsOutput, UnmatchedCompetitor } from './import-rankings/dto';
export type { ListRankingsInput, ListRankingsOutput, RankingListItem, RankingDateSummary } from './list-rankings/dto';
export type { SaveRankingInput, SaveRankingOutput } from './save-ranking/dto';
export type { ListChampionshipSettingsOutput, ChampionshipSettingsItem } from './list-championship-settings/dto';
export type { SaveChampionshipSettingsInput } from './save-championship-settings/dto';
export type { ListTeamsOutput, TeamListItem, TeamViewerRole } from './list-teams/dto';
export type { GetTeamOutput, RosterPlayer } from './get-team/dto';
export type { ListClubPlayersOutput, ClubPlayer } from './list-club-players/dto';
export type { SaveTeamInput } from './save-team/dto';
export type { SaveTeamStaffInput } from './save-team-staff/dto';
export type { SaveTeamRosterInput, SaveTeamRosterOutput } from './save-team-roster/dto';
export type { ListChampionshipDaysOutput, ChampionshipDayItem } from './list-championship-days/dto';
export type { SaveChampionshipDaysInput, ChampionshipDayInput } from './save-championship-days/dto';
export type { SaveFixtureInput } from './save-fixture/dto';
export type { GetLineupOutput, LineupSlotView, LineupCandidate } from './get-lineup/dto';
export type { ListDayValuesOutput, DayTeamValue, DuplicatePlayer } from './list-day-values/dto';
export type { SaveLineupInput, SaveLineupSlot } from './save-lineup/dto';
export type { SaveFixtureDateInput, SaveFixtureDateOutput } from './save-fixture-date/dto';
export type { NotifyCaptainInput, NotifyCaptainOutput } from './notify-captain/dto';
export type { ListMyFixturesInput, ListMyFixturesOutput, MyFixture } from './list-my-fixtures/dto';
export type { NotifyLineupInput, NotifyLineupOutput } from './notify-lineup/dto';
// Rappels programmés et constat automatique de valeur : consommés par le cron du
// Worker API (`apps/api/src/scheduled.ts`) et par `save-lineup`.
export { findRankingReminderDays } from './remind-rankings/handler';
export type { RankingReminderDay } from './remind-rankings/dto';
export { remindMissingLineups } from './remind-lineups/handler';
export type { RemindLineupsInput, RemindLineupsOutput } from './remind-lineups/dto';
export { notifyValueOverflow } from './notify-value-overflow/handler';
export type { NotifyValueOverflowInput, NotifyValueOverflowOutput } from './notify-value-overflow/dto';
export { checkLineup, type LineupIssue, type LineupVerdict } from './shared/lineup-rules';

export { checkEligibility, describeEligibility, eligibleDisciplines } from './shared/eligibility';
export { mondayOf, sundayOf, isSameWeek, weeklyExclusionGroup } from './shared/week';
export { loadPlayerDirectory, identityOf, type PlayerIdentity } from './shared/members-lookup';

export {
  CHAMPIONSHIPS,
  CHAMPIONSHIP_LABELS,
  CHAMPIONSHIP_RULES,
  getChampionship,
  getDivision,
  teamName,
  type Championship,
  type ChampionshipRules,
  type DivisionRules,
  type MatchSlot
} from './shared/championship';

export {
  RANKINGS,
  DISCIPLINES,
  DISCIPLINE_LABELS,
  DISCIPLINE_RANKING,
  categoryFamily,
  normalizeLicence,
  veteranLevel,
  type Ranking,
  type Discipline,
  type Mutation
} from './shared/ranking';

export { computeTeamValue, formatValue, type TeamValue, type LineupEntry } from './shared/team-value';
export { CD91_SCALE, FFBAD_SCALE, cd91Points, ffbadPoints } from './shared/scales';
export {
  resolveReferenceDate,
  pickRankingsAt,
  thursdayBefore,
  type ReferenceDate,
  type ChampionshipDay
} from './shared/ranking-resolution';
export type { PlayerRanking } from './shared/player';
export type * from './shared/schema';
