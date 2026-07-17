# Task 1 Report: Création d'AppError et Configuration du Middleware Global Hono

## What was implemented
- Created `libs/shared/db/src/errors.ts` defining the `AppError` class inheriting from `Error`, with custom message and HTTP status code properties (`status: 400 | 403 | 404 | 409 | 422 | 500 = 400`).
- Exported `AppError` from `libs/shared/db/src/index.ts` to make it available to other packages/modules.
- Configured a global `app.onError` middleware handler in `apps/api/src/index.ts` that:
  - Catches instances of `AppError` and returns them as a JSON response with their associated status code and message.
  - Catches generic errors, logs them to `console.error` (including URL, message, and stack trace), and returns a 500 JSON response.

## What was tested and test results
- Added a `Global Error Handling` test suite in `apps/api/src/index.test.ts` to verify:
  - Route throwing `AppError` returns the customized status code (400) and message as JSON.
  - Route throwing a generic `Error` returns a 500 status code and the standardized error JSON response.
- All tests were run using Vitest.
  - **Results**: 150/150 tests passed successfully (including the 2 new test cases).

## Files changed
- [libs/shared/db/src/errors.ts](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/errors.ts) *(New file)*
- [libs/shared/db/src/index.ts](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/index.ts)
- [apps/api/src/index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts)
- [apps/api/src/index.test.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.test.ts)

## Self-review findings
- **Completeness**: All requirements listed in Task 1 are implemented exactly.
- **Quality**: The middleware logic is clean and integrates cleanly with the Hono routing system.
- **Discipline**: TDD principles were followed: tests were written and verified to fail before the implementation code was written.
- **Testing**: Regression tests verified all 150 tests are green.

## Issues or concerns
- None.
