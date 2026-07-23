# Plan d'Implémentation : Grand Livre Simple Flux & Rapports AG

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place la comptabilité simple flux du club de badminton (NBA 91), permettant la saisie des dépenses, des recettes et des transferts internes par saison, ainsi que la génération de rapports pour l'AG.

**Architecture:** Approche relationnelle Drizzle ORM avec deux nouvelles tables (`season_balances` et `transactions`), exposées par des endpoints Hono API, et consommées par des composants Svelte 5 de la console d'administration Astro.

**Tech Stack:** Astro v7, Svelte v5, Hono (Cloudflare Workers), Drizzle ORM (SQLite / D1), Vitest.

## Global Constraints
* Utiliser les versions récentes d'Astro, Svelte (v5), Tailwind CSS (v4).
* Les tests unitaires et d'intégration doivent utiliser Vitest.
* Le code TypeScript doit compiler sans erreurs strictes.
* Les montants monétaires sont stockés sous forme d'entiers en centimes pour éviter tout problème d'arrondi de nombres flottants.

---

### Task 1 : Schéma de Base de Données & Migrations Drizzle

**Files:**
* Modify: `libs/shared/db/src/schema.ts`
* Modify: `libs/shared/db/src/db.test.ts`
* Create: `libs/shared/db/migrations/0004_create_accounting_tables.sql` (généré par Drizzle-Kit)

**Interfaces:**
* Produces: `seasonBalancesTable` et `transactionsTable` dans le module `@nba/db` (exposé par index.ts).

- [ ] **Step 1: Mettre à jour le schéma Drizzle**
  Ouvrir [schema.ts](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/schema.ts) et ajouter les définitions des tables `seasonBalancesTable` et `transactionsTable` à la fin du fichier :
  ```typescript
  export const seasonBalancesTable = sqliteTable('season_balances', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    seasonId: text('season_id').notNull().references(() => seasonsTable.id),
    accountId: text('account_id', { enum: ['current', 'savings', 'cash'] }).notNull(),
    initialBalance: integer('initial_balance').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  }, (table) => ({
    seasonAccountUnq: uniqueIndex('season_account_idx').on(table.seasonId, table.accountId),
  }));

  export const transactionsTable = sqliteTable('transactions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    seasonId: text('season_id').notNull().references(() => seasonsTable.id),
    type: text('type', { enum: ['recette', 'depense', 'transfert'] }).notNull(),
    accountId: text('account_id', { enum: ['current', 'savings', 'cash'] }).notNull(),
    destinationAccountId: text('destination_account_id', { enum: ['current', 'savings', 'cash'] }),
    category: text('category'),
    amount: integer('amount').notNull(),
    date: text('date').notNull(), // Format YYYY-MM-DD
    paymentMethod: text('payment_method', { 
      enum: ['virement', 'cheque', 'especes', 'labaz', 'ancv', 'pass_sport', 'ticket_loisir', 'up_loisir'] 
    }).notNull(),
    description: text('description').notNull(),
    reference: text('reference'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  });
  ```

- [ ] **Step 2: Mettre à jour l'export public**
  Vérifier que les nouvelles tables sont exportées dans le fichier barrel [index.ts](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/index.ts). Si le fichier exporte déjà tout via `export * from './schema'`, aucune modification n'est nécessaire.

- [ ] **Step 3: Écrire les tests unitaires de base de données**
  Ajouter un test dans [db.test.ts](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/db.test.ts) pour valider l'insertion de soldes initiaux et de transactions :
  ```typescript
  it('should insert season balances and transactions correctly', async () => {
    const db = drizzle(mockD1 as any);

    // Insérer un solde initial
    const balance = {
      seasonId: '25-26',
      accountId: 'current' as const,
      initialBalance: 150000, // 1500,00 €
      createdAt: new Date()
    };
    const [insertedBalance] = await db.insert(seasonBalancesTable).values(balance).returning();
    expect(insertedBalance.initialBalance).toBe(150000);

    // Insérer une transaction
    const transaction = {
      seasonId: '25-26',
      type: 'recette' as const,
      accountId: 'current' as const,
      category: 'adhesions',
      amount: 4500, // 45,00 €
      date: '2026-07-13',
      paymentMethod: 'virement' as const,
      description: 'Adhésion Dupont Jean',
      createdAt: new Date()
    };
    const [insertedTx] = await db.insert(transactionsTable).values(transaction).returning();
    expect(insertedTx.amount).toBe(4500);
    expect(insertedTx.category).toBe('adhesions');
  });
  ```
  *(S'assurer d'importer `seasonBalancesTable` et `transactionsTable` au début du fichier de test.)*

- [ ] **Step 4: Générer le fichier de migration SQL**
  Depuis la racine ou le répertoire de la lib db, lancer :
  ```bash
  npx drizzle-kit generate --config=libs/shared/db/drizzle.config.ts
  ```
  Expected: Création de `libs/shared/db/migrations/0004_create_accounting_tables.sql` contenant les instructions DDL.

- [ ] **Step 5: Appliquer la migration localement**
  Appliquer la migration D1 locale :
  ```bash
  npx wrangler d1 migrations apply nba-db --local --config apps/api/wrangler.json
  ```
  Expected: "Executed successfully" / ✅.

