import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

export function buildMembersDashboardStatsStmt(db: D1Database, seasonId: number, prevSeasonId: number | null): D1PreparedStatement {
  return db.prepare(`
    SELECT
      SUM(CASE WHEN season_id = ? THEN 1 ELSE 0 END) as currentTotal,
      SUM(CASE WHEN season_id = ? THEN 1 ELSE 0 END) as previousTotal,
      SUM(CASE WHEN season_id = ? AND amount_received_cents > 0 AND amount_remaining_cents > 0 THEN 1 ELSE 0 END) as partiallyPaid,
      SUM(CASE WHEN season_id = ? AND amount_remaining_cents > 0 THEN 1 ELSE 0 END) as unpaidCount
    FROM members
    WHERE season_id IN (?, ?)
  `).bind(seasonId, prevSeasonId, seasonId, seasonId, prevSeasonId);
}
