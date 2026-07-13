# Poona Import and Members Administration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure, accessible, and performant flow to upload/parse Poona CSV exports, view a paginated/filtered listing, and consult details of members in the admin console.

**Architecture:**
1. **API Endpoints:** Implement `GET /members` and `GET /members/:licence` in the Hono API Worker utilizing Drizzle ORM queries on the SQLite D1 database.
2. **Astro Proxying/SSR:** Build Astro SSR pages `import.astro`, `index.astro` (listing), and `[licence].astro` (details) in `admin-console` that fetch data securely from the Hono API using the worker service binding (`context.locals.runtime.env.API_SERVICE`).
3. **Svelte 5 Components:** Construct reactive, accessible Svelte 5 components with Tailwind CSS v4 styling for UI states (importer, paginated table with filter inputs, and profile card).

**Tech Stack:** Astro, Svelte 5, Tailwind CSS v4, Hono, Drizzle ORM, Vitest.

## Global Constraints
- Utiliser les versions récentes d'Astro, Svelte (v5), Tailwind CSS (v4).
- Les tests unitaires et d'intégration doivent utiliser Vitest.
- Le code TypeScript doit compiler sans erreurs strictes.
- Toutes les opérations D1 doivent utiliser Drizzle ORM et s'exécuter dans le Worker Hono.

---

### Task 1: Astro Backend Proxy Route for CSV Import

**Files:**
- Create: `apps/admin-console/src/pages/admin/members/import.astro`

**Interfaces:**
- Produces: Astro backend route to proxy front-end uploads to the Hono API `/members/import`.

- [ ] **Step 1: Create import.astro page**
  Create `apps/admin-console/src/pages/admin/members/import.astro` with the following content:
  ```astro
  ---
  import Layout from '../../../layouts/Layout.astro';
  import AdminLayout from '../../../components/AdminLayout.svelte';
  import PoonaImporter from '../../../components/PoonaImporter.svelte';

  let result = null;
  let error = null;

  if (Astro.request.method === 'POST') {
    try {
      const formData = await Astro.request.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File) || file.size === 0) {
        throw new Error('Aucun fichier fourni ou fichier vide.');
      }

      const apiService = Astro.locals.runtime.env.API_SERVICE;
      const apiFormData = new FormData();
      apiFormData.append('file', file);

      const apiRes = await apiService.fetch('http://localhost/members/import', {
        method: 'POST',
        body: apiFormData,
      });

      if (!apiRes.ok) {
        const text = await apiRes.text();
        throw new Error(text || 'Erreur lors de l\'importation');
      }

      result = await apiRes.json();
    } catch (err: any) {
      error = err.message || 'Une erreur inconnue est survenue';
    }
  }
  ---

  <Layout title="Import Adhérents Poona - NBA 91">
    <AdminLayout client:load>
      <div class="space-y-6">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Import Adhérents</h1>
          <p class="text-muted-foreground mt-2">
            Importez le fichier d'extraction CSV depuis Poona pour synchroniser les informations des adhérents.
          </p>
        </div>

        <PoonaImporter client:load {result} {error} />
      </div>
    </AdminLayout>
  </Layout>
  ```

- [ ] **Step 2: Verify compile**
  Run: `npx astro check --root apps/admin-console`
  Expected: Success without compilation errors (warning about missing PoonaImporter component is normal).

- [ ] **Step 3: Commit**
  Run: `git add apps/admin-console/src/pages/admin/members/import.astro && git commit -m "feat(admin-console): add Astro route to proxy CSV upload"`

---

### Task 2: UI Drag-and-Drop Importer Component (Svelte 5)

**Files:**
- Create: `apps/admin-console/src/components/PoonaImporter.svelte`
- Create: `apps/admin-console/src/components/PoonaImporter.test.ts`

**Interfaces:**
- Consumes: Properties `{ result, error }` passed by the Astro container.