- [ ] **Step 6: Exécuter les tests unitaires de la base de données**
  Lancer :
  ```bash
  npx vitest run libs/shared/db
  ```
  Expected: PASS.

- [ ] **Step 7: Valider et commiter**
  ```bash
  git add libs/shared/db
  git commit -m "chore(db): create season_balances and transactions tables with migrations"
  ```

---

### Task 2 : Endpoints de l'API Hono (Back-end)

**Files:**
* Modify: `apps/api/src/index.ts`
* Modify: `apps/api/src/index.test.ts`

**Interfaces:**
* Consumes: `seasonBalancesTable` et `transactionsTable` de `@nba/db`.
* Produces: Endpoints HTTP `/seasons/:seasonId/balances`, `/transactions`, `/transactions/:id`, et `/seasons/:seasonId/reports`.

- [ ] **Step 1: Importer les schémas dans l'API**
  Ouvrir [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) et mettre à jour l'import de la base de données :
  ```typescript
  import { membersTable, seasonsTable, seasonBalancesTable, transactionsTable } from '../../../libs/shared/db/src/schema';
  ```

- [ ] **Step 2: Implémenter les routes GET et POST pour les soldes initiaux**
  Ajouter à la fin de [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) :
  ```typescript
  app.get('/seasons/:seasonId/balances', async (c) => {
    const seasonId = c.req.param('seasonId');
    const db = drizzle(c.env.DB);
    const balances = await db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();
    return c.json({ success: true, data: balances });
  });

  app.post('/seasons/:seasonId/balances', async (c) => {
    const seasonId = c.req.param('seasonId');
    const body = await c.req.json() as { accountId: 'current' | 'savings' | 'cash'; initialBalance: number }[];
    const db = drizzle(c.env.DB);

    for (const item of body) {
      await db.insert(seasonBalancesTable)
        .values({
          seasonId,
          accountId: item.accountId,
          initialBalance: item.initialBalance,
          createdAt: new Date()
        })
        .onConflictDoUpdate({
          target: [seasonBalancesTable.seasonId, seasonBalancesTable.accountId],
          set: { initialBalance: item.initialBalance }
        })
        .run();
    }

    return c.json({ success: true });
  });
  ```

- [ ] **Step 3: Implémenter les routes CRUD pour les transactions**
  Ajouter également dans [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) :
  ```typescript
  app.get('/transactions', async (c) => {
    const seasonId = c.req.query('season');
    if (!seasonId) {
      return c.json({ success: false, error: 'Missing season query parameter' }, 400);
    }
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    const db = drizzle(c.env.DB);
    const conditions = [eq(transactionsTable.seasonId, seasonId)];

    const accountId = c.req.query('accountId');
    if (accountId) {
      conditions.push(or(eq(transactionsTable.accountId, accountId), eq(transactionsTable.destinationAccountId, accountId)));
    }

    const type = c.req.query('type');
    if (type) {
      conditions.push(eq(transactionsTable.type, type));
    }

    const category = c.req.query('category');
    if (category) {
      conditions.push(eq(transactionsTable.category, category));
    }

    const totalRes = await db.select({ count: sql<number>`count(*)` })
      .from(transactionsTable)
      .where(and(...conditions))
      .get();
    const total = totalRes?.count || 0;

    const transactions = await db.select()
      .from(transactionsTable)
      .where(and(...conditions))
      .orderBy(desc(transactionsTable.date), desc(transactionsTable.id))
      .limit(limit)
      .offset(offset)
      .all();

    return c.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  });

  app.post('/transactions', async (c) => {
    const body = await c.req.json() as any;
    const db = drizzle(c.env.DB);

    // Valider les champs requis
    if (!body.seasonId || !body.type || !body.accountId || !body.amount || !body.date || !body.paymentMethod || !body.description) {
      return c.json({ success: false, error: 'Champs requis manquants.' }, 400);
    }

    if (body.type === 'transfert') {
      if (!body.destinationAccountId || body.accountId === body.destinationAccountId) {
        return c.json({ success: false, error: 'Le compte destinataire doit être différent du compte source.' }, 400);
      }
    } else {
      if (!body.category) {
        return c.json({ success: false, error: 'La catégorie est obligatoire pour les recettes/dépenses.' }, 400);
      }
    }

    const [inserted] = await db.insert(transactionsTable).values({
      seasonId: body.seasonId,
      type: body.type,
      accountId: body.accountId,
      destinationAccountId: body.type === 'transfert' ? body.destinationAccountId : null,
      category: body.type !== 'transfert' ? body.category : null,
      amount: Math.round(body.amount),
      date: body.date,
      paymentMethod: body.paymentMethod,
      description: body.description,
      reference: body.reference || null,
      createdAt: new Date()
    }).returning();

    return c.json({ success: true, data: inserted });
  });

  app.delete('/transactions/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const db = drizzle(c.env.DB);
    await db.delete(transactionsTable).where(eq(transactionsTable.id, id)).run();
    return c.json({ success: true });
  });
  ```

