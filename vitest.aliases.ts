import path from 'path';

/**
 * Alias `@nba/*` du monorepo, partagés entre `vitest.config.ts` (suite complète) et
 * `vitest.architecture.config.ts` (tests d'architecture, sans pool Workers).
 *
 * Extraits de la config racine pour que la config d'architecture n'ait pas à
 * l'évaluer : la charger instanciait les 30 projets et les 11 plugins
 * `cloudflareTest()` — un boot complet du pool Workers pour quatre fichiers node.
 *
 * Ce fichier est hors du graphe d'imports des tests : il figure dans les
 * `forceRerunTriggers` de la config racine, comme les configs elles-mêmes.
 */
export const workspaceAliases: Record<string, string> = {
  'astro:transitions/client': path.resolve(__dirname, './libs/shared/ui/src/mocks/astro-transitions.ts'),
  '@nba/db/test-utils': path.resolve(__dirname, './libs/shared/db/src/test-utils.ts'),
  '@nba/db': path.resolve(__dirname, './libs/shared/db/src/index.ts'),
  '@nba/pdf': path.resolve(__dirname, './libs/shared/pdf/src/index.ts'),
  '@nba/push': path.resolve(__dirname, './libs/shared/push/src/index.ts'),
  '@nba/html': path.resolve(__dirname, './libs/shared/html/src/index.ts'),
  '@nba/preview': path.resolve(__dirname, './libs/shared/preview/src/index.ts'),
  '@nba/ui': path.resolve(__dirname, './libs/shared/ui/src/index.ts'),
  '@nba/api-client': path.resolve(__dirname, './libs/shared/api-client/src/index.ts'),
  '@nba/security-headers': path.resolve(__dirname, './libs/shared/security-headers/src/index.ts'),
  '@nba/runtime-env': path.resolve(__dirname, './libs/shared/runtime-env/src/index.ts'),
  '@nba/members-api': path.resolve(__dirname, './libs/domains/members/index.ts'),
  '@nba/members/schema': path.resolve(__dirname, './libs/domains/members/shared/schema.ts'),
  '@nba/members/test-fixtures': path.resolve(__dirname, './libs/domains/members/shared/test-fixtures.ts'),
  '@nba/members-ui': path.resolve(__dirname, './libs/domains/members/shared/ui.ts'),
  '@nba/accounting-api': path.resolve(__dirname, './libs/domains/accounting/index.ts'),
  '@nba/accounting/schema': path.resolve(__dirname, './libs/domains/accounting/shared/schema.ts'),
  '@nba/accounting-ui': path.resolve(__dirname, './libs/domains/accounting/shared/ui.ts'),
  '@nba/notifications-api': path.resolve(__dirname, './libs/domains/notifications/index.ts'),
  '@nba/notifications/schema': path.resolve(__dirname, './libs/domains/notifications/shared/schema.ts'),
  '@nba/iam': path.resolve(__dirname, './libs/domains/iam/index.ts'),
  '@nba/iam/schema': path.resolve(__dirname, './libs/domains/iam/shared/schema.ts'),
  '@nba/iam-ui': path.resolve(__dirname, './libs/domains/iam/shared/ui.ts'),
  '@nba/expenses-api': path.resolve(__dirname, './libs/domains/expenses/index.ts'),
  '@nba/expenses/schema': path.resolve(__dirname, './libs/domains/expenses/shared/schema.ts'),
  '@nba/expenses-ui': path.resolve(__dirname, './libs/domains/expenses/shared/ui.ts'),
  '@nba/shop-api': path.resolve(__dirname, './libs/domains/shop/index.ts'),
  '@nba/shop/schema': path.resolve(__dirname, './libs/domains/shop/shared/schema.ts'),
  '@nba/shop-ui': path.resolve(__dirname, './libs/domains/shop/shared/ui.ts'),
  '@nba/notifications-ui': path.resolve(__dirname, './libs/domains/notifications/shared/ui.ts'),
  '@nba/cms-api': path.resolve(__dirname, './libs/domains/cms/index.ts'),
  '@nba/cms/public': path.resolve(__dirname, './libs/domains/cms/shared/public.ts'),
  '@nba/cms-ui': path.resolve(__dirname, './libs/domains/cms/shared/ui.ts'),
  '@nba/schedules-api': path.resolve(__dirname, './libs/domains/schedules/index.ts'),
  '@nba/schedules/schema': path.resolve(__dirname, './libs/domains/schedules/shared/schema.ts'),
  '@nba/events-api': path.resolve(__dirname, './libs/domains/events/index.ts'),
  '@nba/club/settings': path.resolve(__dirname, 'libs/domains/club/shared/settings-api.ts'),
  '@nba/club/context': path.resolve(__dirname, 'libs/domains/club/shared/context.ts'),
  '@nba/club/schema': path.resolve(__dirname, 'libs/domains/club/shared/schema.ts'),
  '@nba/club-ui': path.resolve(__dirname, 'libs/domains/club/shared/ui.ts'),
  '@nba/club': path.resolve(__dirname, 'libs/domains/club/index.ts'),
  '@nba/schedules-ui': path.resolve(__dirname, './libs/domains/schedules/shared/ui.ts'),
  '@nba/events-ui': path.resolve(__dirname, './libs/domains/events/shared/ui.ts'),
  '@nba/cms/schema': path.resolve(__dirname, './libs/domains/cms/shared/schema.ts'),
  '@nba/teams-api': path.resolve(__dirname, './libs/domains/teams/index.ts'),
  '@nba/teams/schema': path.resolve(__dirname, './libs/domains/teams/shared/schema.ts'),
  '@nba/teams-ui': path.resolve(__dirname, './libs/domains/teams/shared/ui.ts'),
};
