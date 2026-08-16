// @ts-ignore
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';

export async function setupMockDb() {
  const rawDb = env.DB;

  // Topological sorting of tables (child tables dropped/deleted before parent tables to avoid foreign key errors)
  const tables = [
    'role_permission_log',
    'role_permissions',
    'admin_user_roles',
    'admin_users',
    'attestation_config',
    // CMS du site public. Enfants avant parents, comme le reste de la liste : une
    // table oubliée ici ne casse rien tout de suite, elle laisse fuiter des lignes
    // d'un test à l'autre — ce qui se lit comme de l'instabilité, pas comme un bug.
    'cms_media_variants',
    'cms_page_blocks',
    'cms_page_revisions',
    'cms_post_category_links',
    'cms_nav_items',
    'cms_posts',
    'cms_pages',
    'cms_post_categories',
    'cms_media',
    'cms_redirects',
    'cms_content_version',
    'cms_site_settings',
    // Créneaux et agenda : enfants avant parents, comme le reste de la liste.
    'schedule_slots',
    'club_event_registrations',
    'club_events',
    'venues',
    // Interclubs : enfants avant parents. `lineup_slots` dépend de `team_fixtures`,
    // qui dépend de `club_teams` et de `championship_days`.
    'lineup_slots',
    'team_fixtures',
    'team_staff',
    'team_roster',
    'club_teams',
    'championship_days',
    'championship_settings',
    'ranking_imports',
    'player_rankings',
    'push_deliveries',
    'push_messages',
    'push_preferences',
    'push_subscriptions',
    'expenses',
    'ledger_entries',
    'orders',
    'checks',
    'invoice_items',
    'invoices',
    'check_deposits',
    'bank_statement_lines',
    'orders',
    'products',
    'product_categories',
    'members',
    'season_balances',
    'season_category_budgets',
    'categories',
    'users',
    'seasons',
    'payment_methods',
    'accounts',
    'account_classes'
  ];



  // Disable foreign keys temporarily during drop to avoid constraint violations
  await rawDb.prepare('PRAGMA foreign_keys = OFF;').run();
  for (const table of tables) {
    try { await rawDb.prepare(`DELETE FROM "${table}";`).run(); } catch {}
  }
  for (const table of tables) {
    await rawDb.prepare(`DROP TABLE IF EXISTS "${table}";`).run();
  }
  await rawDb.prepare('PRAGMA foreign_keys = ON;').run();

  // Load migrations sequentially using Vite's static raw glob import (loaded at build time)
  const migrationFiles = import.meta.glob('../../db/migrations/*.sql', { query: '?raw', import: 'default', eager: true });
  const sortedFiles = Object.keys(migrationFiles).sort();

  for (const file of sortedFiles) {
    const sqlContent = migrationFiles[file] as string;
    let statements: string[];
    if (sqlContent.includes('--> statement-breakpoint')) {
      statements = sqlContent.split('--> statement-breakpoint');
    } else {
      statements = sqlContent.split(';');
    }
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed.length > 0) {
        await rawDb.prepare(trimmed).run();
      }
    }
  }

  return { mockD1: rawDb, db: drizzle(rawDb) };
}