- [ ] **Step 4: Implémenter l'endpoint du Rapport de l'AG**
  Ajouter l'endpoint de statistiques dans [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) :
  ```typescript
  app.get('/seasons/:seasonId/reports', async (c) => {
    const seasonId = c.req.param('seasonId');
    const db = drizzle(c.env.DB);

    // Récupérer les soldes initiaux
    const balances = await db.select().from(seasonBalancesTable).where(eq(seasonBalancesTable.seasonId, seasonId)).all();
    
    // Récupérer toutes les transactions de la saison
    const allTxs = await db.select().from(transactionsTable).where(eq(transactionsTable.seasonId, seasonId)).all();

    // 1. Calcul du compte de résultat (ventilé par catégorie)
    const categoryTotals: Record<string, { type: 'recette' | 'depense', total: number }> = {};
    let totalRecettes = 0;
    let totalDepenses = 0;

    for (const tx of allTxs) {
      if (tx.type === 'transfert') continue;
      
      const cat = tx.category || 'divers';
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { type: tx.type, total: 0 };
      }
      categoryTotals[cat].total += tx.amount;
      
      if (tx.type === 'recette') {
        totalRecettes += tx.amount;
      } else {
        totalDepenses += tx.amount;
      }
    }

    // 2. Calcul du bilan de trésorerie (init vs final)
    const accounts = ['current', 'savings', 'cash'] as const;
    const reportBalances = accounts.map(acc => {
      const initBal = balances.find(b => b.accountId === acc)?.initialBalance || 0;
      
      // Calculer le solde final pour ce compte
      let finalBal = initBal;
      for (const tx of allTxs) {
        if (tx.type === 'recette' && tx.accountId === acc) {
          finalBal += tx.amount;
        } else if (tx.type === 'depense' && tx.accountId === acc) {
          finalBal -= tx.amount;
        } else if (tx.type === 'transfert') {
          if (tx.accountId === acc) finalBal -= tx.amount; // Sortie du compte source
          if (tx.destinationAccountId === acc) finalBal += tx.amount; // Entrée sur compte cible
        }
      }

      return {
        accountId: acc,
        initialBalance: initBal,
        finalBalance: finalBal
      };
    });

    return c.json({
      success: true,
      data: {
        compteResultat: {
          totalRecettes,
          totalDepenses,
          netResult: totalRecettes - totalDepenses,
          categories: categoryTotals
        },
        bilanTrésorerie: reportBalances
      }
    });
  });
  ```

- [ ] **Step 5: Écrire les tests d'intégration de l'API**
  Ajouter un bloc de tests d'intégration dans [index.test.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.test.ts) :
  ```typescript
  describe('Accounting API Endpoints', () => {
    it('should manage season balances, transactions, and generate reports', async () => {
      const mockD1 = await setupMockDb();

      // 1. Post initial balance
      const balRes = await app.request('http://localhost/seasons/25-26/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { accountId: 'current', initialBalance: 100000 }, // 1000 €
          { accountId: 'cash', initialBalance: 5000 }      // 50 €
        ])
      }, { DB: mockD1 as any });
      expect(balRes.status).toBe(200);

      // 2. Add dynamic transaction
      const txRes = await app.request('http://localhost/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 'adhesions',
          amount: 25000, // 250 €
          date: '2026-07-13',
          paymentMethod: 'virement',
          description: 'Cotisation Dupont'
        })
      }, { DB: mockD1 as any });
      expect(txRes.status).toBe(200);

      // 3. Add internal transfer (current -> cash)
      const transferRes = await app.request('http://localhost/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: '25-26',
          type: 'transfert',
          accountId: 'current',
          destinationAccountId: 'cash',
          amount: 20000, // 200 €
          date: '2026-07-13',
          paymentMethod: 'virement',
          description: 'Approvisionnement Caisse'
        })
      }, { DB: mockD1 as any });
      expect(transferRes.status).toBe(200);

      // 4. Fetch reports and assert correct balances
      const reportRes = await app.request('http://localhost/seasons/25-26/reports', undefined, { DB: mockD1 as any });
      expect(reportRes.status).toBe(200);
      const report = await reportRes.json() as any;
      expect(report.success).toBe(true);

      const pnl = report.data.compteResultat;
      expect(pnl.totalRecettes).toBe(25000);
      expect(pnl.categories.adhesions.total).toBe(25000);

      const balances = report.data.bilanTrésorerie;
      // Compte courant : 1000 € (init) + 250 € (recette) - 200 € (transfert) = 1050 €
      const current = balances.find((b: any) => b.accountId === 'current');
      expect(current.initialBalance).toBe(100000);
      expect(current.finalBalance).toBe(105000);

      // Caisse : 50 € (init) + 200 € (transfert) = 250 €
      const cash = balances.find((b: any) => b.accountId === 'cash');
      expect(cash.initialBalance).toBe(5000);
      expect(cash.finalBalance).toBe(25000);
    });
  });
  ```

- [ ] **Step 6: Exécuter les tests de l'API**
  Lancer :
  ```bash
  npx vitest run apps/api
  ```
  Expected: All 11 tests PASS.

- [ ] **Step 7: Commiter**
  ```bash
  git add apps/api
  git commit -m "feat(api): add accounting CRUD and reports endpoints with Vitest integration tests"
  ```

---

### Task 3 : Interface du Grand Livre (Astro / Svelte)

**Files:**
* Create: `apps/admin-console/src/pages/admin/compta/index.astro`
* Create: `apps/admin-console/src/components/TransactionLedger.svelte`

**Interfaces:**
* Consumes: `GET /transactions`, `POST /transactions`, `DELETE /transactions/:id`, et `GET /seasons/:seasonId/reports`.
* Produces: Page `/admin/compta` interactive avec listes et saisies.

