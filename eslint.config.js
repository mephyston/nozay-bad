import nxPlugin from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';

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
          allow: ['../*', '../**/*', '../../**/*', '../../../**/*'],
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:api', 'type:ui', 'scope:shared', 'type:data-access']
            },
            {
              sourceTag: 'type:api',
              onlyDependOnLibsWithTags: ['type:data-access', 'scope:shared']
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
              onlyDependOnLibsWithTags: ['scope:expenses', 'scope:shared']
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
              group: ['**/data-access/**', '**/schema'],
              message: 'Please do not import data-access or schemas directly in route files. Confine database logic to repository files.'
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
    ignores: ['libs/domains/*/shared/**/*.ts', 'libs/domains/*/api/**/*.ts', 'libs/domains/*/data-access/**/*.ts', 'libs/domains/*/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../!(shared|data-access)',
                '../!(shared|data-access)/**',
                '../../!(shared|data-access)',
                '../../!(shared|data-access)/**'
              ],
              message: 'Slice-to-slice imports are forbidden. You can only import from shared or data-access.'
            }
          ]
        }
      ]
    }
  },
  {
    files: [
      'libs/domains/*/api/src/index.ts',
      'libs/domains/*/ui/src/index.ts',
      'libs/domains/*/api/src/routes/**/*.ts',
      'libs/domains/*/api/src/routes/*.ts',
      'libs/domains/*/api/src/routes.ts',
      'libs/domains/*/api/src/**/*.test.ts',
      'apps/api/src/**/*.test.ts'
    ],
    rules: {
      '@nx/enforce-module-boundaries': 'off'
    }
  }
);
