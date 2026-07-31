import nxPlugin from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';

// Les règles du Design System (pas de <select> brut, pas de surcharge de style sur
// <Badge>, pas d'alerte/en-tête artisanaux, tokens sémantiques au lieu de palette brute)
// sont vérifiées de façon précise et intégrée à la CI par libs/design-system.test.ts.

export default tseslint.config(
  {
    ignores: [
      '**/.wrangler/**',
      '**/dist/**',
      '**/tmp/**',
      '**/.nx/**',
      '**/.astro/**',
      '**/*.d.ts'
    ]
  },
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      '@nx': nxPlugin,
    },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:api', 'type:ui', 'scope:shared', 'type:data-access']
            },
            {
              sourceTag: 'type:api',
              onlyDependOnLibsWithTags: ['type:api', 'type:data-access', 'scope:shared']
            },
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'scope:shared']
            },
            {
              sourceTag: 'scope:accounting',
              onlyDependOnLibsWithTags: ['scope:accounting', 'scope:members', 'scope:shared']
            },
            {
              sourceTag: 'scope:members',
              onlyDependOnLibsWithTags: ['scope:members', 'scope:shared']
            },
            {
              sourceTag: 'scope:expenses',
              onlyDependOnLibsWithTags: ['scope:expenses', 'scope:members', 'scope:accounting', 'scope:shared']
            },
            {
              sourceTag: 'scope:shop',
              // Cross-domain access: read-only for member names and categories, except order approval which inserts a transaction.
              onlyDependOnLibsWithTags: ['scope:shop', 'scope:shared', 'scope:members', 'scope:accounting']
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared']
            }
          ]
        }
      ]
    }
  },
  {
    files: ['**/route.ts', '**/routes.ts', '**/routes/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Interdit drizzle-orm et ses sous-modules, sauf drizzle-orm/d1 pour l'instanciation de drizzle(c.env.DB)
              group: ['drizzle-orm', 'drizzle-orm/*', '!drizzle-orm/d1'],
              message: 'Please do not import drizzle-orm in route files. Database logic should be confined to repository files. Only drizzle-orm/d1 is allowed for client creation.'
            },
            {
              group: ['**/repository.ts', '**/schema.ts', '**/schema'],
              message: 'Please do not import repository or schemas directly in route files.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['**/handler.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'hono',
              message: 'Please do not import hono in handler files. Use case handlers should remain framework-independent.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['libs/domains/*/*/**/*.ts'],
    ignores: ['libs/domains/*/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../!(shared)',
                '../!(shared)/**',
                '../../!(shared)',
                '../../!(shared)/**'
              ],
              message: 'Slice-to-slice imports are forbidden. You can only import from shared.'
            }
          ]
        }
      ]
    }
  },
  {
    files: [
      'apps/api/src/**/*.test.ts'
    ],
    rules: {
      '@nx/enforce-module-boundaries': 'off'
    }
  },
  {
    files: ['**/repository.ts', '**/repository/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="eq"] > MemberExpression[property.name=/^(adminLabel|adherentLabel|label|name)$/]',
          message: 'Direct queries or literal comparisons on label fields (adminLabel, adherentLabel, label, name) in repository files are forbidden. Use business code fields (code) instead.'
        }
      ]
    }
  },
  {
    files: ['libs/domains/accounting/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{
            group: ['@nba/*/schema', '!@nba/accounting/schema'],
            message: 'Violation VSA : Impossible d\'importer directement le schéma de base de données d\'un autre domaine. Utilisez l\'API publique du domaine ciblé (ex: @nba/nom-domaine-api).'
          }]
        }
      ]
    }
  },
  {
    files: ['libs/domains/expenses/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{
            group: ['@nba/*/schema', '!@nba/expenses/schema'],
            message: 'Violation VSA : Impossible d\'importer directement le schéma de base de données d\'un autre domaine. Utilisez l\'API publique du domaine ciblé (ex: @nba/nom-domaine-api).'
          }]
        }
      ]
    }
  },
  {
    files: ['libs/domains/shop/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{
            group: ['@nba/*/schema', '!@nba/shop/schema'],
            message: 'Violation VSA : Impossible d\'importer directement le schéma de base de données d\'un autre domaine. Utilisez l\'API publique du domaine ciblé (ex: @nba/nom-domaine-api).'
          }]
        }
      ]
    }
  },
  {
    files: ['libs/domains/members/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{
            group: ['@nba/*/schema', '!@nba/members/schema'],
            message: 'Violation VSA : Impossible d\'importer directement le schéma de base de données d\'un autre domaine. Utilisez l\'API publique du domaine ciblé (ex: @nba/nom-domaine-api).'
          }]
        }
      ]
    }
  }
);


