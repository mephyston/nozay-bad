import nxPlugin from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import globals from 'globals';

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
  // Les .svelte n'étaient couverts par aucun bloc `files` : un identifiant jamais
  // importé (`flashAndReload`, `toast`) passait build, typecheck et tests, et
  // n'échouait qu'à l'exécution, dans la main de l'utilisateur. `no-undef` ferme ce
  // trou — c'est la seule règle activée ici, volontairement, pour rester sans bruit.
  ...sveltePlugin.configs['flat/base'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.svelte'],
      },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    rules: {
      'no-undef': 'error',
    },
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
      // 'off' et non 'error' : ESLint n'avait jamais tourné en CI et la règle remonte
      // 174 violations sur le tronc (imports par alias @nba/* depuis l'intérieur du
      // même projet, imports statiques de libs déclarées lazy, et surtout un cycle
      // accounting-api <-> members-api <-> shop-api que les contraintes ci-dessous
      // interdisent). Les frontières réellement tenues sont celles des tests
      // d'architecture (vitest.architecture.config.ts). Les contraintes restent
      // déclarées pour documenter la cible ; repasser à 'error' une fois le cycle
      // résolu, en traitant les deux autres familles au passage.
      '@nx/enforce-module-boundaries': [
        'off',
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
              // Notifications: outbound only (an approved expense report notifies its member).
              onlyDependOnLibsWithTags: ['scope:expenses', 'scope:members', 'scope:accounting', 'scope:notifications', 'scope:shared']
            },
            {
              sourceTag: 'scope:shop',
              // Cross-domain access: read-only for member names and categories, except order approval which inserts a transaction.
              onlyDependOnLibsWithTags: ['scope:shop', 'scope:shared', 'scope:members', 'scope:accounting', 'scope:notifications']
            },
            {
              sourceTag: 'scope:schedules',
              // Feuille : les créneaux ne dépendent d'aucun autre domaine. C'est le
              // site — et demain le storefront — qui composent.
              onlyDependOnLibsWithTags: ['scope:schedules', 'scope:shared']
            },
            {
              sourceTag: 'scope:events',
              onlyDependOnLibsWithTags: ['scope:events', 'scope:shared']
            },
            {
              sourceTag: 'scope:teams',
              // Les équipes lisent le référentiel des adhérents pour alimenter les
              // sélecteurs de joueurs — mais rien ne dépend d'elles, donc pas de cycle.
              // Le coach prévient un capitaine d'une anomalie : l'envoi passe par le
              // domaine notifications, qui ne dépend de personne en retour.
              onlyDependOnLibsWithTags: [
                'scope:teams',
                'scope:members',
                'scope:notifications',
                'scope:shared'
              ]
            },
            {
              sourceTag: 'scope:cms',
              // Feuille : le CMS ne dépend d'aucun autre domaine. Les créneaux et
              // l'agenda seront composés par apps/website, pas importés ici — un bloc
              // `schedule` porte une requête, jamais des lignes.
              onlyDependOnLibsWithTags: ['scope:cms', 'scope:shared']
            },
            {
              sourceTag: 'scope:notifications',
              // Leaf context: depends on nothing but shared. Targets requiring member
              // data are resolved by the caller (apps/api), which avoids the cycle
              // members -> accounting -> expenses -> notifications.
              onlyDependOnLibsWithTags: ['scope:notifications', 'scope:shared']
            },
            {
              sourceTag: 'scope:iam',
              // Leaf context: identity and rights depend on nothing but shared. No
              // business domain may depend on iam either — a domain that needed to
              // know who is acting would be deciding authorization, which belongs to
              // the API's route table alone.
              onlyDependOnLibsWithTags: ['scope:iam', 'scope:shared']
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
  // Étanchéité VSA : un domaine ne lit pas le schéma de base d'un autre, il passe
  // par son API publique. Les tests sont hors périmètre : ils sèment la base à
  // travers les domaines (une saison comptable pour commander, un adhérent pour
  // facturer), ce qui n'a pas de sens à faire passer par une API.
  ...['accounting', 'expenses', 'shop', 'members'].map((domain) => ({
    files: [`libs/domains/${domain}/**/*.ts`],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{
            group: ['@nba/*/schema', `!@nba/${domain}/schema`],
            message: 'Violation VSA : Impossible d\'importer directement le schéma de base de données d\'un autre domaine. Utilisez l\'API publique du domaine ciblé (ex: @nba/nom-domaine-api).'
          }]
        }
      ]
    }
  }))
);


