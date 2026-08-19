import { type Db } from '@nba/db';
import { getMembersBySeason } from '@nba/members-api';
import { normalizeLicence } from '../shared/ranking';
import { staffContacts } from '../shared/staff-contacts';
import { findLowerTeam, findUpperTeam } from '../shared/team-hierarchy';
import { sendValueIssueNotifications } from '../shared/notify-value-issue';
import { loadLineup } from '../get-lineup/handler';
import type { ClubTeamRow } from '../shared/schema';
import type { GetLineupOutput } from '../get-lineup/dto';
import { NotifyValueOverflowRepository } from './repository';
import type { NotifyValueOverflowInput, NotifyValueOverflowOutput } from './dto';

const repo = new NotifyValueOverflowRepository();

/** Fenêtre de dédup : absorbe les re-validations d'une même soirée, pas celles du lendemain. */
const DEDUP_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Constat automatique de dépassement de valeur, déclenché à la validation d'une
 * composition (`save-lineup`). Deux directions, car le dépassement peut naître des
 * deux côtés :
 *
 *   * **montant** : la composition validée dépasse la valeur de l'équipe du dessus ;
 *   * **descendant** : la composition validée — celle du dessus — s'affaiblit au point
 *     de passer sous une composition du dessous déjà **validée**. Un brouillon du
 *     dessous ne dérange personne : il bouge encore.
 *
 * Dans les deux cas, les capitaines et vices des **deux** équipes sont prévenus
 * (`sendValueIssueNotifications`, partagé avec le constat manuel du coach).
 *
 * Jamais bloquant : la composition est déjà écrite, le constat est une information.
 * La dédup par source et par rencontre évite qu'une soirée d'ajustements ne devienne
 * une rafale de notifications.
 */
export async function notifyValueOverflow(
  db: Db,
  input: NotifyValueOverflowInput,
  now: Date = new Date()
): Promise<NotifyValueOverflowOutput> {
  const result: NotifyValueOverflowOutput = { upward: false, downward: false };

  const team = await repo.findTeam(db, input.teamId);
  if (!team) return result;

  const slot = input.slot ?? 1;
  const skipIfSentSince = new Date(now.getTime() - DEDUP_WINDOW_MS);

  const members = await getMembersBySeason(db, team.seasonCode);
  const byLicence = new Map(members.map((m) => [normalizeLicence(m.licence), m]));

  /** Le W1 de `lineup` (équipe du dessous) est avéré : notifier les deux staffs. */
  const notifyBreach = async (
    lowerTeam: ClubTeamRow,
    lowerLineup: GetLineupOutput,
    upperTeam: ClubTeamRow,
    upperLineup: GetLineupOutput
  ) => {
    const ownStaff = await staffContacts(db, byLicence, [
      lowerLineup.captainLicence,
      lowerLineup.viceCaptainLicence
    ]);
    const upperStaff = await staffContacts(db, byLicence, [
      upperLineup.captainLicence,
      upperLineup.viceCaptainLicence
    ]);
    const source = `teams:value-overflow:${lowerTeam.id}:J${lowerLineup.dayNumber}:${slot}`;
    await sendValueIssueNotifications(
      db,
      {
        team: { id: lowerTeam.id },
        lineup: lowerLineup,
        upper: { id: upperTeam.id, lineup: upperLineup },
        ownStaff,
        upperStaff,
        problems: lowerLineup.warnings.filter((i) => i.code === 'W1').map((i) => i.message),
        source,
        // Deux messages dans le même appel : la dédup jugeant par source, chacun la sienne.
        counterpartSource: `${source}:upper`,
        skipIfSentSince
      },
      now
    );
  };

  // Direction montante : la composition validée dépasse l'équipe du dessus.
  const lineup = await loadLineup(db, { teamId: team.id, dayNumber: input.dayNumber, slot });
  if (lineup.warnings.some((i) => i.code === 'W1')) {
    const upper = await findUpperTeam(db, team);
    if (upper) {
      const upperLineup = await loadLineup(db, { teamId: upper.id, dayNumber: input.dayNumber, slot });
      await notifyBreach(team, lineup, upper, upperLineup);
      result.upward = true;
    }
  }

  // Direction descendante : l'équipe du dessous, déjà validée, se retrouve au-dessus.
  const lower = await findLowerTeam(db, team);
  if (lower) {
    const dayId = await repo.findDayId(db, team.seasonCode, team.championship, input.dayNumber);
    if (dayId && (await repo.hasValidatedFixture(db, lower.id, dayId, slot))) {
      const lowerLineup = await loadLineup(db, { teamId: lower.id, dayNumber: input.dayNumber, slot });
      if (lowerLineup.warnings.some((i) => i.code === 'W1')) {
        await notifyBreach(lower, lowerLineup, team, lineup);
        result.downward = true;
      }
    }
  }

  return result;
}
