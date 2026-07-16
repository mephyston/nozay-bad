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
          allow: [],
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
              onlyDependOnLibsWithTags: ['scope:shop', 'scope:shared']
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared']
            }
          ]
        }
      ]
    }
  }
);
