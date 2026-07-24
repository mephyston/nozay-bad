# Plan d'implémentation : Attestations CSE & Module de Facturation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une gestion complète de facturation (création, cycle de vie, impression et rapprochement avec le relevé bancaire) et la possibilité de générer des attestations de paiement CSE prêtes à l'impression pour les adhérents à jour de cotisation.

**Architecture:** 
1. Deux tables SQLite (`invoices` et `invoice_items`) et un lien optionnel dans `transactions`.
2. Endpoints CRUD d'API Hono pour la facturation et l'attestation CSE.
3. Interfaces Svelte 5 administratives et pages Astro autonomes optimisées pour l'impression en PDF.

**Tech Stack:** Astro, Svelte 5, Hono, Drizzle ORM, SQLite (Cloudflare D1), Vitest.

## Global Constraints

- Utiliser les versions de bibliothèques déjà présentes dans le monorepo.
- Les tests unitaires et d'intégration doivent utiliser Vitest.
- Le code TypeScript doit compiler sans erreurs strictes (`npx astro check`).
- Toutes les opérations d'écritures ou de modifications d'état comptable doivent échouer si la saison cible est clôturée.

---

### Task 1 : Schéma et Migrations Base de Données

**Files:**
- Modify: `libs/shared/db/src/schema.ts`
- Modify: `libs/shared/db/src/db.test.ts`
- Create: `libs/shared/db/migrations/<timestamp>_add_invoices_tables.sql` (générée)

**Interfaces:**
- Produces: Les tables `invoicesTable` et `invoiceItemsTable` accessibles par Drizzle.

- [ ] **Step 1: Déclarer les tables dans le schéma de la base de données**
  Ajouter les définitions de tables dans [`libs/shared/db/src/schema.ts`](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/schema.ts) :
  ```typescript
  import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
  // ... imports existants ...

  export const invoicesTable = sqliteTable('invoices', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    invoiceNumber: text('invoice_number').notNull().unique(), // FAC-2526-NBA91-0001
    seasonId: text('season_id').notNull().references(() => seasonsTable.id),
    date: text('date').notNull(), // YYYY-MM-DD
    dueDate: text('due_date').notNull(), // YYYY-MM-DD
    clientName: text('client_name').notNull(),
    clientAddress: text('client_address'),
    clientEmail: text('client_email'),
    subject: text('subject'),      // Objet de la facture
    location: text('location'),    // Lieu de l'activité
    period: text('period'),        // Dates / Période concernée
    attendees: text('attendees'),  // Personnes concernées
    status: text('status', { enum: ['draft', 'sent', 'paid', 'cancelled'] }).notNull().default('draft'),
    totalAmount: integer('total_amount').notNull(),
    bankStatementLineId: integer('bank_statement_line_id').references(() => bankStatementLinesTable.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  });

  export const invoiceItemsTable = sqliteTable('invoice_items', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    invoiceId: integer('invoice_id').notNull().references(() => invoicesTable.id, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: integer('unit_price').notNull(),
    totalPrice: integer('total_price').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  });
  ```
  Et modifier `ledgerEntriesTable` pour y adjoindre :
  ```typescript
  invoiceId: integer('invoice_id').references(() => invoicesTable.id),
  ```

- [ ] **Step 2: Générer la migration Drizzle**
  Run: `npx drizzle-kit generate` dans `libs/shared/db`.
  Expected: Un fichier `.sql` de migration est créé dans `libs/shared/db/migrations/`.

- [ ] **Step 3: Écrire le test unitaire de validation de schéma**
  Ajouter un test dans [`libs/shared/db/src/db.test.ts`](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/db.test.ts) :
  ```typescript
  it('should support creating invoices and items', async () => {
    const db = drizzle(mockD1);
    const season = await db.insert(seasonsTable).values({ id: '25-26', name: 'Saison 25-26', active: true }).returning().then(r => r[0]);
    const invoice = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0001',
      seasonId: season.id,
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Ligue IDF',
      totalAmount: 10000,
      createdAt: new Date()
    }).returning().then(r => r[0]);

    const item = await db.insert(invoiceItemsTable).values({
      invoiceId: invoice.id,
      description: 'Stage Jeunes',
      quantity: 1,
      unitPrice: 10000,
      totalPrice: 10000,
      createdAt: new Date()
    }).returning().then(r => r[0]);

    expect(invoice.id).toBeDefined();
    expect(item.id).toBeDefined();
  });
  ```

