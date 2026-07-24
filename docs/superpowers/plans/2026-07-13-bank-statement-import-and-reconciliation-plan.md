# Plan d'Implémentation : Importation de Relevés Bancaires & Pointage (Milestone 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place l'importation de relevés bancaires au format OFX (Société Générale) et l'interface de rapprochement (pointage) semi-automatique avec les transactions du Grand Livre.

**Architecture:** Approche relationnelle Drizzle ORM avec une nouvelle table `bank_transactions` dans `@nba/db`, un parseur de fichiers OFX dans l'API Hono avec détection automatique du compte courant/livret de l'asso, et une interface en split-screen sous Svelte 5.

**Tech Stack:** Astro v7, Svelte v5, Hono (Cloudflare Workers), Drizzle ORM (SQLite / D1), Vitest.

## Global Constraints
* Utiliser les versions récentes d'Astro, Svelte (v5), Tailwind CSS (v4).
* Les tests unitaires et d'intégration doivent utiliser Vitest.
* Le code TypeScript doit compiler sans erreurs strictes.
* Les montants monétaires sont stockés sous forme d'entiers en centimes.

---

### Task 1 : Schéma de Base de Données & Migrations Drizzle

**Files:**
* Modify: `libs/shared/db/src/schema.ts`
* Modify: `libs/shared/db/src/db.test.ts`
* Create: `libs/shared/db/migrations/0005_create_bank_transactions_table.sql` (généré par Drizzle-Kit)

**Interfaces:**
* Produces: `bankStatementLinesTable` dans le module `@nba/db` (exposé par index.ts).

- [ ] **Step 1: Mettre à jour le schéma Drizzle**
  Ouvrir [schema.ts](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/schema.ts) et ajouter la définition de `bankStatementLinesTable` à la fin du fichier :
  ```typescript
  export const bankStatementLinesTable = sqliteTable('bank_transactions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fitid: text('fitid').notNull().unique(),
    seasonId: text('season_id').notNull().references(() => seasonsTable.id),
    accountId: text('account_id', { enum: ['current', 'savings', 'cash'] }).notNull(),
    amount: integer('amount').notNull(),
    date: text('date').notNull(),
    name: text('name').notNull(),
    memo: text('memo'),
    status: text('status', { enum: ['pending', 'reconciled', 'ignored'] }).notNull().default('pending'),
    ledgerEntryId: integer('ledger_entry_id').references(() => ledgerEntriesTable.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  });
  ```

- [ ] **Step 2: Écrire les tests unitaires de base de données**
  Ajouter un test dans [db.test.ts](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/db.test.ts) pour valider l'insertion d'opérations bancaires :
  ```typescript
  // Ajouter l'import de bankStatementLinesTable en haut du fichier
  import { bankStatementLinesTable } from './schema';

  it('should insert bank transactions correctly', async () => {
    const db = drizzle(mockD1 as any);

    const op = {
      fitid: 'SG-123456-COURANT',
      seasonId: '25-26',
      accountId: 'current' as const,
      amount: -1560, // -15,60 €
      date: '2026-07-13',
      name: 'IONOS',
      memo: 'Facture Site Web',
      createdAt: new Date()
    };
    const [inserted] = await db.insert(bankStatementLinesTable).values(op).returning();
    expect(inserted.fitid).toBe('SG-123456-COURANT');
    expect(inserted.amount).toBe(-1560);
    expect(inserted.status).toBe('pending');
  });
  ```

- [ ] **Step 3: Générer la migration SQL**
  Depuis la racine, lancer :
  ```bash
  npx drizzle-kit generate --config=libs/shared/db/drizzle.config.ts
  ```
  Expected: Création de `libs/shared/db/migrations/0005_create_bank_transactions_table.sql` contenant les instructions DDL.

- [ ] **Step 4: Appliquer la migration localement**
  Appliquer la migration D1 locale :
  ```bash
  npx wrangler d1 migrations apply nba-db --local --config apps/api/wrangler.json
  ```
  Expected: "Executed successfully" / ✅.

