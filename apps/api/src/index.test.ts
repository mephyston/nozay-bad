import { seasonsTable } from '@nba/accounting/schema';
import { describe, it, expect } from 'vitest';
import { app } from './index';
import { setupMockDb } from '@nba/db/test-utils';

import { expensesTable } from '../../../libs/domains/expenses/shared/schema';
import { eq, sql } from 'drizzle-orm';
import { AppError } from '@nba/db';
import { TEST_ADMIN_EMAIL, seedTestAdmin } from './authz/test-identity';

/**
 * Identité affirmée par l'application admin. Ces tests exercent le comportement
 * métier de l'API composée : ils empruntent donc un compte à tous les droits, et
 * l'autorisation elle-même est couverte par `authz/middleware.test.ts`.
 */
const ADMIN_IDENTITY = { 'x-caller': 'admin', 'x-user-email': TEST_ADMIN_EMAIL };

describe('API Health & Strict API Key Auth Middleware', () => {
  it('should return 200 OK for /health without authentication', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('should return 500 when INTERNAL_API_KEY is not configured in worker environment', async () => {
    const res = await app.request('http://localhost/members', {}, {});
    expect(res.status).toBe(500);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('Erreur de configuration serveur');
  });

  it('should reject request without key with 401', async () => {
    const res = await app.request('http://localhost/members', {}, { INTERNAL_API_KEY: 'secret123' });
    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('Accès non autorisé');
  });

  it('should reject request with invalid key with 401', async () => {
    const res = await app.request('http://localhost/members', {
      headers: { 'x-api-key': 'wrongkey' }
    }, { INTERNAL_API_KEY: 'secret123' });
    expect(res.status).toBe(401);
  });

  it('should accept request with valid x-api-key header with 200', async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);
    const res = await app.request('http://localhost/members', {
      headers: { 'x-api-key': 'secret123', ...ADMIN_IDENTITY }
    }, { DB: mockD1 as any, INTERNAL_API_KEY: 'secret123' });

    expect(res.status).toBe(200);
  });

  it('should accept request with valid Authorization Bearer header with 200', async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);
    const res = await app.request('http://localhost/members', {
      headers: { 'Authorization': 'Bearer secret123', ...ADMIN_IDENTITY }
    }, { DB: mockD1 as any, INTERNAL_API_KEY: 'secret123' });

    expect(res.status).toBe(200);
  });
});

describe('Cross-Domain Integration Tests', () => {
  it('should support closing a season and block write actions on closed season for expenses', async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);

    // Ensure season 25-26 exists with past end_date and clear pending items
    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2020-01-01',
      active: true,
      createdAt: new Date()
    }).onConflictDoUpdate({ target: seasonsTable.id, set: { endDate: '2020-01-01' } }).run();

    await db.run(sql`UPDATE bank_statement_lines SET status = 'reconciled' WHERE status = 'pending'`);
    await db.run(sql`UPDATE check_deposits SET status = 'cleared' WHERE status IN ('pending', 'deposited')`);
    await db.run(sql`UPDATE checks SET status = 'cashed' WHERE status = 'received'`);

    // Close season via accounting
    const closeRes = await app.request('http://localhost/accounting/seasons/25-26/close', {
      method: 'POST',
      headers: { 'x-api-key': 'secret123', ...ADMIN_IDENTITY }
    }, { DB: mockD1 as any, INTERNAL_API_KEY: 'secret123' });
    expect(closeRes.status).toBe(200);
    const closeBody = await closeRes.json() as any;
    expect(closeBody.data.season.closedAt).toBeTruthy();

    // Try to submit expense to /expenses (cross-domain)
    const expRes = await app.request('http://localhost/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': 'secret123', ...ADMIN_IDENTITY },
      body: JSON.stringify({
        seasonId: '25-26',
        description: 'Should fail',
        category: 'deplacements',
        amount: 2000,
        emitterName: 'Test'
      })
    }, { DB: mockD1 as any, INTERNAL_API_KEY: 'secret123' });
    expect(expRes.status).toBe(400);
  });

  it('should reset expense status to pending when its associated accounting transaction is deleted', async () => {
    const { mockD1, db } = await setupMockDb();
    await seedTestAdmin(db);

    // Insert season
    await db.insert(seasonsTable).values({
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      createdAt: new Date()
    }).onConflictDoNothing().run();

    // 1. Create a pending expense report
    const res = await app.request('http://localhost/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': 'secret123', ...ADMIN_IDENTITY },
      body: JSON.stringify({
        seasonId: '25-26',
        description: 'Achat de cartons pour tournoi',
        category: 'materiel_club',
        amount: 4500, // 45.00 €
        photoUrl: 'justificatif_carton.jpg',
        emitterName: 'Marie Curie'
      })
    }, { DB: mockD1 as any, INTERNAL_API_KEY: 'secret123' });
    expect(res.status).toBe(200);
    const createJson = await res.json() as any;
    expect(createJson.success).toBe(true);
    const expenseId = createJson.data.id;

    // 2. Approve expense
    const approveRes = await app.request(`http://localhost/expenses/${expenseId}/approve`, {
      method: 'POST',
      headers: { 'x-api-key': 'secret123', ...ADMIN_IDENTITY }
    }, { DB: mockD1 as any, INTERNAL_API_KEY: 'secret123' });
    expect(approveRes.status).toBe(200);
    const approveJson = await approveRes.json() as any;
    expect(approveJson.success).toBe(true);
    const txId = approveJson.data.ledgerEntryId;
    expect(txId).toBeDefined();

    // 3. Delete the transaction directly in the ledger via accounting
    const deleteTxRes = await app.request(`http://localhost/accounting/ledger/${txId}`, {
      method: 'DELETE',
      headers: { 'x-api-key': 'secret123', ...ADMIN_IDENTITY }
    }, { DB: mockD1 as any, INTERNAL_API_KEY: 'secret123' });
    expect(deleteTxRes.status).toBe(200);

    // 4. Verify the expense claim status went back to pending
    const finalExpense = await db.select().from(expensesTable).where(eq(expensesTable.id, expenseId)).get();
    expect(finalExpense!.status).toBe('pending');
    expect(finalExpense!.ledgerEntryId).toBeNull();
  });
});

app.get('/test-app-error', () => {
  throw new AppError('Custom bad request', 400);
});

app.get('/test-generic-error', () => {
  throw new Error('Something went wrong');
});

describe('Global Error Handling', () => {
  it('should handle AppError and return custom message and status code', async () => {
    // Routes de test, absentes de ROUTE_PERMISSIONS : le mode « log » les laisse
    // passer pour que ce test porte bien sur le gestionnaire d'erreurs.
    const res = await app.request('/test-app-error', {
      headers: { 'x-api-key': 'secret123', ...ADMIN_IDENTITY }
    }, { INTERNAL_API_KEY: 'secret123', RBAC_ENFORCE: 'log' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: 'Custom bad request' });
  });

  it('should handle generic Error and return 500 status code', async () => {
    const res = await app.request('/test-generic-error', {
      headers: { 'x-api-key': 'secret123', ...ADMIN_IDENTITY }
    }, { INTERNAL_API_KEY: 'secret123', RBAC_ENFORCE: 'log' });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: 'Erreur interne du serveur' });
  });
});