- [ ] **Step 4: Appliquer la migration localement**
  Puisque le runtime est local, appliquer la migration sur le fichier D1 local en utilisant la commande `sqlite3` session-safe ou wrangler d1 :
  Run: `npx wrangler d1 migrations apply nba-db --local`
  *(Si elle échoue pour cause de FK, désactiver temporairement les foreign keys de la même manière que précédemment en injectant les requêtes via un script SQL).*

- [ ] **Step 5: Run tests and commit**
  Run: `npm test`
  Expected: Tous les tests au vert.
  Run: `git add . && git commit -m "db: add invoices and invoice items tables"`

---

### Task 2 : API Endpoints Factures & Attestation CSE

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/index.test.ts`

**Interfaces:**
- Produces: `GET /invoices`, `GET /invoices/:id`, `POST /invoices`, `PUT /invoices/:id`, `DELETE /invoices/:id`, `POST /invoices/:id/status`, `GET /members/:id/cse-data`.

- [ ] **Step 1: Implémenter les Endpoints CRUD de Facturation**
  Ajouter dans [`apps/api/src/index.ts`](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) :
  ```typescript
  // GET /invoices
  app.get('/invoices', async (c) => {
    const season = c.req.query('season');
    if (!season) return c.json({ success: false, error: 'Saison manquante' }, 400);
    const db = drizzle(c.env.DB);
    const data = await db.select().from(invoicesTable).where(eq(invoicesTable.seasonId, season)).all();
    return c.json({ success: true, data });
  });

  // GET /invoices/:id
  app.get('/invoices/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const db = drizzle(c.env.DB);
    const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
    if (!invoice) return c.json({ success: false, error: 'Facture introuvable' }, 404);
    const items = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id)).all();
    return c.json({ success: true, data: { ...invoice, items } });
  });

  // POST /invoices
  app.post('/invoices', async (c) => {
    const body = await c.req.json();
    const db = drizzle(c.env.DB);
    if (await isSeasonClosed(db, body.seasonId)) {
      return c.json({ success: false, error: 'Saison clôturée' }, 400);
    }
    // Calculer le prochain numéro FAC-2526-NBA91-XXXX
    const seasonShort = body.seasonId.replace('-', '');
    const prefix = `FAC-${seasonShort}-NBA91-`;
    const lastInvoices = await db.select()
      .from(invoicesTable)
      .where(like(invoicesTable.invoiceNumber, `${prefix}%`))
      .all();
    let nextNum = 1;
    if (lastInvoices.length > 0) {
      const nums = lastInvoices.map(inv => {
        const parts = inv.invoiceNumber.split('-');
        return parseInt(parts[parts.length - 1]) || 0;
      });
      nextNum = Math.max(...nums) + 1;
    }
    const invoiceNumber = `${prefix}${String(nextNum).padStart(4, '0')}`;

    // Insérer la facture
    const [newInvoice] = await db.insert(invoicesTable).values({
      invoiceNumber,
      seasonId: body.seasonId,
      date: body.date,
      dueDate: body.dueDate,
      clientName: body.clientName,
      clientAddress: body.clientAddress || null,
      clientEmail: body.clientEmail || null,
      subject: body.subject || null,
      location: body.location || null,
      period: body.period || null,
      attendees: body.attendees || null,
      totalAmount: body.totalAmount,
      status: 'draft',
      createdAt: new Date()
    }).returning();

    // Insérer les items
    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        await db.insert(invoiceItemsTable).values({
          invoiceId: newInvoice.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          createdAt: new Date()
        });
      }
    }

    return c.json({ success: true, data: newInvoice });
  });

  // PUT /invoices/:id
  app.put('/invoices/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const db = drizzle(c.env.DB);
    const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
    if (!invoice) return c.json({ success: false, error: 'Facture introuvable' }, 404);
    if (invoice.status !== 'draft') {
      return c.json({ success: false, error: 'Modification impossible car non au statut Brouillon' }, 400);
    }
    if (await isSeasonClosed(db, invoice.seasonId)) {
      return c.json({ success: false, error: 'Saison clôturée' }, 400);
    }

    await db.update(invoicesTable).set({
      date: body.date,
      dueDate: body.dueDate,
      clientName: body.clientName,
      clientAddress: body.clientAddress || null,
      clientEmail: body.clientEmail || null,
      subject: body.subject || null,
      location: body.location || null,
      period: body.period || null,
      attendees: body.attendees || null,
      totalAmount: body.totalAmount
    }).where(eq(invoicesTable.id, id)).run();

    // Remplacer les items
    await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id)).run();
    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        await db.insert(invoiceItemsTable).values({
          invoiceId: id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          createdAt: new Date()
        });
      }
    }
    return c.json({ success: true });
  });

  // DELETE /invoices/:id
  app.delete('/invoices/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const db = drizzle(c.env.DB);
    const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
    if (!invoice) return c.json({ success: false, error: 'Facture introuvable' }, 404);
    if (invoice.status !== 'draft' && invoice.status !== 'cancelled') {
      return c.json({ success: false, error: 'Seules les factures brouillon ou annulées peuvent être supprimées' }, 400);
    }
    if (await isSeasonClosed(db, invoice.seasonId)) {
      return c.json({ success: false, error: 'Saison clôturée' }, 400);
    }
    await db.delete(invoicesTable).where(eq(invoicesTable.id, id)).run();
    return c.json({ success: true });
  });

  // POST /invoices/:id/status
  app.post('/invoices/:id/status', async (c) => {
    const id = parseInt(c.req.param('id'));
    const { status } = await c.req.json();
    const db = drizzle(c.env.DB);
    const invoice = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).get();
    if (!invoice) return c.json({ success: false, error: 'Facture introuvable' }, 404);
    if (await isSeasonClosed(db, invoice.seasonId)) {
      return c.json({ success: false, error: 'Saison clôturée' }, 400);
    }
    await db.update(invoicesTable).set({ status }).where(eq(invoicesTable.id, id)).run();
    return c.json({ success: true });
  });
  ```

- [ ] **Step 2: Implémenter l'Endpoint Attestation CSE**
  Ajouter dans [`apps/api/src/index.ts`](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) :
  ```typescript
  // GET /members/:id/cse-data
  app.get('/members/:id/cse-data', async (c) => {
    const id = parseInt(c.req.param('id'));
    const db = drizzle(c.env.DB);
    const member = await db.select().from(membersTable).where(eq(membersTable.id, id)).get();
    if (!member) return c.json({ success: false, error: 'Membre introuvable' }, 404);
    if (!member.paid) {
      return c.json({ success: false, error: 'L\'adhérent n\'a pas entièrement réglé sa cotisation.' }, 400);
    }

    // Trouver le règlement comptable lié à ce membre
    const tx = await db.select()
      .from(ledgerEntriesTable)
      .where(and(eq(ledgerEntriesTable.memberId, id), eq(ledgerEntriesTable.type, 'recette')))
      .orderBy(desc(ledgerEntriesTable.date))
      .get();

    return c.json({
      success: true,
      data: {
        lastName: member.lastName,
        firstName: member.firstName,
        birthDate: member.birthDate,
        amount: member.amountDue,
        paymentMethod: tx ? tx.paymentMethod : 'virement',
        paymentDate: tx ? tx.date : 'date de validation',
        season: member.season
      }
    });
  });
  ```

- [ ] **Step 3: Écrire les tests d'intégration Hono**
  Ajouter dans [`apps/api/src/index.test.ts`](file:///Users/david/Lab/nozay-bad/apps/api/src/index.test.ts) :
  ```typescript
  it('manages invoices workflow endpoints and handles next sequential code generation', async () => {
    const mockD1 = await setupMockDb();
    
    // Créer une première facture
    const createRes = await app.request('http://localhost/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        date: '2026-07-14',
        dueDate: '2026-08-14',
        clientName: 'Ligue IDF',
        totalAmount: 12000,
        items: [{ description: 'Stage ligue', quantity: 2, unitPrice: 6000 }]
      })
    }, { DB: mockD1 as any });
    expect(createRes.status).toBe(200);
    const createData = await createRes.json() as any;
    expect(createData.data.invoiceNumber).toBe('FAC-2526-NBA91-0001');

    // Vérifier l'incrémentation séquentielle sur la deuxième
    const createRes2 = await app.request('http://localhost/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        date: '2026-07-15',
        dueDate: '2026-08-15',
        clientName: 'Ligue IDF n2',
        totalAmount: 5000,
        items: []
      })
    }, { DB: mockD1 as any });
    const createData2 = await createRes2.json() as any;
    expect(createData2.data.invoiceNumber).toBe('FAC-2526-NBA91-0002');
  });
  ```

- [ ] **Step 4: Run tests and commit**
  Run: `npm test`
  Expected: PASS
  Run: `git add . && git commit -m "feat: implement invoices and cse-data endpoints with vitest integration"`

---

### Task 3 : Câblage du Rapprochement des Factures

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/index.test.ts`