- [ ] **Step 5: Exécuter les tests unitaires de la base de données**
  Lancer :
  ```bash
  npm test
  ```
  Expected: Tous les tests passent au vert (y compris le nouveau test `should insert bank transactions correctly`).

- [ ] **Step 6: Valider et commiter**
  ```bash
  git add libs/shared/db
  git commit -m "chore(db): create bank_transactions table with Drizzle migrations"
  ```

---

### Task 2 : Parseur OFX et API Back-end (Hono)

**Files:**
* Modify: `apps/api/src/index.ts`
* Modify: `apps/api/src/index.test.ts`

**Interfaces:**
* Consumes: `bankStatementLinesTable` et `ledgerEntriesTable` de `@nba/db`.
* Produces:
  * Parseur OFX interne.
  * Endpoint `POST /bank-transactions/import` (importation sans doublons).
  * Endpoint `GET /bank-transactions` (liste des opérations bancaires).
  * Endpoint `POST /bank-transactions/:id/reconcile` (rapprochement par liaison ou création).
  * Endpoint `POST /bank-transactions/:id/ignore` (ignorer une opération).

- [ ] **Step 1: Importer le schéma de la table**
  Dans [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts), ajouter l'import de `bankStatementLinesTable` :
  ```typescript
  import { membersTable, seasonsTable, seasonBalancesTable, ledgerEntriesTable, bankStatementLinesTable } from '../../../libs/shared/db/src/schema';
  ```

- [ ] **Step 2: Écrire le parseur de relevés OFX**
  Ajouter la fonction utilitaire de parsing OFX en haut ou à la fin de [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) :
  ```typescript
  export function parseOFX(ofxContent: string): { fitid: string; amount: number; date: string; name: string; memo: string | null; accountId: 'current' | 'savings' } {
    // 1. Détecter le compte bancaire depuis <ACCTID>
    const acctIdMatch = ofxContent.match(/<ACCTID>(\d+)/);
    const acctId = acctIdMatch ? acctIdMatch[1] : '';
    const accountId: 'current' | 'savings' = acctId === '00070007847' ? 'savings' : 'current';

    const transactions: any[] = [];
    // 2. Extraire chaque transaction de type <STMTTRN> ... </STMTTRN> (ou jusqu'au prochain bloc ou fin de balise)
    const blocks = ofxContent.split('<STMTTRN>');
    // Le premier bloc contient les en-têtes et le début du fichier, on l'ignore
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i].split('</STMTTRN>')[0];
      
      const fitidMatch = block.match(/<FITID>([^\r\n]+)/);
      const trnamtMatch = block.match(/<TRNAMT>([^\r\n]+)/);
      const dtpostedMatch = block.match(/<DTPOSTED>([^\r\n]+)/);
      const nameMatch = block.match(/<NAME>([^\r\n]+)/);
      const memoMatch = block.match(/<MEMO>([^\r\n]+)/);

      if (!fitidMatch || !trnamtMatch || !dtpostedMatch || !nameMatch) continue;

      const rawAmount = parseFloat(trnamtMatch[1]);
      const amountCents = Math.round(rawAmount * 100);

      const rawDate = dtpostedMatch[1].trim(); // Format YYYYMMDD
      const dateFormatted = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;

      transactions.push({
        fitid: fitidMatch[1].trim(),
        accountId,
        amount: amountCents,
        date: dateFormatted,
        name: nameMatch[1].trim(),
        memo: memoMatch ? memoMatch[1].trim() : null
      });
    }

    return { transactions };
  }
  ```

