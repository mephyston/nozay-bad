# Plan d'Implémentation : Validation TypeBox des Routes Accounting

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter la validation TypeBox pour toutes les routes JSON et query obligatoires du domaine `accounting`, et corriger la règle ESLint correspondante.

**Architecture:** Ajouter des validateurs TypeBox (`validator.ts`) dans chaque tranche (slice) et les brancher dans les routes (`route.ts`) via `tbValidator` en remplaçant `c.req.json()`. Ajouter des fichiers de test de route (`route.test.ts`) pour valider les comportements.

**Tech Stack:** Hono, TypeBox (`@sinclair/typebox`), `@hono/typebox-validator`, ESLint, Vitest.

## Global Constraints

- Tous les nouveaux schémas doivent utiliser `@sinclair/typebox` (pas le paquet `typebox`).
- Les callback d'erreur de validation doivent retourner un code HTTP 400 avec le format JSON : `{ success: false, error: 'Validation failed: <details>' }`.
- Interdire tout import direct de `drizzle-orm` ou ses sous-modules dans les routes, à l'exception de `drizzle-orm/d1`.
- Les fichiers modifiés doivent respecter ESLint (`npx eslint .`).
- Les tests unitaires doivent tous passer (`npx vitest run`).

---

### Task 1: Correction de la Règle ESLint

**Files:**
- Modify: `eslint.config.js:68-89`

**Interfaces:**
- Consumes: None
- Produces: None

- [ ] **Step 1: Modifier `eslint.config.js`**

Remplacer la règle `no-restricted-imports` pour les fichiers de routes afin de cibler `route.ts`, interdire `drizzle-orm` et ses sous-modules, sauf `drizzle-orm/d1`.

```javascript
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
              group: ['**/data-access/**', '**/schema'],
              message: 'Please do not import data-access or schemas directly in route files. Confine database logic to repository files.'
            }
          ]
        }
      ]
    }
  },
```

- [ ] **Step 2: Lancer ESLint pour vérifier la validité de la règle**

Run: `npx eslint libs/domains/accounting`
Expected: Passe sans erreur, ou signale des imports interdits existants si certains routes importent autre chose que `drizzle-orm/d1` (qui devront être corrigés).

- [ ] **Step 3: Commiter le changement**

Run: `git commit -am "chore(eslint): correct routes file patterns and restrict drizzle-orm imports"`

---

### Task 2: Validateurs pour les Commandes de Création de Base

**Files:**
- Create: `libs/domains/accounting/commands/create-account-class/validator.ts`
- Modify: `libs/domains/accounting/commands/create-account-class/route.ts`
- Create: `libs/domains/accounting/commands/create-account-class/route.test.ts`
- Create: `libs/domains/accounting/commands/create-category/validator.ts`
- Modify: `libs/domains/accounting/commands/create-category/route.ts`
- Create: `libs/domains/accounting/commands/create-category/route.test.ts`
- Create: `libs/domains/accounting/commands/create-season/validator.ts`
- Modify: `libs/domains/accounting/commands/create-season/route.ts`
- Create: `libs/domains/accounting/commands/create-season/route.test.ts`
- Create: `libs/domains/accounting/commands/create-bank-check-deposit/validator.ts`
- Modify: `libs/domains/accounting/commands/create-bank-check-deposit/route.ts`
- Create: `libs/domains/accounting/commands/create-bank-check-deposit/route.test.ts`

**Interfaces:**
- Consumes: `CreateAccountClassInput`, `CreateCategoryInput`, `CreateSeasonInput`, `CreateCheckDepositInput`, `ClearCheckDepositInput`
- Produces: TypeBox Validation Schemas for routes

- [ ] **Step 1: Implémenter et brancher `create-account-class`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const createAccountClassSchema = Type.Object({
      code: Type.String({ minLength: 1 }),
      label: Type.String({ minLength: 1 }),
      type: Type.Union([Type.Literal('recette'), Type.Literal('depense')])
    });
    ```
  - Brancher le validateur dans `route.ts` avec `tbValidator` et remplacer la validation manuelle et `await c.req.json()`.
  - Fichier `route.test.ts` :
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { createAccountClassRoute } from './route';
    import { setupMockDb } from '@metacult/shared-db/test-utils';
    describe('CreateAccountClass Route', () => {
      it('should return 400 on invalid body', async () => {
        const { mockD1 } = await setupMockDb();
        const res = await createAccountClassRoute.request('http://localhost/account-classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: '', label: 'Test' })
        }, { DB: mockD1 as any });
        expect(res.status).toBe(400);
      });
      it('should return 200 on valid body', async () => {
        const { mockD1 } = await setupMockDb();
        const res = await createAccountClassRoute.request('http://localhost/account-classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: '60', label: 'Achats', type: 'depense' })
        }, { DB: mockD1 as any });
        expect(res.status).toBe(200);
      });
    });
    ```

