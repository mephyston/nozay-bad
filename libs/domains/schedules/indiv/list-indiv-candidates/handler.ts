import { type Db } from '@nba/db';
import { sessionEndTime, slotWindows } from '../../shared/indiv';
import { seasonCodeForDate, seasonDateRange } from '../../shared/season';
import { IndivSessionNotFoundError } from '../../shared/errors';
import { ListIndivCandidatesRepository } from './repository';
import type { ListIndivCandidatesInput, ListIndivCandidatesOutput } from './dto';

/**
 * Qui demande, nom par nom, et ce que la saison dit de chacun.
 *
 * C'est la seule lecture nominative des indiv, et elle n'est **pas** ouverte aux appelants
 * de service : l'espace adhérent reçoit un compte et sa propre situation, jamais la liste.
 * Les statistiques d'équité — combien de fois retenu, quand pour la dernière fois — sont
 * lues en une requête agrégée sur la saison de la soirée, par licence.
 */
export async function listIndivCandidates(
  db: Db,
  input: ListIndivCandidatesInput
): Promise<ListIndivCandidatesOutput> {
  const repo = new ListIndivCandidatesRepository();

  const session = await repo.findSession(db, input.sessionId);
  if (!session) throw new IndivSessionNotFoundError();

  const range = seasonDateRange(seasonCodeForDate(session.date));
  const [rows, venueName, stats] = await Promise.all([
    repo.requestsOf(db, session.id),
    repo.venueName(db, session.venueId),
    repo.seasonStats(db, range)
  ]);

  return {
    session: { ...session, venueName, endTime: sessionEndTime(session), slots: slotWindows(session) },
    candidates: rows.map((row) => {
      const stat = stats.get(row.licence) ?? { requests: 0, selected: 0, lastSelectedDate: null };
      return {
        requestId: row.id,
        memberId: row.memberId,
        licence: row.licence,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        memberGroup: row.memberGroup,
        preferredSlot: row.preferredSlot,
        note: row.note,
        selectedSlot: row.selectedSlot,
        requestedAt: Math.floor(row.createdAt.getTime() / 1000),
        requestCount: stat.requests,
        selectedCount: stat.selected,
        lastSelectedDate: stat.lastSelectedDate
      };
    })
  };
}