- [ ] **Step 3: Implémenter l'endpoint d'importation OFX**
  Ajouter la route d'import dans [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) :
  ```typescript
  app.post('/bank-transactions/import', async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const body = await c.req.parseBody();
    const file = body.file as File;
    const seasonId = body.seasonId as string;

    if (!file || !seasonId) {
      return c.json({ success: false, error: 'Fichier et saison obligatoires.' }, 400);
    }

    const content = await file.text();
    const { transactions } = parseOFX(content);
    if (transactions.length === 0) {
      return c.json({ success: true, count: 0 });
    }

    const db = drizzle(c.env.DB);
    let insertedCount = 0;

    for (const tx of transactions) {
      try {
        const res = await db.insert(bankStatementLinesTable)
          .values({
            fitid: tx.fitid,
            seasonId,
            accountId: tx.accountId,
            amount: tx.amount,
            date: tx.date,
            name: tx.name,
            memo: tx.memo,
            status: 'pending',
            createdAt: new Date()
          })
          .onConflictDoNothing()
          .run();
        
        if (res.meta.changes > 0) {
          insertedCount++;
        }
      } catch (err) {
        // Ignorer silencieusement les erreurs de doublons si onConflictDoNothing ne suffit pas
      }
    }

    return c.json({ success: true, count: insertedCount });
  });
  ```

- [ ] **Step 4: Implémenter la route GET de récupération des opérations bancaires**
  Ajouter la route GET dans [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) :
  ```typescript
  app.get('/bank-transactions', async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const season = c.req.query('season');
    if (!season) {
      return c.json({ success: false, error: 'Missing season query parameter' }, 400);
    }
    const status = c.req.query('status') || 'pending';
    const accountId = c.req.query('accountId');

    const db = drizzle(c.env.DB);
    const conditions = [
      eq(bankStatementLinesTable.seasonId, season),
      eq(bankStatementLinesTable.status, status as any)
    ];

    if (accountId) {
      conditions.push(eq(bankStatementLinesTable.accountId, accountId as any));
    }

    const data = await db.select()
      .from(bankStatementLinesTable)
      .where(and(...conditions))
      .orderBy(desc(bankStatementLinesTable.date), desc(bankStatementLinesTable.id))
      .all();

    return c.json({ success: true, data });
  });
  ```

- [ ] **Step 5: Implémenter les routes d'action (reconciliation et ignore)**
  Ajouter les routes d'action dans [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) :
  ```typescript
  app.post('/bank-transactions/:id/reconcile', async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json() as any;
    const db = drizzle(c.env.DB);

    if (body.action === 'match') {
      await db.update(bankStatementLinesTable)
        .set({ status: 'reconciled', ledgerEntryId: body.ledgerEntryId })
        .where(eq(bankStatementLinesTable.id, id))
        .run();
    } else if (body.action === 'create') {
      const tx = body.transaction;
      // Insérer d'abord la transaction dans le Grand Livre
      const [newTx] = await db.insert(ledgerEntriesTable).values({
        seasonId: tx.seasonId,
        type: tx.type,
        accountId: tx.accountId,
        category: tx.category,
        amount: Math.round(tx.amount),
        date: tx.date,
        paymentMethod: tx.paymentMethod,
        description: tx.description,
        reference: tx.reference || null,
        createdAt: new Date()
      }).returning();

      // Mettre à jour l'écriture bancaire
      await db.update(bankStatementLinesTable)
        .set({ status: 'reconciled', ledgerEntryId: newTx.id })
        .where(eq(bankStatementLinesTable.id, id))
        .run();
    } else {
      return c.json({ success: false, error: 'Action invalide.' }, 400);
    }

    return c.json({ success: true });
  });

  app.post('/bank-transactions/:id/ignore', async (c) => {
    if (!c.env || !c.env.DB) {
      return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    }
    const id = parseInt(c.req.param('id'));
    const db = drizzle(c.env.DB);

    await db.update(bankStatementLinesTable)
      .set({ status: 'ignored' })
      .where(eq(bankStatementLinesTable.id, id))
      .run();

    return c.json({ success: true });
  });
  ```

