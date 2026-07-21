# Task 1 Report: Correction de la Règle ESLint

## Summary of Changes
Updated `eslint.config.js` to target `**/route.ts` along with `**/routes.ts` and `**/routes/**/*.ts`.
Replaced the `no-restricted-imports` paths entry for `drizzle-orm` with a pattern rule that restricts `drizzle-orm` and all submodules except `drizzle-orm/d1`.

## Verification
- Executed `npx eslint libs/domains/accounting`: Passed without errors.
- Executed `npx eslint .`: Passed clean across all workspace files.

## Commits
- `ef35600 chore(eslint): correct routes file patterns and restrict drizzle-orm imports`
