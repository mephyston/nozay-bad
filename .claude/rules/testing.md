---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "vitest*.ts"
  - "**/vitest.config.ts"
  - "libs/shared/db/src/test-utils.ts"
  - "tests/**"
---

# Tests

- **Horloge figée** au 2026-08-30T12:00:00Z (`vitest.setup.clock.ts`) : la saison `25-26` est l'exercice ouvert. Un test qui a besoin d'une autre date pose `vi.setSystemTime()`. Toute nouvelle config de projet vitest à fichier séparé doit recharger ce setup, elle n'hérite **rien** de la racine (ni alias, ni timeouts, ni setupFiles).
- Une suite unique : `npx vitest run` (un seul boot du pool Workers). `--changed <base>` pour cibler, `--config vitest.architecture.config.ts` pour les tests d'architecture (0,9 s).
- `setupMockDb()` envoie drops et migrations en deux `batch()` : ne pas réintroduire de boucle `prepare().run()`.
- Tout `route.test.ts` d'`accounting` **double son handler** (`vi.mock('./handler', …)`) : la boucle d'import `accounting ↔ members` fait sinon arriver la route `undefined` (`Cannot read properties of undefined (reading 'routes')`).
- Un effet de bord détaché (`void promesse`) passe en test et meurt en production : ne jamais valider un effet non attendu.
- Dans une fonction `async`, `return autreFonctionAsync()` qui rejette donne un « Unhandled Rejection » sous le pool Workers, même attrapé par `expect().rejects` : écrire `return await …`.
- Composants Svelte : `tsc` **ne lit pas** les `.svelte`. Une prop renommée ou mal typée ne casse ni typecheck ni tests. Tester le vrai chemin (bouton → Sheet → submit), et grep les appelants à chaque renommage de prop.
- Tests bidirectionnels (échouent sur un oubli **et** sur un orphelin) : `apps/api/src/authz/coverage.test.ts`, `apps/admin/src/lib/page-permissions.test.ts`, `libs/migrations.test.ts` (rejoue les migrations touchant `role_permissions`), `libs/design-system.test.ts` (dont `scanTargets` codé en dur : une nouvelle app y échappe tant qu'on ne l'ajoute pas).
- `libs/openapi.test.ts` **réécrit** `docs/openapi.json` : committer le fichier régénéré.
- Régression visuelle : références `-linux.png` régénérées par le workflow *Update Visual Baselines* ; les `-darwin` locaux sont ignorés.