**Interfaces:**
- Consumes: `POST /bank-transactions/:id/reconcile` (body `action: 'create'` ou `action: 'link'`)

- [ ] **Step 1: Modifier l'API de rapprochement bancaire**
  Rechercher la route `POST /bank-transactions/:id/reconcile` dans [`apps/api/src/index.ts`](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts). Modifier la logique d'action `'create'` pour supporter la liaison de `invoiceId` :
  ```typescript
  const { action, memberId, invoiceId, transaction } = body;
  // ...
  if (body.action === 'create') {
    const tx = body.transaction;
    // ...
    const [newTx] = await db.insert(ledgerEntriesTable).values({
      seasonId: tx.seasonId,
      type: tx.type,
      accountId: tx.accountId,
      destinationAccountId: tx.destinationAccountId || null,
      category: normalizeCategory(tx.category),
      amount: Math.round(tx.amount),
      date: tx.date,
      paymentMethod: tx.paymentMethod,
      description: tx.description,
      reference: tx.reference || null,
      memberId: memberId || null,
      invoiceId: invoiceId || null, // Associer la facture
      bankStatementLineId: id,
      createdAt: new Date()
    }).returning();
    
    // Si lié à une facture, la marquer comme payée et lui associer la transaction bancaire
    if (invoiceId) {
      await db.update(invoicesTable)
        .set({ status: 'paid', bankStatementLineId: id })
        .where(eq(invoicesTable.id, invoiceId))
        .run();
    }
    lastTxId = newTx.id;
  }
  ```

