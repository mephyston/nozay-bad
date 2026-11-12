import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

export function buildAccountingDashboardStatsStmts(db: D1Database, seasonId: number): D1PreparedStatement[] {
  return [
    db.prepare("SELECT COUNT(*) as count FROM checks WHERE status = 'received' AND season_id = ?").bind(seasonId),
    db.prepare("SELECT COUNT(*) as count FROM check_deposits WHERE status = 'pending' AND season_id = ?").bind(seasonId),
    db.prepare("SELECT COUNT(*) as count FROM invoices WHERE status IN ('draft', 'sent') AND season_id = ?").bind(seasonId),
    /*
     * Les pôles : chaque catégorie porte le sien (`categories.pole_id`), rangé par le bureau
     * à l'écran de configuration. Une catégorie sans pôle n'entre dans aucun bilan.
     */
    db.prepare(`
      SELECT g.id AS poleId, g.label AS poleLabel, g.position AS position,
        c.admin_label AS label, le.type AS type, SUM(le.amount_cents) AS total
      FROM category_groups g
      LEFT JOIN categories c ON c.pole_id = g.id
      LEFT JOIN ledger_entries le ON le.category_id = c.id AND le.season_id = ? AND le.type IN ('recette', 'depense')
      WHERE g.kind = 'pole'
      GROUP BY g.id, c.id, le.type
      ORDER BY g.position, g.label
    `).bind(seasonId)
  ];
}