- [ ] **Step 6: Écrire les tests d'intégration API**
  Ajouter un bloc de tests dans [index.test.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.test.ts) :
  ```typescript
  describe('Bank Reconciliation API Endpoints', () => {
    it('should import OFX, list bank transactions, and reconcile them', async () => {
      const mockD1 = await setupMockDb();

      // Mock fichier OFX
      const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKACCTFROM>
<ACCTID>00050007847
</BANKACCTFROM>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260216
<TRNAMT>-15.60
<FITID>SG-FITID-TEST-1
<NAME>IONOS SARL
<MEMO>Facture Internet
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

      // 1. Simuler l'importation via POST /bank-transactions/import
      const formData = new FormData();
      const file = new File([ofxContent], 'statement.ofx', { type: 'text/plain' });
      formData.append('file', file);
      formData.append('seasonId', '25-26');

      const importRes = await app.request('http://localhost/bank-transactions/import', {
        method: 'POST',
        body: formData
      }, { DB: mockD1 as any });
      expect(importRes.status).toBe(200);
      const importJson = await importRes.json() as any;
      expect(importJson.success).toBe(true);
      expect(importJson.count).toBe(1);

      // 2. Récupérer les transactions importées via GET /bank-transactions
      const getRes = await app.request('http://localhost/bank-transactions?season=25-26&status=pending', undefined, { DB: mockD1 as any });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json() as any;
      expect(getJson.success).toBe(true);
      expect(getJson.data).toHaveLength(1);
      
      const bankTx = getJson.data[0];
      expect(bankTx.fitid).toBe('SG-FITID-TEST-1');
      expect(bankTx.amount).toBe(-1560); // converti en centimes
      expect(bankTx.accountId).toBe('current');

      // 3. Pointer en créant une nouvelle transaction via POST /bank-transactions/:id/reconcile
      const reconRes = await app.request(`http://localhost/bank-transactions/${bankTx.id}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          transaction: {
            seasonId: '25-26',
            type: 'depense',
            accountId: 'current',
            category: 'frais_administratifs',
            amount: 1560,
            date: '2026-02-16',
            paymentMethod: 'virement',
            description: 'Facture Internet Ionos',
            reference: 'SG-FITID-TEST-1'
          }
        })
      }, { DB: mockD1 as any });
      expect(reconRes.status).toBe(200);

      // Vérifier le changement de statut
      const checkRes = await app.request('http://localhost/bank-transactions?season=25-26&status=reconciled', undefined, { DB: mockD1 as any });
      const checkJson = await checkRes.json() as any;
      expect(checkJson.data).toHaveLength(1);
      expect(checkJson.data[0].status).toBe('reconciled');
    });
  });
  ```

- [ ] **Step 7: Exécuter les tests de l'API**
  Lancer :
  ```bash
  npm test
  ```
  Expected: Tous les tests passent au vert (29 tests au total).

- [ ] **Step 8: Commiter**
  ```bash
  git add apps/api
  git commit -m "feat(api): implement bank statements OFX parsing and reconciliation routes"
  ```

---

### Task 3 : Interface de Pointage (Svelte 5 / Astro)

**Files:**
* Create: `apps/admin-console/src/components/BankStatementReconciliation.svelte`
* Create: `apps/admin-console/src/components/BankStatementReconciliation.test.ts`
* Create: `apps/admin-console/src/pages/admin/compta/import.astro`

**Interfaces:**
* Consumes:
  * `POST /bank-transactions/import` (upload OFX)
  * `GET /bank-transactions` (liste pending)
  * `POST /bank-transactions/:id/reconcile` (pointage)
  * `POST /bank-transactions/:id/ignore` (ignorer)
  * `GET /transactions` (liste des transactions existantes pour faire l'exact match)
* Produces: Page `/admin/compta/import` interactive.

- [ ] **Step 1: Créer le composant Svelte BankStatementReconciliation.svelte**
  Créer le fichier [BankStatementReconciliation.svelte](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/components/BankStatementReconciliation.svelte) :
  ```html
  <script lang="ts">
    import { Upload, Check, AlertCircle, Trash2, ShieldAlert } from 'lucide-svelte';

    interface BankTransaction {
      id: number;
      fitid: string;
      accountId: 'current' | 'savings' | 'cash';
      amount: number;
      date: string;
      name: string;
      memo: string | null;
      status: 'pending' | 'reconciled' | 'ignored';
    }

    interface GLTransaction {
      id: number;
      type: 'recette' | 'depense' | 'transfert';
      accountId: 'current' | 'savings' | 'cash';
      amount: number;
      date: string;
      description: string;
    }

    interface Season {
      id: string;
      name: string;
      active: boolean;
    }

    let {
      bankTransactions = [],
      glTransactions = [],
      seasonId,
      seasons = []
    }: {
      bankTransactions: BankTransaction[];
      glTransactions: GLTransaction[];
      seasonId: string;
      seasons: Season[];
    } = $props();

    let selectedSeason = $state(seasonId);
    let selectedTx = $state<BankTransaction | null>(null);
    let isSubmitting = $state(false);
    let errorMsg = $state('');

    // Formulaire d'association/création
    let category = $state('buvette');
    let paymentMethod = $state('virement');

    const accountLabels = {
      current: 'Compte Courant',
      savings: 'Compte Livret',
      cash: 'Caisse Physique'
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
      { id: 'divers_recette', name: 'Divers Recette' },
      { id: 'divers_depense', name: 'Divers Dépense' }
    ];

    // Trouver les suggestions correspondantes du Grand Livre (même montant absolu et +/- 7 jours)
    function getSuggestions(bt: BankTransaction) {
      return glTransactions.filter(gt => {
        // Le montant de la banque peut être négatif (débit). On compare en valeur absolue.
        const matchesAmount = Math.abs(gt.amount) === Math.abs(bt.amount);
        if (!matchesAmount) return false;

        const btDate = new Date(bt.date).getTime();
        const gtDate = new Date(gt.date).getTime();
        const diffDays = Math.abs(btDate - gtDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      });
    }

    async function handleImport(e: Event) {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
      if (!fileInput.files || fileInput.files.length === 0) return;

      isSubmitting = true;
      errorMsg = '';

      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      formData.append('seasonId', selectedSeason);

      try {
        const res = await fetch('/admin/compta/import', {
          method: 'POST',
          body: formData
        });
        if (!res.ok) throw new Error(await res.text() || 'Erreur importation.');
        window.location.reload();
      } catch (err: any) {
        errorMsg = err.message || 'Une erreur est survenue.';
        isSubmitting = false;
      }
    }

    async function handleMatch(btId: number, ledgerEntryId: number) {
      isSubmitting = true;
      try {
        const res = await fetch('/admin/compta/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'match', btId, ledgerEntryId })
        });
        if (!res.ok) throw new Error('Erreur association.');
        window.location.reload();
      } catch (err: any) {
        alert(err.message);
        isSubmitting = false;
      }
    }

    async function handleCreateAndMatch(bt: BankTransaction) {
      isSubmitting = true;
      try {
        const res = await fetch('/admin/compta/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            btId: bt.id,
            transaction: {
              seasonId: selectedSeason,
              type: bt.amount < 0 ? 'depense' : 'recette',
              accountId: bt.accountId,
              category,
              amount: Math.abs(bt.amount),
              date: bt.date,
              paymentMethod,
              description: bt.name,
              reference: bt.fitid
            }
          })
        });
        if (!res.ok) throw new Error('Erreur création.');
        window.location.reload();
      } catch (err: any) {
        alert(err.message);
        isSubmitting = false;
      }
    }

    async function handleIgnore(btId: number) {
      if (!confirm('Voulez-vous ignorer cette transaction bancaire ?')) return;
      isSubmitting = true;
      try {
        const res = await fetch('/admin/compta/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ignore', btId })
        });
        if (!res.ok) throw new Error('Erreur ignore.');
        window.location.reload();
      } catch (err: any) {
        alert(err.message);
        isSubmitting = false;
      }
    }
  </script>

  <div class="space-y-6">
    {#if bankTransactions.length === 0}
      <!-- Zone d'Importation initial -->
      <div class="bg-card border border-border rounded-xl p-8 shadow-sm max-w-xl">
        <h2 class="text-lg font-semibold mb-4">Importer un relevé Société Générale</h2>
        {#if errorMsg}
          <div class="p-3 mb-4 bg-destructive/15 border border-destructive text-destructive text-sm rounded-md flex items-center gap-2">
            <AlertCircle class="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        {/if}
        <form onsubmit={handleImport} class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="season-select" class="block text-xs font-semibold mb-1">Saison comptable</label>
              <select id="season-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm" bind:value={selectedSeason}>
                {#each seasons as s}
                  <option value={s.id}>{s.name}</option>
                {/each}
              </select>
            </div>
            <div>
              <label for="file-input" class="block text-xs font-semibold mb-1">Fichier (.ofx)</label>
              <input id="file-input" type="file" accept=".ofx" class="w-full text-sm" required />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-md shadow hover:bg-primary/95 cursor-pointer">
            <Upload class="w-4 h-4" />
            {isSubmitting ? 'Importation en cours...' : 'Lancer l\'importation'}
          </button>
        </form>
      </div>
    {:else}
      <!-- Zone Rapprochement (Split-Screen) -->
      <div class="grid md:grid-cols-12 gap-6 h-[600px]">
        <!-- Liste de gauche (8/12) -->
        <div class="md:col-span-7 bg-card border border-border rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
          <div class="p-4 border-b border-border bg-muted flex items-center justify-between">
            <span class="font-bold text-sm">Opérations bancaires en attente ({bankTransactions.length})</span>
          </div>
          <div class="flex-1 overflow-y-auto divide-y divide-border">
            {#each bankTransactions as bt}
              <button
                type="button"
                onclick={() => selectedTx = bt}
                class="w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-center justify-between gap-4 border-0 {selectedTx?.id === bt.id ? 'bg-muted border-l-4 border-l-primary' : ''}"
              >
                <div>
                  <div class="font-bold text-sm text-foreground">{bt.name}</div>
                  <div class="text-xs text-muted-foreground">{bt.date} • {accountLabels[bt.accountId]}</div>
                  {#if bt.memo}
                    <div class="text-xs text-muted-foreground italic truncate max-w-md">{bt.memo}</div>
                  {/if}
                </div>
                <div class="font-bold text-sm shrink-0 {bt.amount < 0 ? 'text-destructive' : 'text-emerald-600'}">
                  {bt.amount < 0 ? '' : '+'}{(bt.amount / 100).toFixed(2)} €
                </div>
              </button>
            {/each}
          </div>
        </div>

        <!-- Panneau Action de droite (5/12) -->
        <div class="md:col-span-5 bg-card border border-border rounded-xl shadow-sm p-6 h-full flex flex-col justify-between overflow-y-auto">
          {#if selectedTx}
            <div class="space-y-6">
              <div>
                <h3 class="font-bold text-lg">{selectedTx.name}</h3>
                <p class="text-xs text-muted-foreground mt-1">Ligne bancaire sélectionnée • ID: {selectedTx.fitid}</p>
                <div class="text-2xl font-bold mt-2 {selectedTx.amount < 0 ? 'text-destructive' : 'text-emerald-600'}">
                  {selectedTx.amount < 0 ? '' : '+'}{(selectedTx.amount / 100).toFixed(2)} €
                </div>
              </div>

              <!-- Étape 1 : Suggestions d'association -->
              <div class="border border-border rounded-xl p-4 space-y-3 bg-muted/40">
                <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Suggestions du Grand Livre</h4>
                {#let suggestions = getSuggestions(selectedTx)}
                  {#each suggestions as sug}
                    <div class="flex items-center justify-between gap-2 p-2.5 bg-background border border-border rounded-md text-xs">
                      <div>
                        <div class="font-semibold">{sug.description}</div>
                        <div class="text-muted-foreground">{sug.date} • {(sug.amount / 100).toFixed(2)} €</div>
                      </div>
                      <button onclick={() => handleMatch(selectedTx!.id, sug.id)} class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer">
                        Associer
                      </button>
                    </div>
                  {:else}
                    <p class="text-xs text-muted-foreground">Aucune écriture correspondante trouvée à +/- 7 jours.</p>
                  {//each}
                {/let}
              </div>

              <!-- Étape 2 : Création d'une nouvelle écriture -->
              <div class="border border-border rounded-xl p-4 space-y-4">
                <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Créer et pointer une nouvelle écriture</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label for="cat-select" class="block text-xs font-semibold mb-1">Catégorie</label>
                    <select id="cat-select" class="w-full px-2 py-1.5 border border-border bg-background rounded text-xs" bind:value={category}>
                      {#each categories as cat}
                        <option value={cat.id}>{cat.name}</option>
                      {/each}
                    </select>
                  </div>
                  <div>
                    <label for="method-select" class="block text-xs font-semibold mb-1">Moyen de paiement</label>
                    <select id="method-select" class="w-full px-2 py-1.5 border border-border bg-background rounded text-xs" bind:value={paymentMethod}>
                      <option value="virement">Virement</option>
                      <option value="cheque">Chèque</option>
                      <option value="especes">Espèces</option>
                    </select>
                  </div>
                </div>
                <button onclick={() => handleCreateAndMatch(selectedTx!)} class="w-full py-1.5 bg-primary hover:bg-primary/95 text-white rounded text-xs font-semibold shadow-sm cursor-pointer">
                  Créer & lier l'écriture
                </button>
              </div>
            </div>

            <!-- Boutons actions secondaires -->
            <div class="pt-4 border-t border-border flex justify-between gap-4">
              <button onclick={() => handleIgnore(selectedTx!.id)} class="flex-1 py-2 border border-border text-destructive hover:bg-destructive/10 text-xs font-semibold rounded cursor-pointer">
                Ignorer cette écriture
              </button>
              <button onclick={() => selectedTx = null} class="px-4 py-2 border border-border hover:bg-muted text-xs font-semibold rounded cursor-pointer">
                Fermer
              </button>
            </div>
          {:else}
            <div class="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
              <ShieldAlert class="w-8 h-8 opacity-40" />
              <p class="text-sm font-semibold">Sélectionnez une opération</p>
              <p class="text-xs">Choisissez une ligne du relevé à gauche pour commencer le rapprochement.</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
  ```

- [ ] **Step 2: Créer la page Astro compta/import.astro**
  Créer le fichier [import.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/compta/import.astro) :
  ```astro
  ---
  import Layout from '../../../layouts/Layout.astro';
  import AdminLayout from '../../../components/AdminLayout.svelte';
  import BankStatementReconciliation from '../../../components/BankStatementReconciliation.svelte';
  import { env } from 'cloudflare:workers';

  const userEmail = Astro.locals.user?.email || "admin@nozay-bad.fr";
  const apiService = env.API_SERVICE;

  const season = Astro.url.searchParams.get('season') || '25-26';

  // Si requête POST, intercepter pour les actions d'écriture (import ou reconcile/ignore)
  if (Astro.request.method === 'POST') {
    try {
      const contentType = Astro.request.headers.get('content-type') || '';
      if (contentType.includes('multipart/form-data')) {
        const formData = await Astro.request.formData();
        const apiRes = await apiService.fetch('http://localhost/bank-transactions/import', {
          method: 'POST',
          body: formData
        });
        if (!apiRes.ok) {
          const errText = await apiRes.text();
          return new Response(errText, { status: apiRes.status });
        }
        return new Response(JSON.stringify({ success: true }));
      } else {
        const data = await Astro.request.json() as any;
        if (data.action === 'match' || data.action === 'create') {
          const apiRes = await apiService.fetch(`http://localhost/bank-transactions/${data.btId}/reconcile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          if (!apiRes.ok) {
            return new Response(await apiRes.text(), { status: apiRes.status });
          }
        } else if (data.action === 'ignore') {
          const apiRes = await apiService.fetch(`http://localhost/bank-transactions/${data.btId}/ignore`, {
            method: 'POST'
          });
          if (!apiRes.ok) {
            return new Response('Erreur ignore', { status: apiRes.status });
          }
        }
        return new Response(JSON.stringify({ success: true }));
      }
    } catch (err: any) {
      return new Response(err.message, { status: 500 });
    }
  }

  let bankTransactionsList = [];
  let glTransactionsList = [];
  let seasonsList = [];
  let errorMsg = '';

  try {
    const btRes = await apiService.fetch(`http://localhost/bank-transactions?season=${season}&status=pending`);
    if (btRes.ok) {
      const json = await btRes.json() as any;
      bankTransactionsList = json.data || [];
    }

    // Récupérer toutes les transactions du grand livre pour faire des suggestions de pointage
    const glRes = await apiService.fetch(`http://localhost/transactions?season=${season}&page=1&limit=250`);
    if (glRes.ok) {
      const json = await glRes.json() as any;
      glTransactionsList = json.data || [];
    }

    const seasonsRes = await apiService.fetch('http://localhost/seasons');
    if (seasonsRes.ok) {
      const json = await seasonsRes.json() as any;
      seasonsList = json.data || [];
    }
  } catch (err: any) {
    errorMsg = 'Une erreur est survenue lors de la communication avec le serveur comptable.';
  }
  ---

  <Layout title="Importation & Rapprochement - NBA 91">
    <AdminLayout client:load email={userEmail}>
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold tracking-tight">Rapprochement bancaire</h1>
            <p class="text-muted-foreground mt-2">
              Importez des fichiers de relevés (.ofx) et associez-les aux écritures de votre Grand Livre.
            </p>
          </div>
          <a href="/admin/compta" class="text-sm font-semibold text-primary hover:underline">Retourner au Grand Livre</a>
        </div>

        {errorMsg && (
          <div class="p-4 bg-destructive/15 border border-destructive text-destructive rounded-lg">
            {errorMsg}
          </div>
        )}

        <BankStatementReconciliation
          client:load
          bankTransactions={bankTransactionsList}
          glTransactions={glTransactionsList}
          seasonId={season}
          seasons={seasonsList}
        />
      </div>
    </AdminLayout>
  </Layout>
  ```

- [ ] **Step 3: Écrire les tests unitaires du composant Svelte**
  Créer le fichier [BankStatementReconciliation.test.ts](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/components/BankStatementReconciliation.test.ts) :
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { mount } from 'svelte';
  import BankStatementReconciliation from './BankStatementReconciliation.svelte';

  describe('BankStatementReconciliation Component', () => {
    it('renders initial upload zone when no bank transactions are pending', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      mount(BankStatementReconciliation, {
        target,
        props: {
          bankTransactions: [],
          glTransactions: [],
          seasonId: '25-26',
          seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }]
        }
      });

      expect(target.innerHTML).toContain('Importer un relevé Société Générale');
      expect(target.innerHTML).toContain("Lancer l'importation");
    });

    it('renders split-screen list and workspace when bank transactions exist', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      mount(BankStatementReconciliation, {
        target,
        props: {
          bankTransactions: [
            {
              id: 1,
              fitid: 'TEST-FITID',
              accountId: 'current',
              amount: -1560,
              date: '2026-02-16',
              name: 'IONOS',
              memo: 'Facture web',
              status: 'pending'
            }
          ],
          glTransactions: [
            {
              id: 10,
              type: 'depense',
              accountId: 'current',
              amount: -1560,
              date: '2026-02-16',
              description: 'Facture Ionos'
            }
          ],
          seasonId: '25-26',
          seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }]
        }
      });

      expect(target.innerHTML).toContain('Opérations bancaires en attente (1)');
      expect(target.innerHTML).toContain('IONOS');
      expect(target.innerHTML).toContain('-15.60 €');
    });
  });
  ```

- [ ] **Step 4: Exécuter svelte-check et tests unitaires**
  Lancer :
  ```bash
  npx svelte-check
  npm test
  ```
  Expected: svelte-check retourne 0 erreur. Tous les 30 tests passent au vert dans Vitest.

- [ ] **Step 5: Astro Check**
  Lancer :
  ```bash
  npx astro check --root apps/admin-console
  ```
  Expected: 0 errors.

- [ ] **Step 6: Commiter**
  ```bash
  git add apps/admin-console
  git commit -m "feat(ui): add BankStatementReconciliation component and Astro import page"
  ```
