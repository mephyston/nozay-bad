import { describe, it, expect } from 'vitest';
import app from './index';
import { setupMockDb } from '@nba/db/test-utils';
import { seasonsTable } from '../../../libs/domains/members/shared/schema';
import { expensesTable } from '../../../libs/domains/expenses/shared/schema';
import { eq, sql } from 'drizzle-orm';
import { AppError } from '@nba/db';

describe('API Health & Defense-in-Depth Auth Middleware', () => {
  it('should return 200 OK for /health without authentication', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('should reject direct external request without header with 401', async () => {
    const res = await app.request('https://nba-api.workers.dev/members', {
      headers: { 'cf-connecting-ip': '203.0.113.19' }
    }, { INTERNAL_API_KEY: 'secret123' });

    expect(res.status).toBe(401);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('Accès non autorisé');
  });

  it('should accept direct external request with valid x-api-key header with 200', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await app.request('https://nba-api.workers.dev/members', {
      headers: {
        'cf-connecting-ip': '203.0.113.19',
        'x-api-key': 'secret123'
      }
    }, { DB: mockD1 as any, INTERNAL_API_KEY: 'secret123' });

    expect(res.status).toBe(200);
  });

  it('should accept internal Service Binding requests (localhost) with 200', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await app.request('http://localhost/members', {}, { DB: mockD1 as any, INTERNAL_API_KEY: 'secret123' });
    expect(res.status).toBe(200);
  });
});

describe('Cross-Domain Integration Tests', () => {
  it('should support closing a season and block write actions on closed season for expenses', async () => {
    const { mockD1, db } = await setupMockDb();

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
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(closeRes.status).toBe(200);
    const closeBody = await closeRes.json() as any;
    expect(closeBody.data.season.closedAt).toBeTruthy();

    // Try to submit expense to /expenses (cross-domain)
    const expRes = await app.request('http://localhost/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        description: 'Should fail',
        category: 'deplacements',
        amount: 2000,
        emitterName: 'Test'
      })
    }, { DB: mockD1 as any });
    expect(expRes.status).toBe(400);
  });

  it('should reset expense status to pending when its associated accounting transaction is deleted', async () => {
    const { mockD1, db } = await setupMockDb();

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        description: 'Achat de cartons pour tournoi',
        category: 'materiel_club',
        amount: 4500, // 45.00 €
        photoUrl: 'justificatif_carton.jpg',
        emitterName: 'Marie Curie'
      })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const createJson = await res.json() as any;
    expect(createJson.success).toBe(true);
    const expenseId = createJson.data.id;

    // 2. Approve expense
    const approveRes = await app.request(`http://localhost/expenses/${expenseId}/approve`, {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(approveRes.status).toBe(200);
    const approveJson = await approveRes.json() as any;
    expect(approveJson.success).toBe(true);
    const txId = approveJson.data.ledgerEntryId;
    expect(txId).toBeDefined();

    // 3. Delete the transaction directly in the ledger via accounting
    const deleteTxRes = await app.request(`http://localhost/accounting/ledger/${txId}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
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
    const res = await app.request('/test-app-error');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: 'Custom bad request' });
  });

  it('should handle generic Error and return 500 status code', async () => {
    const res = await app.request('/test-generic-error');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: 'Erreur interne du serveur' });
  });
});
