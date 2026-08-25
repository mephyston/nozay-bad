// @ts-ignore
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';

// Topological sorting of tables (child tables dropped before parent tables to avoid foreign key errors)
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
    // Jeu libre : les invités pendent des inscriptions, qui pendent des séances, qui
    // pendent des gymnases et des créneaux — d'où cet ordre-là exactement.
    'open_play_guests',
    'open_play_registrations',
    'open_play_sessions',
    // Sans clé étrangère, mais rangée avec les siennes : c'est la liste des ouvreurs.
    'open_play_openers',
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
    // `checks` avant `ledger_entries` : c'est lui l'enfant (`check_deposit_id`,
    // `season_id`, `ledger_entry_id`). L'ordre inverse ne cassait que le jour où un
    // chèque pointait réellement une écriture — le `PRAGMA foreign_keys = OFF` ne
    // survit pas au batch qui suit, et la purge échouait alors dans le `beforeEach`
    // du test *suivant*, loin de sa cause.
    'checks',
    'ledger_entries',
    'orders',
    'invoice_items',
    'invoices',
    'check_deposits',
    'bank_statement_lines',
    // Le solde arrêté par la banque : enfant d'`accounts`, comme les lignes de relevé.
    'bank_statement_balances',
    'products',
    'product_categories',
    // Sans FK vers `persons` (attribution par licence), mais fonctionnellement enfant.
    'member_club_functions',
    // L'adhésion avant la personne : c'est elle qui porte la clé étrangère.
    'memberships',
    'persons',
    'season_balances',
    'season_category_budgets',
    'categories',
    'users',
    'seasons',
    'payment_methods',
    'accounts',
    'account_classes'
  ];

// Migrations parsées UNE FOIS au chargement du module (le glob raw est déjà résolu au
// build par Vite). Chaque fichier est découpé sur `--> statement-breakpoint` (format
// drizzle) ou, à défaut, sur `;`.
const migrationFiles = import.meta.glob('../../db/migrations/*.sql', { query: '?raw', import: 'default', eager: true });
const MIGRATION_STATEMENTS: string[] = Object.keys(migrationFiles)
  .sort()
  .flatMap((file) => {
    const sqlContent = migrationFiles[file] as string;
    const statements = sqlContent.includes('--> statement-breakpoint')
      ? sqlContent.split('--> statement-breakpoint')
      : sqlContent.split(';');
    return statements.map((s) => s.trim()).filter((s) => s.length > 0);
  });

/**
 * Base D1 propre : tables supprimées puis toutes les migrations rejouées.
 *
 * Tout part en `batch()` — un batch D1 est un unique aller-retour, là où la version
 * précédente faisait ~290 `prepare().run()` séquentiels par appel (DELETE + DROP +
 * chaque statement de migration). Sur un runner GitHub, c'était le poste dominant de
 * la CI : des tests à 30 ms en local y dépassaient les 5 s.
 *
 * Les `PRAGMA foreign_keys` restent hors batch : un batch D1 est une transaction
 * implicite, et SQLite ignore silencieusement ce pragma en transaction. Les DELETE
 * préalables ont disparu : sous `foreign_keys = OFF`, les DROP suffisent.
 */
export async function setupMockDb() {
  const rawDb = env.DB;

  await rawDb.prepare('PRAGMA foreign_keys = OFF;').run();
  await rawDb.batch(tables.map((table) => rawDb.prepare(`DROP TABLE IF EXISTS "${table}";`)));
  await rawDb.prepare('PRAGMA foreign_keys = ON;').run();

  await rawDb.batch(MIGRATION_STATEMENTS.map((stmt) => rawDb.prepare(stmt)));

  return { mockD1: rawDb, db: drizzle(rawDb) };
}
