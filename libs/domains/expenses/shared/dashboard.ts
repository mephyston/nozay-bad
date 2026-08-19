import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

export function buildExpensesDashboardStatsStmt(db: D1Database, seasonId: number): D1PreparedStatement {
  return db.prepare("SELECT COUNT(*) as count FROM expenses WHERE status = 'pending' AND season_id = ?").bind(seasonId);
}
