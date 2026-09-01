import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import path from 'path';
import { wranglerTestConfigPath } from './vitest.wrangler';
import { workspaceAliases } from './vitest.aliases';

// Config wrangler SANS binding AI (voir vitest.wrangler.ts) : évite la session proxy
// distante du pool → tests locaux, rapides, sans token ni charges AI.
const wranglerConfig = wranglerTestConfigPath();

export default defineConfig({
  resolve: {
    // Alias @nba/* partagés avec vitest.architecture.config.ts (cf. vitest.aliases.ts).
    alias: workspaceAliases,
  },
  test: {
    // Vitest 4 : poolOptions supprimé, les options sont désormais au niveau racine.
    pool: 'threads',
    // Horloge figée pour toute la suite (voir vitest.setup.clock.ts). Hérité par les
    // projets en ligne via `extends: true` ; les projets à fichier séparé le rechargent
    // eux-mêmes, ils n'héritent de rien d'ici.
    setupFiles: [path.resolve(__dirname, 'vitest.setup.clock.ts')],
    // Les 5 s par défaut sont trop justes en CI : `setupMockDb()` rejoue toutes les
    // migrations à chaque test (~140 allers-retours D1), ce qui coûte des secondes sur
    // un runner GitHub là où la même chose prend 30 ms en local. Les migrations RBAC
    // ont fait déborder les tests les plus lents. 20 s laissent de la marge sans rien
    // masquer : un test réellement bloqué ne finit jamais, il ne met pas 20 s.
    // Le vrai correctif est de ne plus rejouer les migrations à chaque test.
    testTimeout: 20000,
    hookTimeout: 20000,
    isolate: true,
    maxWorkers: '75%',
    fileParallelism: true,
    // Filet de sécurité pour `vitest --changed` (CI) : ces fichiers ne sont PAS dans le
    // graphe d'imports (migrations SQL, config wrangler du pool, configs racine). S'ils
    // changent, Vitest ignore --changed et relance TOUTE la suite.
    //
    // `package-lock.json` et non `package.json` : c'est un **changement de dépendance**
    // qu'on veut attraper, et npm écrit toujours le lock quand il y en a un. Viser
    // `package.json` faisait au contraire tout relancer à chaque release — le robot
    // semantic-release n'y touche que le numéro de version, et son commit porte
    // `[skip ci]`, donc il n'a pas de run à lui. `NX_BASE` restait alors en deçà, et le
    // bump se retrouvait dans l'intervalle comparé du push suivant : un push sur deux
    // rejouait la suite entière pour rien.
    forceRerunTriggers: [
      '**/package-lock.json',
      '**/{vitest,vite}.config.*',
      '**/vitest.setup.ts',
      '**/vitest.setup.clock.ts',
      '**/vitest.wrangler.ts',
      '**/vitest.aliases.ts',
      '**/wrangler.json',
      '**/db/migrations/**',
      '**/drizzle.config.ts',
    ],
    projects: [
      // Standard config files for apps and shared libs
      'apps/api/vitest.config.ts',
      'apps/admin/vitest.config.ts',
      'libs/shared/db/vitest.config.ts',
      'libs/shared/push/vitest.config.ts',
      'libs/shared/html/vitest.config.ts',
      'libs/shared/preview/vitest.config.ts',
      'libs/shared/security-headers/vitest.config.ts',
      'apps/storefront/vitest.config.ts',
      'apps/website/vitest.config.ts',
      'libs/shared/ui/vitest.config.ts',
      
      // Inline project configs for members API and UI
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-members-api'),
        test: {
          name: 'features-members-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/members'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },
      {
        extends: true,
        plugins: [svelte()],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-members-ui'),
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'features-members-ui',
          globals: true,
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'vitest.setup.clock.ts'), path.resolve(__dirname, 'vitest.setup.ts')],
          root: path.resolve(__dirname, 'libs/domains/members'),
          // Liste littérale : un test d'interface posé dans une tranche absente d'ici ne
          // serait jamais exécuté, sans que rien ne le signale.
          include: ['get-member-by-licence/ui/**/*.test.ts', 'import-members-csv/ui/**/*.test.ts', 'list-members/ui/**/*.test.ts', 'upload-member-photo/ui/**/*.test.ts'],
        }
      },
      
      // Inline project configs for accounting API and UI
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-accounting-api'),
        test: {
          name: 'features-accounting-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/accounting'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },
      {
        extends: true,
        plugins: [svelte()],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-accounting-ui'),
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'features-accounting-ui',
          globals: true,
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'vitest.setup.clock.ts'), path.resolve(__dirname, 'vitest.setup.ts')],
          root: path.resolve(__dirname, 'libs/domains/accounting'),
          include: ['*/**/ui/**/*.test.ts'],
        }
      },
      
      // Inline project configs for expenses API and UI
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-expenses-api'),
        test: {
          name: 'features-expenses-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/expenses'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },
      {
        extends: true,
        plugins: [svelte()],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-expenses-ui'),
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'features-expenses-ui',
          globals: true,
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'vitest.setup.clock.ts'), path.resolve(__dirname, 'vitest.setup.ts')],
          root: path.resolve(__dirname, 'libs/domains/expenses'),
          include: ['create/ui/**/*.test.ts', 'list/ui/**/*.test.ts', 'update/ui/**/*.test.ts'],
        }
      },
      
      // Inline project configs for shop API and UI
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-shop-api'),
        test: {
          name: 'features-shop-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/shop'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },
      {
        extends: true,
        plugins: [svelte()],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-shop-ui'),
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'features-shop-ui',
          globals: true,
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'vitest.setup.clock.ts'), path.resolve(__dirname, 'vitest.setup.ts')],
          root: path.resolve(__dirname, 'libs/domains/shop'),
          include: ['list-orders/ui/**/*.test.ts', 'list-products/ui/**/*.test.ts'],
        }
      },
      // Inline project config for notifications API
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-notifications-api'),
        test: {
          name: 'features-notifications-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/notifications'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },

      // Inline project configs for announcements API and UI
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-schedules-api'),
        test: {
          name: 'features-schedules-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/schedules'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },
      {
        // Le pendant `-ui` manquait au domaine des créneaux : tout test de composant y
        // était donc **silencieusement ignoré**, `exclude: ['**/ui/**']` ci-dessus les
        // écartant du projet API sans que rien ne les reprenne. `SchedulesManager` n'a
        // jamais été couvert pour cette raison.
        extends: true,
        plugins: [svelte()],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-schedules-ui'),
        // Sans la condition `browser`, Svelte résout sa build serveur et `mount()` échoue.
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'features-schedules-ui',
          globals: true,
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'vitest.setup.clock.ts'), path.resolve(__dirname, 'vitest.setup.ts')],
          root: path.resolve(__dirname, 'libs/domains/schedules'),
          include: ['**/ui/**/*.test.ts'],
          exclude: ['**/node_modules/**'],
        }
      },
      {
        extends: true,
        plugins: [cloudflareTest({ wrangler: { configPath: wranglerConfig } })],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-events-api'),
        test: {
          name: 'features-events-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/events'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },
      {
        extends: true,
        plugins: [cloudflareTest({ wrangler: { configPath: wranglerConfig } })],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-teams-api'),
        test: {
          name: 'features-teams-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/teams'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },
      {
        // Les composants se testent hors du runtime Workers : `DataTable` confie la
        // ligne du tableau à l'appelant, et l'oublier ne casse rien — les cellules
        // s'enfilent simplement toutes sur une seule ligne. Seul un rendu le voit.
        extends: true,
        plugins: [svelte()],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-teams-ui'),
        // Sans la condition `browser`, Svelte résout sa build serveur et `mount()` échoue.
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'features-teams-ui',
          globals: true,
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'vitest.setup.clock.ts'), path.resolve(__dirname, 'vitest.setup.ts')],
          root: path.resolve(__dirname, 'libs/domains/teams'),
          include: ['**/ui/**/*.test.ts'],
          exclude: ['**/node_modules/**'],
        }
      },
      {
        extends: true,
        plugins: [cloudflareTest({ wrangler: { configPath: wranglerConfig } })],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-cms-api'),
        test: {
          name: 'features-cms-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/cms'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },
      {
        // Le pendant « ui » manquait au domaine CMS : `features-cms-api` exclut
        // `**/ui/**`, si bien qu'un test posé à côté d'un composant n'était ramassé
        // par aucun projet et ne s'exécutait jamais — sans le moindre avertissement.
        extends: true,
        plugins: [svelte()],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-cms-ui'),
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'features-cms-ui',
          globals: true,
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'vitest.setup.clock.ts'), path.resolve(__dirname, 'vitest.setup.ts')],
          root: path.resolve(__dirname, 'libs/domains/cms'),
          include: ['**/ui/**/*.test.ts'],
        }
      },
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-announcements-api'),
        test: {
          name: 'features-announcements-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/announcements'),
          include: ['**/*.test.ts'],
          exclude: ['**/ui/**', '**/node_modules/**'],
        }
      },
      {
        extends: true,
        plugins: [svelte()],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-announcements-ui'),
        resolve: {
          conditions: ['browser'],
        },
        test: {
          name: 'features-announcements-ui',
          globals: true,
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'vitest.setup.clock.ts'), path.resolve(__dirname, 'vitest.setup.ts')],
          root: path.resolve(__dirname, 'libs/domains/announcements'),
          include: ['list-announcements/ui/**/*.test.ts'],
        }
      },

      // Inline project config for the IAM domain (RBAC kernel + slices)
      {
        extends: true,
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: wranglerConfig,
            },
          }),
        ],
        cacheDir: path.resolve(__dirname, 'node_modules/.vite/features-iam-api'),
        test: {
          name: 'features-iam-api',
          globals: true,
          root: path.resolve(__dirname, 'libs/domains/iam'),
          include: ['**/*.test.ts'],
          exclude: ['**/components/**', '**/node_modules/**'],
        }
      },

      // Architecture tests project
      {
        extends: true,
        test: {
          name: 'architecture-tests',
          globals: true,
          environment: 'node',
          include: ['libs/*.test.ts'],
        }
      },
    ],
  },
});
