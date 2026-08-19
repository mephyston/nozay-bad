import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

/**
 * Commandes qui réclament encore une action du bureau : à valider, ou validées et
 * en attente de règlement.
 */
export function buildShopDashboardStatsStmt(db: D1Database, seasonId: number): D1PreparedStatement {
  return db.prepare(
    "SELECT COUNT(*) as count FROM orders WHERE status IN ('created', 'awaiting_payment') AND season_id = ?"
  ).bind(seasonId);
}
