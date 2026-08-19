import { defineConfig } from 'vitest/config';
import { workspaceAliases } from './vitest.aliases';

/**
 * Tests d'architecture seuls (libs/*.test.ts : frontières d'import, design system,
 * migrations, OpenAPI). Config volontairement séparée de la racine : la charger via
 * `--project architecture-tests` évaluait les 30 projets, exécutait
 * `wranglerTestConfigPath()` et instanciait 11 plugins `cloudflareTest()` — un boot
 * complet du pool Workers pour quatre fichiers qui tournent en environnement node.
 *
 * La CI l'invoque dans le job `static-checks` :
 *   npx vitest run --config vitest.architecture.config.ts
 */
export default defineConfig({
  resolve: {
    // `libs/openapi.test.ts` tire transitivement des validators aliasés @nba/*.
    alias: workspaceAliases,
  },
  test: {
    name: 'architecture-tests',
    globals: true,
    environment: 'node',
    include: ['libs/*.test.ts'],
  },
});
