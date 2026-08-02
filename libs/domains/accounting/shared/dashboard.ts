import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

export function buildAccountingDashboardStatsStmts(db: D1Database, seasonId: number): D1PreparedStatement[] {
  return [
    db.prepare("SELECT COUNT(*) as count FROM checks WHERE status = 'received' AND season_id = ?").bind(seasonId),
    db.prepare("SELECT COUNT(*) as count FROM check_deposits WHERE status = 'pending' AND season_id = ?").bind(seasonId),
    db.prepare("SELECT COUNT(*) as count FROM invoices WHERE status IN ('draft', 'sent') AND season_id = ?").bind(seasonId),
    db.prepare(`
      SELECT c.admin_label as label, le.type, SUM(le.amount_cents) as total
      FROM ledger_entries le
      JOIN categories c ON le.category_id = c.id
      WHERE le.season_id = ?
      GROUP BY c.admin_label, le.type
    `).bind(seasonId)
  ];
}
