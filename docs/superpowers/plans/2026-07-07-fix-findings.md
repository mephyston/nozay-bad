# Security Fixes and Type Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address three critical review findings: fix security auth bypass & runtime environment variables in Astro middleware; define TypeScript types/locals; remove the deprecated driver in Drizzle configuration.

**Architecture:** 
1. The admin console's Astro middleware dynamically reads Cloudflare/Process environment variables and handles local development bypass gracefully without exposing production routes to bypasses.
2. Svelte/Astro environment type declarations are properly defined in `env.d.ts` files for both Astro apps.
3. Drizzle configuration is modernized by using `dialect: 'sqlite'` instead of the deprecated `driver: 'd1-http'`.

**Tech Stack:** Astro, Cloudflare Pages, jose, Drizzle ORM, TypeScript, Vitest.

## Global Constraints

* TypeScript must compile cleanly without strict mode errors.
* Vitest test suite must pass cleanly.
* Avoid mock token bypass in production context.

---

### Task 1: Fix Security Auth Bypass & Runtime Env Vars in Astro Middleware

**Files:**
- Modify: `apps/admin-console/src/middleware.ts`
- Modify: `apps/admin-console/src/middleware.test.ts`

**Interfaces:**
- Consumes: `Cf-Access-Jwt-Assertion` HTTP header, `context.locals.runtime?.env` or `process.env`.
- Produces: Astro middleware authentication logic with dynamic environment variables and localized bypass logic.

- [ ] **Step 1: Modify `apps/admin-console/src/middleware.ts` to implement dynamic env resolution, JWKS memoized cache, and localhost bypass**
  Ensure we read CF_TEAM_DOMAIN and CF_AUDIENCE inside `handleAuth` from `context.locals.runtime?.env || process.env`, memoize `JWKS` inside a cache mapped by `CF_TEAM_DOMAIN`, and bypass auth only if `process.env.NODE_ENV === 'development'` or the URL hostname is `localhost` or `127.0.0.1`.

- [ ] **Step 2: Update `apps/admin-console/src/middleware.test.ts` to mock and verify these behaviors**
  Adjust the test cases so that:
  - Production flow tests use non-localhost URL to verify `jwtVerify` is invoked.
  - Local development flow is tested specifically with a localhost URL or `NODE_ENV === 'development'`.
  - Verify that mock token bypass is no longer allowed in production flow (non-localhost url).

- [ ] **Step 3: Run Vitest tests to ensure all tests pass**
  Run: `npx vitest run apps/admin-console/src/middleware.test.ts`
  Expected: PASS

- [ ] **Step 4: Commit the changes**
  Run: `git add apps/admin-console/src/middleware.ts apps/admin-console/src/middleware.test.ts`
  Run: `git commit -m "security: fix auth bypass & dynamic runtime env in admin middleware"`

---

### Task 2: Implement Svelte/Astro env.d.ts Declarations

**Files:**
- Create: `apps/admin-console/src/env.d.ts`
- Create: `apps/boutique/src/env.d.ts`

**Interfaces:**
- Produces: TypeScript definitions for Astro/Cloudflare globals and locals.

- [ ] **Step 1: Create `apps/admin-console/src/env.d.ts`**
  Add standard Astro client reference and App/Env types.

- [ ] **Step 2: Create `apps/boutique/src/env.d.ts`**
  Add standard Astro client reference and App/Env types.

- [ ] **Step 3: Verify Compilation**
  Run: `npx astro check --root apps/admin-console`
  Run: `npx astro check --root apps/boutique`
  Expected: Success without strict type issues.

- [ ] **Step 4: Commit the changes**
  Run: `git add apps/admin-console/src/env.d.ts apps/boutique/src/env.d.ts`
  Run: `git commit -m "types: add env.d.ts definitions for admin-console and boutique"`

---

### Task 3: Modernize Drizzle Configuration

**Files:**
- Modify: `libs/shared/db/drizzle.config.ts`

**Interfaces:**
- Produces: Drizzle defineConfig utilizing the modern SQLite dialect.

- [ ] **Step 1: Modify `libs/shared/db/drizzle.config.ts`**
  Remove `driver: 'd1-http'` and ensure only `dialect: 'sqlite'` is used.

- [ ] **Step 2: Verify Drizzle compatibility by checking the tests**
  Run: `npx vitest run libs/shared/db/src/db.test.ts`
  Expected: PASS

- [ ] **Step 3: Commit the changes**
  Run: `git add libs/shared/db/drizzle.config.ts`
  Run: `git commit -m "chore: remove deprecated d1-http driver in drizzle config"`