- [ ] **Step 1: Créer le composant Svelte TransactionLedger.svelte**
  Créer le fichier [TransactionLedger.svelte](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/components/TransactionLedger.svelte) :
  ```html
  <script lang="ts">
    import { Search, Plus, Trash2, ArrowLeftRight, Check, AlertCircle } from 'lucide-svelte';

    interface Transaction {
      id: number;
      type: 'recette' | 'depense' | 'transfert';
      accountId: 'current' | 'savings' | 'cash';
      destinationAccountId: 'current' | 'savings' | 'cash' | null;
      category: string | null;
      amount: number;
      date: string;
      paymentMethod: string;
      description: string;
      reference: string | null;
    }

    interface Pagination {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }

    interface BalanceReport {
      accountId: 'current' | 'savings' | 'cash';
      initialBalance: number;
      finalBalance: number;
    }

    let {
      transactions = [],
      pagination,
      seasonId,
      balances = []
    }: {
      transactions: Transaction[];
      pagination: Pagination;
      seasonId: string;
      balances: BalanceReport[];
    } = $props();

    // Saisie formulaire
    let showPanel = $state<'recette' | 'depense' | 'transfert' | null>(null);
    let amount = $state('');
    let date = $state(new Date().toISOString().split('T')[0]);
    let category = $state('adhesions');
    let accountId = $state<'current' | 'savings' | 'cash'>('current');
    let destinationAccountId = $state<'current' | 'savings' | 'cash'>('cash');
    let paymentMethod = $state('virement');
    let description = $state('');
    let reference = $state('');
    let isSubmitting = $state(false);
    let errorMsg = $state('');

    const accountLabels = {
      current: 'Compte Courant',
      savings: 'Compte Livret',
      cash: 'Caisse Physique'
    };

    const methodLabels = {
      virement: 'Virement',
      cheque: 'Chèque',
      especes: 'Espèces',
      labaz: 'LABAZ',
      ancv: 'ANCV',
      pass_sport: 'Pass\'Sport',
      ticket_loisir: 'Ticket Loisir',
      up_loisir: 'Up & Loisir'
    };

    const categories = [
      { id: 'adhesions', name: 'Adhésions / Inscriptions' },
      { id: 'partenariats', name: 'Partenariats / Sponsoring' },
      { id: 'subventions', name: 'Subventions' },
      { id: 'buvette', name: 'Buvette' },
      { id: 'boutique', name: 'Boutique & Cordages' },
      { id: 'evenements', name: 'Événements (Action Jeunes...)' },
      { id: 'stages', name: 'Stages' },
      { id: 'salaires', name: 'Salaires' },
      { id: 'achats_boutique', name: 'Achats Boutique (Revente)' },
      { id: 'achats_club', name: 'Achats Club (Matériel)' },
      { id: 'licences_ffbad', name: 'Licences FFBad' },
      { id: 'championnats', name: 'Inscriptions Championnats' },
      { id: 'formations', name: 'Formations' },
      { id: 'evenements_club', name: 'Dépenses Événements' },
      { id: 'frais_deplacement', name: 'Frais Déplacement' },
      { id: 'assurances', name: 'Assurances' },
      { id: 'frais_administratifs', name: 'Frais Admin / Banque' },
      { id: 'divers_recette', name: 'Divers Recette' },
      { id: 'divers_depense', name: 'Divers Dépense' }
    ];

    function getAccountBalance(acc: 'current' | 'savings' | 'cash') {
      const match = balances.find(b => b.accountId === acc);
      return match ? (match.finalBalance / 100).toFixed(2) : '0.00';
    }

    async function handleAddTransaction(e: Event) {
      e.preventDefault();
      errorMsg = '';
      const floatAmount = parseFloat(amount);
      if (isNaN(floatAmount) || floatAmount <= 0) {
        errorMsg = 'Le montant doit être un nombre positif.';
        return;
      }

      isSubmitting = true;
      try {
        const res = await fetch('/admin/compta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            seasonId,
            type: showPanel,
            accountId,
            destinationAccountId: showPanel === 'transfert' ? destinationAccountId : null,
            category: showPanel !== 'transfert' ? category : null,
            amount: floatAmount * 100, // conversion en centimes
            date,
            paymentMethod,
            description,
            reference
          })
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Impossible de créer la transaction');
        }

        window.location.reload();
      } catch (err: any) {
        errorMsg = err.message || 'Une erreur est survenue.';
        isSubmitting = false;
      }
    }

    async function handleDelete(id: number) {
      if (!confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) return;

      try {
        const res = await fetch('/admin/compta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id })
        });
        if (!res.ok) throw new Error('Impossible de supprimer.');
        window.location.reload();
      } catch (err: any) {
        alert(err.message);
      }
    }
  </script>

  <div class="space-y-6">
    <!-- Bandeau des Soldes -->
    <div class="grid gap-4 md:grid-cols-3">
      {#each Object.entries(accountLabels) as [key, label]}
        <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 class="text-sm font-medium text-muted-foreground">{label}</h3>
          <div class="text-3xl font-bold mt-2">{getAccountBalance(key as any)} €</div>
        </div>
      {/each}
    </div>

    <!-- Actions Bar -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h2 class="text-xl font-bold tracking-tight">Journal des écritures</h2>
      <div class="flex items-center gap-3">
        <button
          onclick={() => { showPanel = 'recette'; amount = ''; description = ''; }}
          class="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 shadow transition-colors"
        >
          Saisir Recette
        </button>
        <button
          onclick={() => { showPanel = 'depense'; amount = ''; description = ''; }}
          class="px-4 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-md hover:bg-destructive/90 shadow transition-colors"
        >
          Saisir Dépense
        </button>
        <button
          onclick={() => { showPanel = 'transfert'; amount = ''; description = ''; }}
          class="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 shadow transition-colors"
        >
          Virement Interne
        </button>
      </div>
    </div>

    <!-- Tableau -->
    <div class="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead class="bg-muted text-muted-foreground font-medium border-b border-border">
            <tr>
              <th class="p-4">Date</th>
              <th class="p-4">Type</th>
              <th class="p-4">Compte(s)</th>
              <th class="p-4">Catégorie</th>
              <th class="p-4">Libellé</th>
              <th class="p-4 text-right">Montant</th>
              <th class="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each transactions as tx}
              <tr class="hover:bg-muted/50 transition-colors">
                <td class="p-4">{tx.date}</td>
                <td class="p-4">
                  {#if tx.type === 'recette'}
                    <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Recette</span>
                  {:else}
                    <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-destructive/15 text-destructive">Dépense</span>
                  {/if}
                </td>
                <td class="p-4">
                  {#if tx.type === 'transfert'}
                    <span class="text-xs">{accountLabels[tx.accountId]} ➔ {accountLabels[tx.destinationAccountId!]}</span>
                  {:else}
                    <span class="text-xs">{accountLabels[tx.accountId]}</span>
                  {/if}
                </td>
                <td class="p-4">{tx.category ? (categories.find(c => c.id === tx.category)?.name || tx.category) : 'Transfert'}</td>
                <td class="p-4 font-medium">{tx.description}</td>
                <td class="p-4 text-right font-bold">
                  {#if tx.type === 'recette'}
                    <span class="text-emerald-600 dark:text-emerald-400">+{(tx.amount / 100).toFixed(2)} €</span>
                  {:else}
                    <span class="text-destructive">-{(tx.amount / 100).toFixed(2)} €</span>
                  {/if}
                </td>
                <td class="p-4 text-right">
                  <button onclick={() => handleDelete(tx.id)} class="text-muted-foreground hover:text-destructive p-1 rounded" aria-label="Supprimer">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            {/each}
            {#if transactions.length === 0}
              <tr>
                <td colspan="7" class="p-8 text-center text-muted-foreground">Aucune écriture comptable pour cette saison.</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modale de saisie coulissante -->
    {#if showPanel}
      <div class="fixed inset-0 z-50 flex justify-end">
        <button type="button" class="fixed inset-0 bg-black/40 border-0 cursor-default" onclick={() => showPanel = null} aria-label="Close modal"></button>
        <div class="relative w-full max-w-md bg-card border-l border-border h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
          <form onsubmit={handleAddTransaction} class="space-y-4">
            <h3 class="text-lg font-bold">
              {#if showPanel === 'recette'}🟢 Saisir une recette{:else if showPanel === 'depense'}🔴 Saisir une dépense{:else}🔵 Faire un virement interne{/if}
            </h3>

            {#if errorMsg}
              <div class="p-3 bg-destructive/15 border border-destructive text-destructive text-xs rounded-md flex items-center gap-2">
                <AlertCircle class="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            {/if}

            <div>
              <label for="amount-input" class="block text-sm font-medium mb-1">Montant (€)</label>
              <input id="amount-input" type="number" step="0.01" min="0.01" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={amount} required />
            </div>

            <div>
              <label for="date-input" class="block text-sm font-medium mb-1">Date</label>
              <input id="date-input" type="date" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={date} required />
            </div>

            {#if showPanel !== 'transfert'}
              <div>
                <label for="category-select" class="block text-sm font-medium mb-1">Catégorie</label>
                <select id="category-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={category}>
                  {#each categories as cat}
                    <option value={cat.id}>{cat.name}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <div>
              <label for="account-select" class="block text-sm font-medium mb-1">
                {#if showPanel === 'transfert'}Compte Source{:else}Compte financier{/if}
              </label>
              <select id="account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={accountId}>
                {#each Object.entries(accountLabels) as [key, label]}
                  <option value={key}>{label}</option>
                {/each}
              </select>
            </div>

            {#if showPanel === 'transfert'}
              <div>
                <label for="dest-account-select" class="block text-sm font-medium mb-1">Compte Destinataire</label>
                <select id="dest-account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={destinationAccountId}>
                  {#each Object.entries(accountLabels) as [key, label]}
                    {#if key !== accountId}
                      <option value={key}>{label}</option>
                    {/if}
                  {/each}
                </select>
              </div>
            {/if}

            {#if showPanel !== 'transfert'}
              <div>
                <label for="payment-method-select" class="block text-sm font-medium mb-1">Moyen de paiement</label>
                <select id="payment-method-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={paymentMethod}>
                  {#each Object.entries(methodLabels) as [key, label]}
                    <option value={key}>{label}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <div>
              <label for="description-input" class="block text-sm font-medium mb-1">Description / Motif</label>
              <input id="description-input" type="text" placeholder="Ex: Cotisation annuelle..." class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={description} required />
            </div>

            <div>
              <label for="ref-input" class="block text-sm font-medium mb-1">Référence (Optionnel)</label>
              <input id="ref-input" type="text" placeholder="Ex: Chèque n°1234, Virement..." class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={reference} />
            </div>

            <div class="flex gap-3 pt-4">
              <button type="submit" disabled={isSubmitting} class="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow hover:bg-primary/90">
                {isSubmitting ? 'Enregistrement...' : 'Valider'}
              </button>
              <button type="button" onclick={() => showPanel = null} class="px-4 py-2 border border-border text-sm font-medium rounded-md hover:bg-muted">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    {/if}
  </div>
  ```

