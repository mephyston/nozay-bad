# Import Adhérents Poona Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure, accessible, and performant flow to upload and parse Poona CSV exports in the admin console, upserting players in the D1 Database via Hono.

**Architecture:** 
1. **Database:** Add a new `members` table to the database schema.
2. **API:** Define a `POST /members/import` route in the Hono API Worker that parses CSV files (using simple string parsing or standard CSV reader) and performs batch upsert queries in D1 via Drizzle.
3. **Frontend Action:** Add an Astro API endpoint / form action in `admin-console` that forwards the CSV upload to the Hono API using the worker service binding (`context.locals.runtime.env.API_SERVICE`).
4. **UI:** Build a drag-and-drop Svelte import panel with file validation and clear feedback of import stats.

**Tech Stack:** Astro, Svelte 5, Tailwind CSS v4, Hono, Drizzle ORM, Vitest.

## Global Constraints
- Utiliser les versions récentes d'Astro, Svelte (v5), Tailwind CSS (v4).
- Les tests unitaires et d'intégration doivent utiliser Vitest.
- Le code TypeScript doit compiler sans erreurs strictes.
- Toutes les opérations D1 doivent utiliser Drizzle ORM et s'exécuter dans le Worker Hono.

---

### Task 1: Database Migration (Schema and Drizzle Setup)

**Files:**
- Modify: `libs/shared/db/src/schema.ts`
- Create: Drizzle migration files (generated automatically)
- Test: `libs/shared/db/src/db.test.ts` (write unit tests to verify insertions)

**Interfaces:**
- Produces: `membersTable` in schema.
- Database Schema:
  ```typescript
  import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

  export const membersTable = sqliteTable('members', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    licence: text('licence').notNull().unique(),
    lastName: text('last_name').notNull(),
    firstName: text('first_name').notNull(),
    gender: text('gender', { enum: ['M', 'F'] }).notNull(),
    birthDate: text('birth_date').notNull(),
    email: text('email'),
    phone: text('phone'),
    status: text('status').notNull().default('valide'),
    type: text('type').notNull(),
    importedAt: integer('imported_at', { mode: 'timestamp' }).notNull()
  });
  ```

- [ ] **Step 1: Update schema.ts**
  Add the `membersTable` schema definition to `libs/shared/db/src/schema.ts`.

- [ ] **Step 2: Generate Drizzle migration**
  Run: `npx drizzle-kit generate` inside the workspace or lib folder to create the migration file.
  Verify a new SQL migration file is generated under `libs/shared/db/migrations/`.

- [ ] **Step 3: Update and Run DB unit test**
  Add a test inside `libs/shared/db/src/db.test.ts` to insert a member and verify it is retrievable.
  Run: `npx vitest run libs/shared/db/src/db.test.ts`
  Expected: PASS.

- [ ] **Step 4: Commit**
  Run: `git add libs/shared/db && git commit -m "feat(db): add members table schema and migrations"`

---

### Task 2: Private API Import Endpoint (Hono Worker)

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/index.test.ts`

**Interfaces:**
- Produces: API endpoint `POST /members/import` accepting multipart/form-data with a `file` field.
- Returns JSON structure:
  ```json
  {
    "success": true,
    "inserted": 42,
    "updated": 2,
    "errors": 0
  }
  ```

- [ ] **Step 1: Write failing integration test for CSV parsing and import**
  Add a new test suite inside `apps/api/src/index.test.ts` that posts a mock CSV string payload to `/members/import` and expects correct count of inserted/updated database entries.
  Run: `npx vitest run apps/api/src/index.test.ts`
  Expected: FAIL (404/not implemented).

- [ ] **Step 2: Implement CSV parser and /members/import route**
  In `apps/api/src/index.ts`, parse the CSV content manually or via simple splits:
  - Header validation (must contain `Licence`, `Nom`, `Prénom`, `Sexe`, `Date de naissance`, `Email`, `Téléphone`, `Statut`, `Type`).
  - Loop rows, perform clean ups, and upsert into the D1 `members` table using Drizzle's `.onConflictDoUpdate()` matching on the `licence` column.
  - Return counts of operations.

- [ ] **Step 3: Verify tests pass**
  Run: `npx vitest run apps/api/src/index.test.ts`
  Expected: PASS.

- [ ] **Step 4: Commit**
  Run: `git add apps/api && git commit -m "feat(api): implement Poona CSV parser and import route"`

---

### Task 3: Astro Page Integration and API proxying

**Files:**
- Create: `apps/admin-console/src/pages/admin/members/import.astro`

**Interfaces:**
- Produces: Astro backend route to proxy front-end uploads securely to the Honoworker.

- [ ] **Step 1: Create import.astro route**
  Create `apps/admin-console/src/pages/admin/members/import.astro`.
  The page handles `POST` requests:
  - Extracts the uploaded file from the request `FormData`.
  - Forwards the file inside a `FormData` to `Astro.locals.runtime.env.API_SERVICE` at path `/members/import` using `fetch`.
  - Returns the JSON stats object or error messages to the Svelte client.
  - The `GET` request serves the page view wrapping the importer component.

- [ ] **Step 2: Verify compile**
  Run: `npx astro check --root apps/admin-console`
  Expected: 0 errors/warnings.

- [ ] **Step 3: Commit**
  Run: `git add apps/admin-console && git commit -m "feat(admin-console): add Astro route to proxy CSV upload"`

---

### Task 4: UI Drag-and-Drop Importer Component (Svelte 5)

**Files:**
- Create: `apps/admin-console/src/components/PoonaImporter.svelte`
- Modify: `apps/admin-console/src/pages/admin/members/import.astro` (to render the component)
- Create: `apps/admin-console/src/components/PoonaImporter.test.ts`

**Interfaces:**
- Consumes: Astro form upload route `/admin/members/import`.
- Produces: User-friendly uploading state, progress indicators, and statistics.

- [ ] **Step 1: Write test layout check**
  Create `apps/admin-console/src/components/PoonaImporter.test.ts` to assert that the component renders a file input and import button.
  Run: `npx vitest run apps/admin-console/src/components/PoonaImporter.test.ts`
  Expected: PASS.

- [ ] **Step 2: Create Svelte 5 component PoonaImporter**
  Create `apps/admin-console/src/components/PoonaImporter.svelte`.
  Use Svelte 5 runes:
  - Drag-and-drop zone with highlighting on dragover.
  - Show file name after selection.
  - Handle submit using a native `fetch` POST request to the Astro page action.
  - Display detailed stats on success (inserted, updated, errors).
  - Premium design layout with clear dark mode support.

- [ ] **Step 3: Run full verification checks**
  Run: `npx vitest run`
  Run: `npx astro check --root apps/admin-console && npx astro build --root apps/admin-console`
  Expected: All checks and tests succeed.

- [ ] **Step 4: Commit**
  Run: `git add apps/admin-console && git commit -m "feat(admin-console): build Svelte PoonaImporter UI component"`