- [ ] **Step 2: Implémenter et brancher `create-category`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const createCategorySchema = Type.Object({
      adminLabel: Type.String({ minLength: 1 }),
      adherentLabel: Type.String({ minLength: 1 }),
      hideInExpenses: Type.Optional(Type.Boolean()),
      receiptCode: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      expenseCode: Type.Optional(Type.Union([Type.String(), Type.Null()]))
    });
    ```
  - Brancher dans `route.ts` et remplacer `await c.req.json()`.
  - Fichier `route.test.ts` avec cas d'erreur (400) et succès (200).

- [ ] **Step 3: Implémenter et brancher `create-season`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const createSeasonSchema = Type.Object({
      id: Type.String({ minLength: 1 }),
      name: Type.String({ minLength: 1 }),
      active: Type.Optional(Type.Boolean())
    });
    ```
  - Brancher dans `route.ts`.
  - Fichier `route.test.ts` avec cas d'erreur (400) et succès (200).

- [ ] **Step 4: Implémenter et brancher `create-bank-check-deposit`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const createCheckDepositSchema = Type.Object({
      seasonId: Type.String({ minLength: 1 }),
      reference: Type.String({ minLength: 1 }),
      date: Type.String({ minLength: 1 }),
      checkIds: Type.Array(Type.Number())
    });
    export const clearCheckDepositSchema = Type.Object({
      bankTransactionId: Type.Number()
    });
    ```
  - Brancher dans `route.ts` (pour `/check-deposits` et `/check-deposits/:id/clear`).
  - Fichier `route.test.ts` avec cas d'erreur (400) et succès (200).

- [ ] **Step 5: Valider et Commiter**
  Run: `npx vitest run libs/domains/accounting`
  Run: `git commit -am "feat(accounting): implement validators for base creation commands"`

---

### Task 3: Validateurs pour les Commandes de Création Complexes

**Files:**
- Create: `libs/domains/accounting/commands/create-invoice/validator.ts`
- Modify: `libs/domains/accounting/commands/create-invoice/route.ts`
- Create: `libs/domains/accounting/commands/create-invoice/route.test.ts`
- Create: `libs/domains/accounting/commands/create-transaction/validator.ts`
- Modify: `libs/domains/accounting/commands/create-transaction/route.ts`
- Create: `libs/domains/accounting/commands/create-transaction/route.test.ts`
- Create: `libs/domains/accounting/commands/record-check-transaction/validator.ts`
- Modify: `libs/domains/accounting/commands/record-check-transaction/route.ts`
- Create: `libs/domains/accounting/commands/record-check-transaction/route.test.ts`
- Create: `libs/domains/accounting/commands/reconcile-bank-transaction/validator.ts`
- Modify: `libs/domains/accounting/commands/reconcile-bank-transaction/route.ts`
- Create: `libs/domains/accounting/commands/reconcile-bank-transaction/route.test.ts`

**Interfaces:**
- Consumes: DTOs, schemas
- Produces: TypeBox Validation Schemas for complex creations

- [ ] **Step 1: Implémenter et brancher `create-invoice`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const createInvoiceSchema = Type.Object({
      seasonId: Type.String({ minLength: 1 }),
      date: Type.String({ minLength: 1 }),
      dueDate: Type.String({ minLength: 1 }),
      clientName: Type.String({ minLength: 1 }),
      clientAddress: Type.Optional(Type.String()),
      clientEmail: Type.Optional(Type.String()),
      subject: Type.Optional(Type.String()),
      location: Type.Optional(Type.String()),
      period: Type.Optional(Type.String()),
      attendees: Type.Optional(Type.String()),
      totalAmount: Type.Number(),
      items: Type.Optional(Type.Array(Type.Object({
        description: Type.String({ minLength: 1 }),
        quantity: Type.Number(),
        unitPrice: Type.Number()
      })))
    });
    ```
  - Brancher dans `route.ts`.
  - Fichier `route.test.ts` avec cas d'erreur (400) et succès (200).