- [ ] **Step 2: Créer la page Astro de routage et proxying compta/index.astro**
  Créer le fichier [index.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/compta/index.astro) :
  ```astro
  ---
  import Layout from '../../../layouts/Layout.astro';
  import AdminLayout from '../../../components/AdminLayout.svelte';
  import TransactionLedger from '../../../components/TransactionLedger.svelte';
  import { env } from 'cloudflare:workers';

  const userEmail = Astro.locals.user?.email || "admin@nozay-bad.fr";
  const apiService = env.API_SERVICE;

  const season = Astro.url.searchParams.get('season') || '25-26';
  const page = Astro.url.searchParams.get('page') || '1';

  // Si requête POST, intercepter pour les actions d'écriture (proxying vers Hono)
  if (Astro.request.method === 'POST') {
    try {
      const data = await Astro.request.json() as any;
      if (data.action === 'create') {
        const apiRes = await apiService.fetch('http://localhost/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!apiRes.ok) {
          const errText = await apiRes.text();
          return new Response(errText, { status: apiRes.status });
        }
      } else if (data.action === 'delete') {
        const apiRes = await apiService.fetch(`http://localhost/transactions/${data.id}`, {
          method: 'DELETE'
        });
        if (!apiRes.ok) {
          return new Response('Erreur suppression', { status: apiRes.status });
        }
      }
      return new Response(JSON.stringify({ success: true }));
    } catch (err: any) {
      return new Response(err.message, { status: 500 });
    }
  }

  let transactionsList = [];
  let pagination = { total: 0, page: 1, limit: 20, totalPages: 1 };
  let balances = [];
  let errorMsg = '';

  try {
    const txRes = await apiService.fetch(`http://localhost/transactions?season=${season}&page=${page}&limit=20`);
    if (txRes.ok) {
      const json = await txRes.json() as any;
      transactionsList = json.data || [];
      pagination = json.pagination;
    }

    const reportRes = await apiService.fetch(`http://localhost/seasons/${season}/reports`);
    if (reportRes.ok) {
      const json = await reportRes.json() as any;
      balances = json.data?.bilanTrésorerie || [];
    }
  } catch (err: any) {
    errorMsg = 'Une erreur est survenue lors de la communication avec le serveur comptable.';
  }
  ---

  <Layout title="Comptabilité - NBA 91">
    <AdminLayout client:load email={userEmail}>
      <div class="space-y-6">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Comptabilité</h1>
          <p class="text-muted-foreground mt-2">
            Consultez le grand livre comptable et suivez les mouvements de fonds de l'association.
          </p>
        </div>

        {errorMsg && (
          <div class="p-4 bg-destructive/15 border border-destructive text-destructive rounded-lg">
            {errorMsg}
          </div>
        )}

        <TransactionLedger
          client:load
          transactions={transactionsList}
          pagination={pagination}
          seasonId={season}
          balances={balances}
        />
      </div>
    </AdminLayout>
  </Layout>
  ```

- [ ] **Step 3: Exécuter Astro check pour confirmer le bon typage**
  Lancer :
  ```bash
  npx astro check --root apps/admin-console
  ```
  Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commiter**
  ```bash
  git add apps/admin-console
  git commit -m "feat(ui): implement Grand Livre listing and transaction input Svelte component"
  ```

---

### Task 4 : Page des Rapports AG & Soldes Initiaux (Astro / Svelte)

**Files:**
* Create: `apps/admin-console/src/pages/admin/compta/reports.astro`
* Create: `apps/admin-console/src/components/GeneralMeetingReport.svelte`

**Interfaces:**
* Consumes: `GET /seasons/:seasonId/reports` et `POST /seasons/:seasonId/balances`.
* Produces: Page `/admin/compta/reports` affichant le compte de résultat et le bilan de trésorerie de l'AG.

- [ ] **Step 1: Créer le composant Svelte GeneralMeetingReport.svelte**
  Créer le fichier [GeneralMeetingReport.svelte](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/components/GeneralMeetingReport.svelte) :
  ```html
  <script lang="ts">
    import { AlertCircle, Edit3 } from 'lucide-svelte';

    interface CategoryTotal {
      type: 'recette' | 'depense';
      total: number;
    }

    interface ReportData {
      compteResultat: {
        totalRecettes: number;
        totalDepenses: number;
        netResult: number;
        categories: Record<string, CategoryTotal>;
      };
      bilanTrésorerie: {
        accountId: 'current' | 'savings' | 'cash';
        initialBalance: number;
        finalBalance: number;
      }[];
    }

    let { report, seasonId }: { report: ReportData; seasonId: string } = $props();

    let editingBalances = $state(false);
    let currentInitial = $state((report.bilanTrésorerie.find(b => b.accountId === 'current')?.initialBalance || 0) / 100);
    let savingsInitial = $state((report.bilanTrésorerie.find(b => b.accountId === 'savings')?.initialBalance || 0) / 100);
    let cashInitial = $state((report.bilanTrésorerie.find(b => b.accountId === 'cash')?.initialBalance || 0) / 100);
    let isSaving = $state(false);

    const categories = {
      adhesions: 'Adhésions / Inscriptions membres',
      partenariats: 'Partenariats / Sponsoring',
      subventions: 'Subventions publiques',
      buvette: 'Ventes buvette',
      boutique: 'Ventes boutique',
      evenements: 'Inscriptions événements',
      stages: 'Stages',
      divers_recette: 'Autres recettes',
      salaires: 'Salaires & Charges',
      achats_boutique: 'Achats matériels (revente)',
      achats_club: 'Achats matériels club',
      licences_ffbad: 'Reversement licences FFBad',
      championnats: 'Inscriptions Championnats',
      formations: 'Formations',
      evenements_club: 'Dépenses Événements',
      frais_deplacement: 'Notes de frais bénévoles',
      assurances: 'Assurances',
      frais_administratifs: 'Frais Admin / Banque',
      divers_depense: 'Autres dépenses'
    };

    const accountLabels = {
      current: 'Compte Courant',
      savings: 'Compte Livret',
      cash: 'Caisse Physique'
    };

    async function handleSaveBalances(e: Event) {
      e.preventDefault();
      isSaving = true;
      try {
        const res = await fetch('/admin/compta/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seasonId,
            balances: [
              { accountId: 'current', initialBalance: Math.round(currentInitial * 100) },
              { accountId: 'savings', initialBalance: Math.round(savingsInitial * 100) },
              { accountId: 'cash', initialBalance: Math.round(cashInitial * 100) }
            ]
          })
        });
        if (!res.ok) throw new Error('Impossible de sauvegarder.');
        window.location.reload();
      } catch (err: any) {
        alert(err.message);
        isSaving = false;
      }
    }
  </script>

  <div class="space-y-8">
    <div class="flex items-center justify-between border-b border-border pb-4">
      <h2 class="text-xl font-bold tracking-tight">Rapport Financier pour l'Assemblée Générale</h2>
      <button onclick={() => editingBalances = !editingBalances} class="inline-flex items-center gap-2 px-3 py-1.5 border border-border bg-background rounded-md text-xs font-semibold hover:bg-muted shadow-sm transition-colors">
        <Edit3 class="w-3.5 h-3.5" />
        Modifier Soldes Initiaux
      </button>
    </div>

    <!-- Formulaire de saisie des soldes initiaux -->
    {#if editingBalances}
      <div class="p-6 bg-card border border-border rounded-xl shadow-sm space-y-4 max-w-xl">
        <h3 class="font-semibold text-sm">Configurer les soldes de départ (au 1er septembre)</h3>
        <form onsubmit={handleSaveBalances} class="space-y-4">
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label for="current-initial" class="block text-xs font-medium mb-1">Compte Courant (€)</label>
              <input id="current-initial" type="number" step="0.01" class="w-full px-3 py-1.5 border border-border bg-background rounded-md text-sm" bind:value={currentInitial} />
            </div>
            <div>
              <label for="savings-initial" class="block text-xs font-medium mb-1">Compte Livret (€)</label>
              <input id="savings-initial" type="number" step="0.01" class="w-full px-3 py-1.5 border border-border bg-background rounded-md text-sm" bind:value={savingsInitial} />
            </div>
            <div>
              <label for="cash-initial" class="block text-xs font-medium mb-1">Caisse (€)</label>
              <input id="cash-initial" type="number" step="0.01" class="w-full px-3 py-1.5 border border-border bg-background rounded-md text-sm" bind:value={cashInitial} />
            </div>
          </div>
          <div class="flex gap-2">
            <button type="submit" disabled={isSaving} class="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-md shadow hover:bg-primary/90">
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button type="button" onclick={() => editingBalances = false} class="px-4 py-2 border border-border text-xs font-semibold rounded-md hover:bg-muted">
              Annuler
            </button>
          </div>
        </form>
      </div>
    {/if}

    <!-- 1. COMPTE DE RÉSULTAT -->
    <div class="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
      <h3 class="text-lg font-semibold">1. Compte de Résultat</h3>
      <div class="grid gap-6 md:grid-cols-2">
        <!-- Recettes -->
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-border pb-2">
            <span class="font-bold text-emerald-600 dark:text-emerald-400">Total Recettes</span>
            <span class="font-bold text-lg text-emerald-600 dark:text-emerald-400">{(report.compteResultat.totalRecettes / 100).toFixed(2)} €</span>
          </div>
          <div class="space-y-3">
            {#each Object.entries(report.compteResultat.categories) as [key, cat]}
              {#if cat.type === 'recette'}
                <div class="flex items-center justify-between text-sm">
                  <span class="text-muted-foreground">{categories[key as keyof typeof categories] || key}</span>
                  <span class="font-semibold">{(cat.total / 100).toFixed(2)} €</span>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <!-- Dépenses -->
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-border pb-2">
            <span class="font-bold text-destructive">Total Dépenses</span>
            <span class="font-bold text-lg text-destructive">{(report.compteResultat.totalDepenses / 100).toFixed(2)} €</span>
          </div>
          <div class="space-y-3">
            {#each Object.entries(report.compteResultat.categories) as [key, cat]}
              {#if cat.type === 'depense'}
                <div class="flex items-center justify-between text-sm">
                  <span class="text-muted-foreground">{categories[key as keyof typeof categories] || key}</span>
                  <span class="font-semibold">{(cat.total / 100).toFixed(2)} €</span>
                </div>
              {/if}
            {/each}
          </div>
        </div>
      </div>

      <!-- Résultat Net -->
      <div class="p-4 rounded-xl border border-border flex items-center justify-between {report.compteResultat.netResult >= 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}">
        <span class="font-semibold">Solde / Résultat Net de la saison</span>
        <span class="font-bold text-xl">{(report.compteResultat.netResult / 100).toFixed(2)} €</span>
      </div>
    </div>

    <!-- 2. BILAN DE TRÉSORERIE -->
    <div class="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
      <h3 class="text-lg font-semibold">2. Bilan de Trésorerie</h3>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm">
          <thead class="bg-muted text-muted-foreground font-medium border-b border-border">
            <tr>
              <th class="p-4">Compte Financier</th>
              <th class="p-4 text-right">Solde Initial (1er sept.)</th>
              <th class="p-4 text-right">Mouvements de saison</th>
              <th class="p-4 text-right">Solde Réel Final (31 août)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {#each report.bilanTrésorerie as item}
              <tr>
                <td class="p-4 font-semibold">{accountLabels[item.accountId]}</td>
                <td class="p-4 text-right">{(item.initialBalance / 100).toFixed(2)} €</td>
                <td class="p-4 text-right font-medium {item.finalBalance - item.initialBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}">
                  {item.finalBalance - item.initialBalance >= 0 ? '+' : ''}{((item.finalBalance - item.initialBalance) / 100).toFixed(2)} €
                </td>
                <td class="p-4 text-right font-bold">{(item.finalBalance / 100).toFixed(2)} €</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  ```

- [ ] **Step 2: Créer la page Astro compta/reports.astro**
  Créer le fichier [reports.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/compta/reports.astro) :
  ```astro
  ---
  import Layout from '../../../layouts/Layout.astro';
  import AdminLayout from '../../../components/AdminLayout.svelte';
  import GeneralMeetingReport from '../../../components/GeneralMeetingReport.svelte';
  import { env } from 'cloudflare:workers';

  const userEmail = Astro.locals.user?.email || "admin@nozay-bad.fr";
  const apiService = env.API_SERVICE;

  const season = Astro.url.searchParams.get('season') || '25-26';

  // Si requête POST, intercepter pour modifier les soldes initiaux (proxying)
  if (Astro.request.method === 'POST') {
    try {
      const data = await Astro.request.json() as any;
      const apiRes = await apiService.fetch(`http://localhost/seasons/${data.seasonId}/balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.balances)
      });
      if (!apiRes.ok) {
        return new Response('Erreur configuration soldes', { status: apiRes.status });
      }
      return new Response(JSON.stringify({ success: true }));
    } catch (err: any) {
      return new Response(err.message, { status: 500 });
    }
  }

  let reportData = {
    compteResultat: { totalRecettes: 0, totalDepenses: 0, netResult: 0, categories: {} },
    bilanTrésorerie: [
      { accountId: 'current', initialBalance: 0, finalBalance: 0 },
      { accountId: 'savings', initialBalance: 0, finalBalance: 0 },
      { accountId: 'cash', initialBalance: 0, finalBalance: 0 }
    ]
  };
  let errorMsg = '';

  try {
    const res = await apiService.fetch(`http://localhost/seasons/${season}/reports`);
    if (res.ok) {
      const json = await res.json() as any;
      reportData = json.data;
    } else {
      throw new Error('Erreur récupération du rapport');
    }
  } catch (err: any) {
    errorMsg = 'Impossible de charger les données du bilan AG.';
  }
  ---

  <Layout title="Rapports AG - NBA 91">
    <AdminLayout client:load email={userEmail}>
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold tracking-tight">Rapports AG</h1>
            <p class="text-muted-foreground mt-2">
              Visualisez le bilan annuel et exportez les comptes de résultat de l'association.
            </p>
          </div>
          <div>
            <!-- Liens de navigation internes compta -->
            <a href="/admin/compta" class="text-sm font-semibold text-primary hover:underline">Retourner au Grand Livre</a>
          </div>
        </div>

        {errorMsg && (
          <div class="p-4 bg-destructive/15 border border-destructive text-destructive rounded-lg">
            {errorMsg}
          </div>
        )}

        <GeneralMeetingReport client:load report={reportData} seasonId={season} />
      </div>
    </AdminLayout>
  </Layout>
  ```

- [ ] **Step 3: Exécuter Astro check pour confirmer le bon typage**
  Lancer :
  ```bash
  npx astro check --root apps/admin-console
  ```
  Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commiter**
  ```bash
  git add apps/admin-console
  git commit -m "feat(ui): implement AG report dashboard and initial balances Svelte component"
  ```