- [ ] **Step 2: Ajouter les tests d'intégration du rapprochement**
  Dans [`apps/api/src/index.test.ts`](file:///Users/david/Lab/nozay-bad/apps/api/src/index.test.ts) :
  ```typescript
  it('supports reconciling a bank transaction directly with a club invoice', async () => {
    const mockD1 = await setupMockDb();
    const db = drizzle(mockD1 as any);

    // 1. Créer une facture
    const inv = await db.insert(invoicesTable).values({
      invoiceNumber: 'FAC-2526-NBA91-0010',
      seasonId: '25-26',
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Comité 91',
      totalAmount: 15000,
      status: 'sent',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // 2. Insérer une ligne de relevé bancaire de 150.00 €
    const bt = await db.insert(bankStatementLinesTable).values({
      fitid: 'FITID-RECON-INV-1',
      accountId: 'current',
      seasonId: '25-26',
      amount: 15000,
      date: '2026-07-15',
      name: 'VIR RECU COMITE 91',
      status: 'pending',
      createdAt: new Date()
    }).returning().then(r => r[0]);

    // 3. Rapprocher via l'API
    const reconcileRes = await app.request(`http://localhost/bank-transactions/${bt.id}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        invoiceId: inv.id,
        transaction: {
          seasonId: '25-26',
          type: 'recette',
          accountId: 'current',
          category: 7, // Cordage ou autre vente
          amount: 15000,
          date: '2026-07-15',
          paymentMethod: 'virement',
          description: 'Règlement Facture FAC-2526-NBA91-0010'
        }
      })
    }, { DB: mockD1 as any });
    expect(reconcileRes.status).toBe(200);

    // 4. Vérifier que la facture est payée et que la ligne D1 pointe dessus
    const updatedInv = await db.select().from(invoicesTable).where(eq(invoicesTable.id, inv.id)).get();
    expect(updatedInv.status).toBe('paid');
    expect(updatedInv.bankStatementLineId).toBe(bt.id);
  });
  ```

- [ ] **Step 3: Run tests and commit**
  Run: `npm test`
  Expected: PASS
  Run: `git add . && git commit -m "feat: support bank transaction reconciliation with invoices"`

---

### Task 4 : Interface de Gestion des Factures (Svelte 5)

**Files:**
- Create: `apps/admin-console/src/components/InvoicesManager.svelte`
- Create: `apps/admin-console/src/pages/admin/compta/invoices.astro`
- Create: `apps/admin-console/src/components/InvoicesManager.test.ts`

**Interfaces:**
- Consumes: API `GET /invoices`, `POST /invoices`, `PUT /invoices/:id`, `DELETE /invoices/:id`, `POST /invoices/:id/status`.

- [ ] **Step 1: Créer le composant InvoicesManager**
  Créer le fichier [`apps/admin-console/src/components/InvoicesManager.svelte`](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/components/InvoicesManager.svelte) avec la gestion d'état Svelte 5 (`$state`, `$derived`, `$props`). Le design doit correspondre aux chartes premium existantes (badges de statuts, formulaires modals soignés, tableaux structurés).

- [ ] **Step 2: Créer la page Astro d'administration**
  Créer [`apps/admin-console/src/pages/admin/compta/invoices.astro`](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/compta/invoices.astro) :
  ```astro
  ---
  import AdminLayout from '../../../layouts/AdminLayout.astro';
  import InvoicesManager from '../../../components/InvoicesManager.svelte';
  import { getSeasons } from '../../../../shared/db'; // ou équivalent
  // Récupérer les saisons actives pour alimenter le sélecteur
  ---
  <AdminLayout title="Gestion des Factures">
    <InvoicesManager client:load />
  </AdminLayout>
  ```

- [ ] **Step 3: Écrire le test unitaire du composant Svelte**
  Créer [`apps/admin-console/src/components/InvoicesManager.test.ts`](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/components/InvoicesManager.test.ts) utilisant Vitest et `svelte` mount pour vérifier l'affichage des factures initiales et l'affichage du bouton de création.

- [ ] **Step 4: Run tests, check types, and commit**
  Run: `npm test`
  Run: `npx astro check`
  Expected: Tous les voyants au vert.
  Run: `git add . && git commit -m "feat: add InvoicesManager component and astro page"`

---

### Task 5 : Rapprochement de Facture dans l'UI

**Files:**
- Modify: `apps/admin-console/src/components/BankStatementReconciliation.svelte`

**Interfaces:**
- Consumes: `GET /invoices` (pour lister les factures impayées)

- [ ] **Step 1: Ajouter l'onglet « Factures » sur l'interface**
  Modifier [`apps/admin-console/src/components/BankStatementReconciliation.svelte`](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/components/BankStatementReconciliation.svelte) pour y charger le tableau des factures ouvertes (statut `sent` ou `draft`) :
  ```typescript
  let unpaidInvoices = $state<Invoice[]>([]);
  // Fetch invoices on change or season change
  ```
  Ajouter un sélecteur dans le panneau de droite de rapprochement à côté des onglets « Adhérent » et « Opération Diverse » pour afficher les factures impayées.

- [ ] **Step 2: Câbler l'association de facture**
  Dans le panneau d'action de rapprochement, ajouter le bouton « Associer » pour une facture. Lors du clic, appeler `handleMatch(bt.id, null, invoice.id)`.

- [ ] **Step 3: Run tests and commit**
  Run: `npm test`
  Expected: PASS
  Run: `git add . && git commit -m "ux: integrate invoice matching tab in bank reconciliation interface"`

---

### Task 6 : Templates d'Impression "Print-Ready"

**Files:**
- Create: `apps/admin-console/src/pages/admin/compta/invoices/[id].astro`
- Create: `apps/admin-console/src/pages/admin/compta/attestations/[id].astro`
- Modify: `apps/admin-console/src/components/MembersTable.svelte` (ou équivalent pour rajouter le bouton d'attestation)

**Interfaces:**
- Consumes: `/admin/compta/invoices/:id` et `/admin/compta/attestations/:id`

- [ ] **Step 1: Créer le template d'impression de la Facture**
  Créer le fichier [`apps/admin-console/src/pages/admin/compta/invoices/[id].astro`](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/compta/invoices/%5Bid%5D.astro) :
  - Mise en page calquée sur `Facture modèle.docx`.
  - Coordonnées bancaires complètes de la Société Générale.
  - Mentions légales d'exonération de TVA de l'association.
  - Floating button "Imprimer cette facture" qui appelle `window.print()` (et se masque à l'impression avec la classe CSS `@media print { .no-print { display: none; } }`).

- [ ] **Step 2: Créer le template d'impression de l'Attestation CSE**
  Créer le fichier [`apps/admin-console/src/pages/admin/compta/attestations/[id].astro`](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/compta/attestations/%5Bid%5D.astro) :
  - Contenu textuel calqué fidèlement sur `Attestation CE NBA 2025-2026.docx`.
  - Signature de Robert THAI intégrée numériquement ou stylisée.
  - Bouton d'impression masqué lors du tirage papier/PDF.

- [ ] **Step 3: Ajouter le bouton d'action sur le profil / table des adhérents**
  Ajouter le bouton "Attestation CSE" pointant vers `/admin/compta/attestations/{member.id}` avec `target="_blank"` dans les fiches adhérents à jour de cotisation.

- [ ] **Step 4: Run final verification commands**
  Run: `npm test`
  Run: `npx astro check`
  Expected: Toutes les vérifications au vert !
  Run: `git add . && git commit -m "feat: complete print-ready templates for invoices and cse certificates"`
