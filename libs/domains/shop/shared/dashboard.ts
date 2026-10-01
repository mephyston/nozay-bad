import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

/**
 * Commandes qui réclament encore une action du bureau : à valider, en attente de
 * règlement, ou payées et pas encore remises. Le compteur mène à la vue « En cours »
 * de l'écran des commandes, qui réunit ces trois étapes : il en donne le même compte.
 */
export function buildShopDashboardStatsStmt(db: D1Database, seasonId: number): D1PreparedStatement {
  return db.prepare(
    "SELECT COUNT(*) as count FROM orders WHERE status IN ('created', 'awaiting_payment', 'paid') AND season_id = ?"
  ).bind(seasonId);
}
