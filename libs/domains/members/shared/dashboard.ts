import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

/**
 * Compteurs d'**adhésions** de la saison, et non de personnes : les montants et l'état de
 * règlement appartiennent à l'adhésion. Le delta avec la saison précédente compare donc
 * deux effectifs annuels — il ne dit ni le taux de renouvellement ni l'arrivée de nouveaux
 * licenciés, ce que `persons` permettrait désormais de mesurer.
 */
export function buildMembersDashboardStatsStmt(db: D1Database, seasonId: number, prevSeasonId: number | null): D1PreparedStatement {
  return db.prepare(`
    SELECT
      SUM(CASE WHEN season_id = ? THEN 1 ELSE 0 END) as currentTotal,
      SUM(CASE WHEN season_id = ? THEN 1 ELSE 0 END) as previousTotal,
      SUM(CASE WHEN season_id = ? AND amount_received_cents > 0 AND amount_remaining_cents > 0 THEN 1 ELSE 0 END) as partiallyPaid,
      SUM(CASE WHEN season_id = ? AND amount_remaining_cents > 0 THEN 1 ELSE 0 END) as unpaidCount
    FROM memberships
    WHERE season_id IN (?, ?)
  `).bind(seasonId, prevSeasonId, seasonId, seasonId, seasonId, prevSeasonId);
}