- [ ] **Step 1: Write a basic component layout test**
  Create `apps/admin-console/src/components/PoonaImporter.test.ts` with the following test asserting that the import component displays correctly:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { mount } from 'svelte';
  import PoonaImporter from './PoonaImporter.svelte';

  describe('PoonaImporter Component', () => {
    it('renders the drag and drop zone by default', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      mount(PoonaImporter, {
        target,
        props: {
          result: null,
          error: null
        }
      });

      expect(target.innerHTML).toContain('Sélectionnez un fichier CSV');
      expect(target.innerHTML).toContain('Glissez et déposez');
    });

    it('renders error messages when provided', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      mount(PoonaImporter, {
        target,
        props: {
          result: null,
          error: 'Le fichier CSV est corrompu.'
        }
      });

      expect(target.innerHTML).toContain('Le fichier CSV est corrompu.');
    });

    it('renders stats when result is provided', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      mount(PoonaImporter, {
        target,
        props: {
          result: {
            success: true,
            inserted: 12,
            updated: 5,
            errors: 2
          },
          error: null
        }
      });

      expect(target.innerHTML).toContain('Importation réussie');
      expect(target.innerHTML).toContain('12'); // inserted count
      expect(target.innerHTML).toContain('5'); // updated count
      expect(target.innerHTML).toContain('2'); // errors count
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run apps/admin-console/src/components/PoonaImporter.test.ts`
  Expected: FAIL (missing PoonaImporter component).

- [ ] **Step 3: Implement Svelte 5 PoonaImporter component**
  Create `apps/admin-console/src/components/PoonaImporter.svelte` with reactive runes and beautiful styling:
  ```html
  <script lang="ts">
    import { Upload, AlertCircle, CheckCircle, RefreshCw } from 'lucide-svelte';

    interface ImportResult {
      success: boolean;
      inserted: number;
      updated: number;
      errors: number;
    }

    let { result = null, error = null }: { result: ImportResult | null; error: string | null } = $props();

    let dragOver = $state(false);
    let selectedFile = $state<File | null>(null);
    let loading = $state(false);
    let formElement = $state<HTMLFormElement | null>(null);

    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      dragOver = true;
    }

    function handleDragLeave() {
      dragOver = false;
    }

    function handleDrop(e: DragEvent) {
      e.preventDefault();
      dragOver = false;
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        selectedFile = e.dataTransfer.files[0];
      }
    }

    function handleFileChange(e: Event) {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        selectedFile = input.files[0];
      }
    }

    function handleSubmit(e: Event) {
      if (!selectedFile) {
        e.preventDefault();
        return;
      }
      loading = true;
    }
  </script>

  <div class="max-w-xl mx-auto bg-card text-card-foreground p-6 rounded-lg border border-border shadow-sm">
    {#if error}
      <div class="mb-6 p-4 bg-destructive/15 border border-destructive text-destructive rounded-lg flex items-start gap-3">
        <AlertCircle class="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <h4 class="font-semibold">Erreur d'importation</h4>
          <p class="text-sm mt-1">{error}</p>
        </div>
      </div>
    {/if}

    {#if result}
      <div class="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-start gap-3">
        <CheckCircle class="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <h4 class="font-semibold text-emerald-800 dark:text-emerald-300">Importation réussie</h4>
          <div class="grid grid-cols-3 gap-6 mt-3">
            <div class="text-center p-3 bg-background border border-border rounded-md">
              <div class="text-2xl font-bold">{result.inserted}</div>
              <div class="text-xs text-muted-foreground mt-1">Créations</div>
            </div>
            <div class="text-center p-3 bg-background border border-border rounded-md">
              <div class="text-2xl font-bold">{result.updated}</div>
              <div class="text-xs text-muted-foreground mt-1">Mises à jour</div>
            </div>
            <div class="text-center p-3 bg-background border border-border rounded-md">
              <div class="text-2xl font-bold text-destructive">{result.errors}</div>
              <div class="text-xs text-muted-foreground mt-1">Rejets</div>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <form method="POST" enctype="multipart/form-data" onsubmit={handleSubmit} bind:this={formElement}>
      <div
        class="border-2 border-dashed rounded-lg p-8 text-center transition-colors flex flex-col items-center justify-center min-h-[200px] cursor-pointer
        {dragOver ? 'border-primary bg-primary/5' : 'border-muted bg-background hover:bg-muted/10'}"
        onplay={handleDragOver}
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        onclick={() => formElement?.querySelector('input')?.click()}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && formElement?.querySelector('input')?.click()}
      >
        <input
          type="file"
          name="file"
          accept=".csv"
          class="hidden"
          onchange={handleFileChange}
        />

        <Upload class="w-10 h-10 text-muted-foreground mb-4" />

        {#if selectedFile}
          <p class="font-semibold text-sm">{selectedFile.name}</p>
          <p class="text-xs text-muted-foreground mt-1">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
        {:else}
          <p class="font-semibold text-sm">Sélectionnez un fichier CSV ou Glissez et déposez</p>
          <p class="text-xs text-muted-foreground mt-1">
            Fichier d'extraction Poona (.csv uniquement)
          </p>
        {/if}
      </div>

      <div class="mt-6 flex justify-end gap-3">
        {#if selectedFile}
          <button
            type="button"
            class="px-4 py-2 border border-border bg-background hover:bg-muted text-foreground text-sm font-medium rounded-md"
            onclick={() => { selectedFile = null; }}
            disabled={loading}
          >
            Annuler
          </button>
        {/if}

        <button
          type="submit"
          class="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-md shadow-sm flex items-center justify-center gap-2"
          disabled={!selectedFile || loading}
        >
          {#if loading}
            <RefreshCw class="w-4 h-4 animate-spin" />
            Importation en cours...
          {:else}
            Lancer l'importation
          {/if}
        </button>
      </div>
    </form>
  </div>
  ```

- [ ] **Step 4: Run unit tests to verify they pass**
  Run: `npx vitest run apps/admin-console/src/components/PoonaImporter.test.ts`
  Expected: PASS.

- [ ] **Step 5: Run Astro page compile and check**
  Run: `npx astro check --root apps/admin-console`
  Expected: Success without errors.

- [ ] **Step 6: Commit**
  Run: `git add apps/admin-console && git commit -m "feat(admin-console): build Svelte PoonaImporter UI component"`

---

### Task 3: API GET /members Endpoint

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/index.test.ts`

**Interfaces:**
- Produces: API endpoint `GET /members` returning a paginated JSON response of members.

- [ ] **Step 1: Write integration tests for GET /members**
  Modify `apps/api/src/index.test.ts` to add tests for listing members with search, filters, and pagination:
  ```typescript
  // Add at the end of apps/api/src/index.test.ts

  describe('GET /members', () => {
    it('should return paginated list of members', async () => {
      const mockD1 = await setupMockDb();
      const db = drizzle(mockD1 as any);

      // Insert dummy members
      await db.insert(membersTable).values([
        { licence: '1000001', lastName: 'Dupont', firstName: 'Jean', gender: 'M', birthDate: '1990-01-01', status: 'valide', type: 'Competiteur', importedAt: new Date() },
        { licence: '1000002', lastName: 'Martin', firstName: 'Sophie', gender: 'F', birthDate: '1985-05-15', status: 'valide', type: 'Loisir', importedAt: new Date() },
        { licence: '1000003', lastName: 'Durand', firstName: 'Luc', gender: 'M', birthDate: '1995-12-25', status: 'suspendu', type: 'Competiteur', importedAt: new Date() },
      ]).run();

      // Test simple list
      const res = await app.request('http://localhost/members?page=1&limit=2', undefined, { DB: mockD1 as any });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toEqual({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });

      // Test search filter
      const resSearch = await app.request('http://localhost/members?search=sop', undefined, { DB: mockD1 as any });
      const bodySearch = await resSearch.json();
      expect(bodySearch.data).toHaveLength(1);
      expect(bodySearch.data[0].firstName).toBe('Sophie');

      // Test type & gender filter
      const resFilter = await app.request('http://localhost/members?type=Competiteur&gender=M', undefined, { DB: mockD1 as any });
      const bodyFilter = await resFilter.json();
      expect(bodyFilter.data).toHaveLength(2); // Dupont and Durand
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run apps/api/src/index.test.ts`
  Expected: FAIL (404/not implemented).

- [ ] **Step 3: Implement GET /members in index.ts**
  Add the API route handler inside `apps/api/src/index.ts`:
  ```typescript
  // Add in apps/api/src/index.ts

  import { and, eq, like, sql } from 'drizzle-orm';

  app.get('/members', async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }

    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const search = c.req.query('search') || '';
    const gender = c.req.query('gender') || '';
    const type = c.req.query('type') || '';
    const status = c.req.query('status') || '';

    const db = drizzle(c.env.DB);
    const conditions = [];

    if (search) {
      conditions.push(
        like(membersTable.firstName, `%${search}%`) ||
        like(membersTable.lastName, `%${search}%`) ||
        like(membersTable.licence, `%${search}%`)
      );
    }

    if (gender) {
      conditions.push(eq(membersTable.gender, gender as 'M' | 'F'));
    }

    if (type) {
      conditions.push(eq(membersTable.type, type));
    }

    if (status) {
      conditions.push(eq(membersTable.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count query
    const countRes = await db.select({ count: sql<number>`count(*)` })
      .from(membersTable)
      .where(whereClause)
      .all();
    const total = countRes[0]?.count || 0;

    // Data query
    const offset = (page - 1) * limit;
    const members = await db.select()
      .from(membersTable)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .all();

    const totalPages = Math.ceil(total / limit) || 1;

    return c.json({
      success: true,
      data: members,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      }
    });
  });
  ```

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run apps/api/src/index.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  Run: `git add apps/api && git commit -m "feat(api): implement GET /members endpoint"`

---

### Task 4: API GET /members/:licence Endpoint

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/index.test.ts`

**Interfaces:**
- Produces: API endpoint `GET /members/:licence` returning details of a member.

- [ ] **Step 1: Write integration tests for GET /members/:licence**
  Add tests inside `apps/api/src/index.test.ts`:
  ```typescript
  // Add at the end of apps/api/src/index.test.ts

  describe('GET /members/:licence', () => {
    it('should return member details if found', async () => {
      const mockD1 = await setupMockDb();
      const db = drizzle(mockD1 as any);

      await db.insert(membersTable).values({
        licence: '7654321',
        lastName: 'Lemoine',
        firstName: 'Paul',
        gender: 'M',
        birthDate: '1992-04-18',
        status: 'valide',
        type: 'Competiteur',
        importedAt: new Date()
      }).run();

      const res = await app.request('http://localhost/members/7654321', undefined, { DB: mockD1 as any });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.firstName).toBe('Paul');
      expect(body.data.lastName).toBe('Lemoine');
    });

    it('should return 404 if member is not found', async () => {
      const mockD1 = await setupMockDb();
      const res = await app.request('http://localhost/members/9999999', undefined, { DB: mockD1 as any });
      expect(res.status).toBe(404);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run apps/api/src/index.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement GET /members/:licence in index.ts**
  Add the endpoint handler inside `apps/api/src/index.ts`:
  ```typescript
  // Add inside apps/api/src/index.ts

  app.get('/members/:licence', async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }

    const licence = c.req.param('licence');
    const db = drizzle(c.env.DB);

    const result = await db.select()
      .from(membersTable)
      .where(eq(membersTable.licence, licence))
      .all();

    if (result.length === 0) {
      return c.json({ success: false, error: 'Member not found' }, 404);
    }

    return c.json({
      success: true,
      data: result[0],
    });
  });
  ```

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run apps/api/src/index.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  Run: `git add apps/api && git commit -m "feat(api): implement GET /members/:licence endpoint"`

---

### Task 5: Listing Page UI and Svelte Component

**Files:**
- Create: `apps/admin-console/src/components/MembersTable.svelte`
- Create: `apps/admin-console/src/components/MembersTable.test.ts`
- Create: `apps/admin-console/src/pages/admin/members/index.astro`

**Interfaces:**
- Consumes: `API_SERVICE` GET `/members`.
- Produces: Visual list table with search and filters, paginated.

- [ ] **Step 1: Write a basic component layout test**
  Create `apps/admin-console/src/components/MembersTable.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { mount } from 'svelte';
  import MembersTable from './MembersTable.svelte';

  describe('MembersTable Component', () => {
    it('renders filter selections and member lines', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      mount(MembersTable, {
        target,
        props: {
          data: [
            { licence: '1111111', lastName: 'Martin', firstName: 'Jean', gender: 'M', birthDate: '1980-01-01', status: 'valide', type: 'Competiteur' }
          ],
          pagination: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1
          },
          filters: {
            search: '',
            gender: '',
            status: '',
            type: ''
          }
        }
      });

      expect(target.innerHTML).toContain('Martin');
      expect(target.innerHTML).toContain('Jean');
      expect(target.innerHTML).toContain('1111111');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run apps/admin-console/src/components/MembersTable.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement Svelte 5 MembersTable component**
  Create `apps/admin-console/src/components/MembersTable.svelte`:
  ```html
  <script lang="ts">
    import { Search, ChevronLeft, ChevronRight, User } from 'lucide-svelte';

    interface Member {
      licence: string;
      lastName: string;
      firstName: string;
      gender: 'M' | 'F';
      birthDate: string;
      status: string;
      type: string;
    }

    interface Pagination {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }

    interface Filters {
      search: string;
      gender: string;
      status: string;
      type: string;
    }

    let { data = [], pagination, filters }: { data: Member[]; pagination: Pagination; filters: Filters } = $props();

    let searchInput = $state(filters.search);
    let selectedGender = $state(filters.gender);
    let selectedStatus = $state(filters.status);
    let selectedType = $state(filters.type);

    function applyFilters() {
      const params = new URLSearchParams();
      if (searchInput) params.set('search', searchInput);
      if (selectedGender) params.set('gender', selectedGender);
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedType) params.set('type', selectedType);
      params.set('page', '1'); // reset page on filter change
      window.location.href = `/admin/members?${params.toString()}`;
    }

    function changePage(newPage: number) {
      if (newPage < 1 || newPage > pagination.totalPages) return;
      const params = new URLSearchParams(window.location.search);
      params.set('page', newPage.toString());
      window.location.href = `/admin/members?${params.toString()}`;
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        applyFilters();
      }
    }
  </script>

  <div class="space-y-4">
    <!-- Filters Block -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
      <div class="relative">
        <span class="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
          <Search class="w-4 h-4" />
        </span>
        <input
          type="text"
          placeholder="Rechercher (Nom, Licence...)"
          class="w-full pl-9 pr-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          bind:value={searchInput}
          onkeydown={handleKeydown}
        />
      </div>

      <div>
        <select
          class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          bind:value={selectedGender}
          onchange={applyFilters}
        >
          <option value="">Tous les genres</option>
          <option value="M">Homme (M)</option>
          <option value="F">Femme (F)</option>
        </select>
      </div>

      <div>
        <select
          class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          bind:value={selectedType}
          onchange={applyFilters}
        >
          <option value="">Tous les types</option>
          <option value="Competiteur">Compétiteur</option>
          <option value="Loisir">Loisir</option>
        </select>
      </div>

      <div>
        <select
          class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          bind:value={selectedStatus}
          onchange={applyFilters}
        >
          <option value="">Tous les statuts</option>
          <option value="valide">Valide</option>
          <option value="suspendu">Suspendu</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead class="bg-muted text-muted-foreground font-medium border-b border-border">
            <tr>
              <th class="p-4">Adhérent</th>
              <th class="p-4">Licence</th>
              <th class="p-4">Genre</th>
              <th class="p-4">Type</th>
              <th class="p-4">Statut</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each data as member}
              <tr class="hover:bg-muted/50 transition-colors">
                <td class="p-4 font-medium flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <User class="w-4 h-4" />
                  </div>
                  <div>
                    <div class="font-semibold">{member.lastName} {member.firstName}</div>
                    <div class="text-xs text-muted-foreground">Né le {member.birthDate}</div>
                  </div>
                </td>
                <td class="p-4 text-muted-foreground">{member.licence}</td>
                <td class="p-4">{member.gender}</td>
                <td class="p-4">
                  <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-secondary/50 border border-secondary text-foreground">
                    {member.type}
                  </span>
                </td>
                <td class="p-4">
                  {#if member.status === 'valide'}
                    <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      Valide
                    </span>
                  {:else}
                    <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-destructive/15 border border-destructive/30 text-destructive">
                      Suspendu
                    </span>
                  {/if}
                </td>
                <td class="p-4 text-right">
                  <a
                    href={`/admin/members/${member.licence}`}
                    class="inline-flex items-center justify-center px-3 py-1.5 border border-border bg-background hover:bg-muted font-medium text-xs rounded-md shadow-sm"
                  >
                    Voir profil
                  </a>
                </td>
              </tr>
            {:else}
              <tr>
                <td colspan="6" class="p-8 text-center text-muted-foreground">
                  Aucun adhérent ne correspond à ces critères de recherche.
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="p-4 border-t border-border flex items-center justify-between">
        <div class="text-xs text-muted-foreground">
          Total : {pagination.total} adhérent(s)
        </div>
        <div class="flex items-center gap-4">
          <span class="text-xs">
            Page {pagination.page} sur {pagination.totalPages}
          </span>
          <div class="flex gap-1">
            <button
              class="p-2 border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onclick={() => changePage(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <button
              class="p-2 border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              onclick={() => changePage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  ```

- [ ] **Step 4: Create listing index.astro page**
  Create `apps/admin-console/src/pages/admin/members/index.astro`:
  ```astro
  ---
  import Layout from '../../../layouts/Layout.astro';
  import AdminLayout from '../../../components/AdminLayout.svelte';
  import MembersTable from '../../../components/MembersTable.svelte';

  const page = Astro.url.searchParams.get('page') || '1';
  const search = Astro.url.searchParams.get('search') || '';
  const gender = Astro.url.searchParams.get('gender') || '';
  const type = Astro.url.searchParams.get('type') || '';
  const status = Astro.url.searchParams.get('status') || '';

  const apiService = Astro.locals.runtime.env.API_SERVICE;
  const queryParams = new URLSearchParams({ page, limit: '20', search, gender, type, status });

  let membersData = { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
  let errorMsg = '';

  try {
    const res = await apiService.fetch(`http://localhost/members?${queryParams.toString()}`);
    if (!res.ok) {
      throw new Error('Impossible de récupérer la liste des adhérents');
    }
    membersData = await res.json();
  } catch (err: any) {
    errorMsg = err.message || 'Une erreur est survenue lors de la récupération.';
  }
  ---

  <Layout title="Gestion des Adhérents - NBA 91">
    <AdminLayout client:load>
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold tracking-tight">Adhérents</h1>
            <p class="text-muted-foreground mt-2">
              Consultez et recherchez les membres inscrits au club.
            </p>
          </div>
          <a
            href="/admin/members/import"
            class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow hover:bg-primary/90"
          >
            Importer
          </a>
        </div>

        {errorMsg && (
          <div class="p-4 bg-destructive/15 border border-destructive text-destructive rounded-lg">
            {errorMsg}
          </div>
        )}

        <MembersTable
          client:load
          data={membersData.data}
          pagination={membersData.pagination}
          filters={{ search, gender, type, status }}
        />
      </div>
    </AdminLayout>
  </Layout>
  ```

- [ ] **Step 5: Verify unit tests pass**
  Run: `npx vitest run apps/admin-console/src/components/MembersTable.test.ts`
  Expected: PASS.

- [ ] **Step 6: Verify Astro compile**
  Run: `npx astro check --root apps/admin-console`
  Expected: Success without errors.

- [ ] **Step 7: Commit**
  Run: `git add apps/admin-console && git commit -m "feat(admin-console): build MembersTable listing and Astro page"`

---

### Task 6: Detail Page UI and Svelte Component

**Files:**
- Create: `apps/admin-console/src/components/MemberProfile.svelte`
- Create: `apps/admin-console/src/components/MemberProfile.test.ts`
- Create: `apps/admin-console/src/pages/admin/members/[licence].astro`

**Interfaces:**
- Consumes: Single member record from page router.

- [ ] **Step 1: Write a basic component layout test**
  Create `apps/admin-console/src/components/MemberProfile.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { mount } from 'svelte';
  import MemberProfile from './MemberProfile.svelte';

  describe('MemberProfile Component', () => {
    it('renders profile card containing personal, contact and metadata fields', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      mount(MemberProfile, {
        target,
        props: {
          member: {
            licence: '1234567',
            lastName: 'Dupont',
            firstName: 'Jean',
            gender: 'M',
            birthDate: '1990-01-01',
            email: 'jean.dupont@example.com',
            phone: '0612345678',
            status: 'valide',
            type: 'Competiteur',
            importedAt: '2026-07-07T12:00:00Z'
          }
        }
      });

      expect(target.innerHTML).toContain('Dupont Jean');
      expect(target.innerHTML).toContain('1234567');
      expect(target.innerHTML).toContain('jean.dupont@example.com');
      expect(target.innerHTML).toContain('0612345678');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run apps/admin-console/src/components/MemberProfile.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement Svelte 5 MemberProfile component**
  Create `apps/admin-console/src/components/MemberProfile.svelte`:
  ```html
  <script lang="ts">
    import { ArrowLeft, User, Mail, Phone, Calendar, Shield, CreditCard, Tag } from 'lucide-svelte';

    interface Member {
      licence: string;
      lastName: string;
      firstName: string;
      gender: 'M' | 'F';
      birthDate: string;
      email: string | null;
      phone: string | null;
      status: string;
      type: string;
      importedAt: string;
    }

    let { member }: { member: Member } = $props();

    function formatImportedAt(importedAt: string) {
      if (!importedAt) return '-';
      const date = new Date(importedAt);
      return date.toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    }
  </script>

  <div class="space-y-6 max-w-3xl mx-auto">
    <a
      href="/admin/members"
      class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft class="w-4 h-4" />
      Retour à la liste des adhérents
    </a>

    <!-- Profile Header Card -->
    <div class="bg-card border border-border rounded-lg p-6 shadow-sm flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <User class="w-8 h-8" />
        </div>
        <div>
          <h2 class="text-2xl font-bold">{member.lastName} {member.firstName}</h2>
          <p class="text-sm text-muted-foreground mt-1">Licence : {member.licence}</p>
        </div>
      </div>
      <div>
        {#if member.status === 'valide'}
          <span class="px-3 py-1.5 text-sm font-semibold rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            Valide
          </span>
        {:else}
          <span class="px-3 py-1.5 text-sm font-semibold rounded-full bg-destructive/15 border border-destructive/30 text-destructive">
            Suspendu
          </span>
        {/if}
      </div>
    </div>

    <!-- Details Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Personal Details -->
      <div class="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
        <h3 class="font-semibold text-lg flex items-center gap-2 border-b border-border pb-2">
          <Shield class="w-5 h-5 text-primary" />
          Informations personnelles
        </h3>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <Calendar class="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <div class="text-xs text-muted-foreground">Date de naissance</div>
              <div class="text-sm font-medium">{member.birthDate}</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Tag class="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <div class="text-xs text-muted-foreground">Genre</div>
              <div class="text-sm font-medium">{member.gender === 'M' ? 'Homme' : 'Femme'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Subscription Details -->
      <div class="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4">
        <h3 class="font-semibold text-lg flex items-center gap-2 border-b border-border pb-2">
          <CreditCard class="w-5 h-5 text-primary" />
          Adhésion & Import
        </h3>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <Tag class="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <div class="text-xs text-muted-foreground">Formule d'adhésion</div>
              <div class="text-sm font-medium">{member.type}</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Calendar class="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <div class="text-xs text-muted-foreground">Date d'importation Poona</div>
              <div class="text-sm font-medium">{formatImportedAt(member.importedAt)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact Details -->
      <div class="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4 md:col-span-2">
        <h3 class="font-semibold text-lg flex items-center gap-2 border-b border-border pb-2">
          <Mail class="w-5 h-5 text-primary" />
          Coordonnées de contact
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex items-center gap-3">
            <Mail class="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <div class="text-xs text-muted-foreground">Adresse Email</div>
              <div class="text-sm font-medium break-all">{member.email || 'Non renseigné'}</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <Phone class="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <div class="text-xs text-muted-foreground">Numéro de téléphone</div>
              <div class="text-sm font-medium">{member.phone || 'Non renseigné'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  ```

- [ ] **Step 4: Create dynamic detail [licence].astro route**
  Create `apps/admin-console/src/pages/admin/members/[licence].astro`:
  ```astro
  ---
  import Layout from '../../../layouts/Layout.astro';
  import AdminLayout from '../../../components/AdminLayout.svelte';
  import MemberProfile from '../../../components/MemberProfile.svelte';

  const { licence } = Astro.params;
  const apiService = Astro.locals.runtime.env.API_SERVICE;

  let member = null;
  let errorMsg = '';

  try {
    const res = await apiService.fetch(`http://localhost/members/${licence}`);
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Adhérent avec la licence ${licence} introuvable.`);
      }
      throw new Error('Erreur de communication avec le service API.');
    }
    const body = await res.json();
    member = body.data;
  } catch (err: any) {
    errorMsg = err.message || 'Une erreur inattendue est survenue.';
  }
  ---

  <Layout title={member ? `Profil ${member.lastName} ${member.firstName} - NBA 91` : "Profil Adhérent - NBA 91"}>
    <AdminLayout client:load>
      <div class="space-y-6">
        {errorMsg && (
          <div class="max-w-3xl mx-auto space-y-4">
            <div class="p-4 bg-destructive/15 border border-destructive text-destructive rounded-lg">
              {errorMsg}
            </div>
            <a href="/admin/members" class="text-sm text-primary hover:underline">
              &larr; Retour à la liste des adhérents
            </a>
          </div>
        )}

        {member && <MemberProfile client:load {member} />}
      </div>
    </AdminLayout>
  </Layout>
  ```

- [ ] **Step 5: Verify unit tests pass**
  Run: `npx vitest run apps/admin-console/src/components/MemberProfile.test.ts`
  Expected: PASS.

- [ ] **Step 6: Run full verification build check**
  Run: `npx vitest run`
  Run: `npx astro check --root apps/admin-console && npx astro build --root apps/admin-console`
  Expected: ALL PASS.

- [ ] **Step 7: Commit**
  Run: `git add apps/admin-console && git commit -m "feat(admin-console): build MemberProfile details component and Astro dynamic route"`

- [ ] **Step 8: Push to remote repo**
  Run: `git push origin main`
  Expected: Success.