- [ ] **Step 2: Implémenter et brancher `create-transaction`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const createTransactionSchema = Type.Object({
      seasonId: Type.String({ minLength: 1 }),
      type: Type.Union([Type.Literal('recette'), Type.Literal('depense'), Type.Literal('transfert')]),
      accountId: Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')]),
      destinationAccountId: Type.Optional(Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')])),
      category: Type.Optional(Type.Union([Type.String(), Type.Number()])),
      amount: Type.Number(),
      date: Type.String({ minLength: 1 }),
      paymentMethod: Type.Union([
        Type.Literal('virement'),
        Type.Literal('cheque'),
        Type.Literal('especes'),
        Type.Literal('labaz'),
        Type.Literal('ancv'),
        Type.Literal('pass_sport'),
        Type.Literal('ticket_loisir'),
        Type.Literal('up_loisir')
      ]),
      description: Type.String(),
      reference: Type.Optional(Type.String())
    });
    ```
  - Brancher dans `route.ts`.
  - Fichier `route.test.ts` avec cas d'erreur (400) et succès (200).

- [ ] **Step 3: Implémenter et brancher `record-check-transaction`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const createCheckSchema = Type.Object({
      seasonId: Type.String({ minLength: 1 }),
      number: Type.String({ minLength: 1 }),
      amount: Type.Number(),
      emitter: Type.String({ minLength: 1 }),
      bank: Type.Optional(Type.String()),
      memberId: Type.Optional(Type.Number()),
      category: Type.Optional(Type.Union([Type.String(), Type.Number()])),
      description: Type.Optional(Type.String()),
      date: Type.Optional(Type.String()),
      photoUrl: Type.Optional(Type.String())
    });
    ```
  - Brancher dans `route.ts` (pour `/checks` endpoint).
  - Fichier `route.test.ts` avec cas d'erreur (400) et succès (200).

- [ ] **Step 4: Implémenter et brancher `reconcile-bank-transaction`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    const transactionDetailsSchema = Type.Object({
      seasonId: Type.String({ minLength: 1 }),
      type: Type.Union([Type.Literal('recette'), Type.Literal('depense'), Type.Literal('transfert')]),
      accountId: Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')]),
      destinationAccountId: Type.Optional(Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')])),
      category: Type.Optional(Type.Union([Type.String(), Type.Number()])),
      amount: Type.Number(),
      date: Type.String(),
      paymentMethod: Type.Union([
        Type.Literal('virement'), Type.Literal('cheque'), Type.Literal('especes'), Type.Literal('labaz'),
        Type.Literal('ancv'), Type.Literal('pass_sport'), Type.Literal('ticket_loisir'), Type.Literal('up_loisir')
      ]),
      description: Type.String(),
      reference: Type.Optional(Type.String())
    });
    export const reconcileBankTransactionSchema = Type.Object({
      memberId: Type.Optional(Type.Number()),
      invoiceId: Type.Optional(Type.Number()),
      invoiceIds: Type.Optional(Type.Array(Type.Number())),
      action: Type.Union([Type.Literal('match'), Type.Literal('create')]),
      transactionId: Type.Optional(Type.Number()),
      transactions: Type.Optional(Type.Array(transactionDetailsSchema)),
      transaction: Type.Optional(transactionDetailsSchema)
    });
    export const reconcileBulkTransactionsSchema = Type.Object({
      requests: Type.Array(Type.Intersect([Type.Object({ btId: Type.Number() }), reconcileBankTransactionSchema]))
    });
    ```
  - Brancher dans `route.ts` (les deux endpoints).
  - Fichier `route.test.ts` avec cas d'erreur (400) et succès (200).

- [ ] **Step 5: Valider et Commiter**
  Run: `npx vitest run libs/domains/accounting`
  Run: `git commit -am "feat(accounting): implement validators for complex creation/reconcile commands"`

---

### Task 4: Validateurs pour les Commandes de Modification

**Files:**
- Create: `libs/domains/accounting/commands/change-invoice-status/validator.ts`
- Modify: `libs/domains/accounting/commands/change-invoice-status/route.ts`
- Create: `libs/domains/accounting/commands/change-invoice-status/route.test.ts`
- Create: `libs/domains/accounting/commands/update-account-class/validator.ts`
- Modify: `libs/domains/accounting/commands/update-account-class/route.ts`
- Create: `libs/domains/accounting/commands/update-account-class/route.test.ts`
- Create: `libs/domains/accounting/commands/update-category/validator.ts`
- Modify: `libs/domains/accounting/commands/update-category/route.ts`
- Create: `libs/domains/accounting/commands/update-category/route.test.ts`
- Create: `libs/domains/accounting/commands/update-invoice/validator.ts`
- Modify: `libs/domains/accounting/commands/update-invoice/route.ts`
- Create: `libs/domains/accounting/commands/update-invoice/route.test.ts`
- Create: `libs/domains/accounting/commands/update-season/validator.ts`
- Modify: `libs/domains/accounting/commands/update-season/route.ts`
- Create: `libs/domains/accounting/commands/update-season/route.test.ts`
- Create: `libs/domains/accounting/commands/update-season-balances/validator.ts`
- Modify: `libs/domains/accounting/commands/update-season-balances/route.ts`
- Create: `libs/domains/accounting/commands/update-season-balances/route.test.ts`
- Create: `libs/domains/accounting/commands/update-season-budget/validator.ts`
- Modify: `libs/domains/accounting/commands/update-season-budget/route.ts`
- Create: `libs/domains/accounting/commands/update-season-budget/route.test.ts`
- Create: `libs/domains/accounting/commands/update-transaction/validator.ts`
- Modify: `libs/domains/accounting/commands/update-transaction/route.ts`
- Create: `libs/domains/accounting/commands/update-transaction/route.test.ts`

**Interfaces:**
- Consumes: DTOs, schemas
- Produces: TypeBox Validation Schemas for update commands

- [ ] **Step 1: Implémenter et brancher `change-invoice-status`**
  - Fichier `validator.ts` (défini à l'étape précédente).
  - Brancher et créer `route.test.ts`.

- [ ] **Step 2: Implémenter et brancher `update-account-class`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const updateAccountClassSchema = Type.Object({
      label: Type.Optional(Type.String()),
      type: Type.Optional(Type.Union([Type.Literal('recette'), Type.Literal('depense')]))
    });
    ```
  - Brancher et créer `route.test.ts`.

- [ ] **Step 3: Implémenter et brancher `update-category`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const updateCategorySchema = Type.Object({
      adminLabel: Type.Optional(Type.String()),
      adherentLabel: Type.Optional(Type.String()),
      hideInExpenses: Type.Optional(Type.Boolean()),
      receiptCode: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      expenseCode: Type.Optional(Type.Union([Type.String(), Type.Null()]))
    });
    ```
  - Brancher et créer `route.test.ts`.

- [ ] **Step 4: Implémenter et brancher `update-invoice`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const updateInvoiceSchema = Type.Object({
      date: Type.String({ minLength: 1 }),
      dueDate: Type.String({ minLength: 1 }),
      clientName: Type.String({ minLength: 1 }),
      clientAddress: Type.Optional(Type.String()),
      clientEmail: Type.Optional(Type.String()),
      subject: Type.Optional(Type.String()),
      location: Type.Optional(Type.String()),
      period: Type.Optional(Type.String()),
      attendees: Type.Optional(Type.String()),
      totalAmount: Type.Number(),
      items: Type.Optional(Type.Array(Type.Object({
        description: Type.String({ minLength: 1 }),
        quantity: Type.Number(),
        unitPrice: Type.Number()
      })))
    });
    ```
  - Brancher et créer `route.test.ts`.

- [ ] **Step 5: Implémenter et brancher `update-season`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const updateSeasonSchema = Type.Object({
      name: Type.Optional(Type.String({ minLength: 1 })),
      active: Type.Optional(Type.Boolean()),
      closed: Type.Optional(Type.Boolean())
    });
    ```
  - Brancher et créer `route.test.ts`.

- [ ] **Step 6: Implémenter et brancher `update-season-balances`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const updateSeasonBalancesSchema = Type.Array(
      Type.Object({
        accountId: Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')]),
        initialBalance: Type.Number()
      })
    );
    ```
  - Brancher et créer `route.test.ts`.

- [ ] **Step 7: Implémenter et brancher `update-season-budget`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const updateSeasonBudgetSchema = Type.Array(
      Type.Object({
        categoryId: Type.Number(),
        type: Type.Union([Type.Literal('recette'), Type.Literal('depense')]),
        amount: Type.Number()
      })
    );
    ```
  - Brancher et créer `route.test.ts`.

- [ ] **Step 8: Implémenter et brancher `update-transaction`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const updateTransactionSchema = Type.Object({
      seasonId: Type.String({ minLength: 1 }),
      type: Type.Union([Type.Literal('recette'), Type.Literal('depense'), Type.Literal('transfert')]),
      accountId: Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')]),
      destinationAccountId: Type.Optional(Type.Union([Type.Literal('current'), Type.Literal('savings'), Type.Literal('cash')])),
      category: Type.Optional(Type.Union([Type.String(), Type.Number()])),
      amount: Type.Number(),
      date: Type.String(),
      paymentMethod: Type.String(),
      description: Type.String(),
      reference: Type.Optional(Type.String())
    });
    ```
  - Brancher et créer `route.test.ts`.

- [ ] **Step 9: Valider et Commiter**
  Run: `npx vitest run libs/domains/accounting`
  Run: `git commit -am "feat(accounting): implement validators for update commands"`

---

### Task 5: Validateurs pour les Requêtes de Lecture et Query Params

**Files:**
- Create: `libs/domains/accounting/queries/list-bank-transactions/validator.ts`
- Modify: `libs/domains/accounting/queries/list-bank-transactions/route.ts`
- Create: `libs/domains/accounting/queries/list-bank-transactions/route.test.ts`
- Create: `libs/domains/accounting/queries/list-checks/validator.ts`
- Modify: `libs/domains/accounting/queries/list-checks/route.ts`
- Create: `libs/domains/accounting/queries/list-checks/route.test.ts`
- Create: `libs/domains/accounting/queries/list-invoices/validator.ts`
- Modify: `libs/domains/accounting/queries/list-invoices/route.ts`
- Create: `libs/domains/accounting/queries/list-invoices/route.test.ts`
- Create: `libs/domains/accounting/commands/analyze-bank-transactions/validator.ts`
- Modify: `libs/domains/accounting/commands/analyze-bank-transactions/route.ts`
- Create: `libs/domains/accounting/commands/analyze-bank-transactions/route.test.ts`

**Interfaces:**
- Consumes: None
- Produces: TypeBox Query Validation Schemas

- [ ] **Step 1: Implémenter et brancher `list-bank-transactions`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const listBankTransactionsQuerySchema = Type.Object({
      season: Type.String({ minLength: 1 }),
      status: Type.Optional(Type.String()),
      accountId: Type.Optional(Type.String())
    });
    ```
  - Brancher dans `route.ts` avec `tbValidator('query', listBankTransactionsQuerySchema, callback)` et lire via `c.req.valid('query')`.
  - Fichier `route.test.ts` avec cas d'erreur (400) et succès (200).

- [ ] **Step 2: Implémenter et brancher `list-checks`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const listChecksQuerySchema = Type.Object({
      season: Type.String({ minLength: 1 }),
      status: Type.Optional(Type.String())
    });
    ```
  - Brancher sur les deux endpoints de `route.ts`.
  - Fichier `route.test.ts` avec cas d'erreur (400) et succès (200).

- [ ] **Step 3: Implémenter et brancher `list-invoices`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const listInvoicesQuerySchema = Type.Object({
      season: Type.String({ minLength: 1 })
    });
    ```
  - Brancher dans `route.ts`.
  - Fichier `route.test.ts` avec cas d'erreur (400) et succès (200).

- [ ] **Step 4: Implémenter et brancher `analyze-bank-transactions`**
  - Fichier `validator.ts` :
    ```typescript
    import { Type } from '@sinclair/typebox';
    export const analyzeBankTransactionsQuerySchema = Type.Object({
      season: Type.String({ minLength: 1 }),
      id: Type.Optional(Type.String())
    });
    ```
  - Brancher dans `route.ts`.
  - Fichier `route.test.ts` avec cas d'erreur (400) et succès (200).

- [ ] **Step 5: Valider et Commiter**
  Run: `npx vitest run libs/domains/accounting`
  Run: `git commit -am "feat(accounting): implement query parameters validators"`
