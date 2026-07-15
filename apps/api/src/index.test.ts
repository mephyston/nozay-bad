import { describe, it, expect } from 'vitest';
import app from './index';
import { setupMockDb } from '@metacult/shared-db';
import { seasonsTable } from '@metacult/features-members-data-access';
import { expensesTable } from '@metacult/features-expenses-data-access';
import { eq } from 'drizzle-orm';

describe('API Health Endpoint', () => {
  it('should return 200 OK and status ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});

describe('Cross-Domain Integration Tests', () => {
  it('should support closing a season and block write actions on closed season for expenses', async () => {
    const { mockD1 } = await setupMockDb();

    // Close season via accounting
    const closeRes = await app.request('http://localhost/accounting/seasons/25-26/close', {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(closeRes.status).toBe(200);
    const closeBody = await closeRes.json() as any;
    expect(closeBody.success).toBe(true);
    expect(closeBody.data.closed).toBe(true);

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
      id: '25-26',
      name: 'Saison 2025-2026',
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
    const txId = approveJson.data.transactionId;
    expect(txId).toBeDefined();

    // 3. Delete the transaction directly in the ledger via accounting
    const deleteTxRes = await app.request(`http://localhost/accounting/transactions/${txId}`, {
      method: 'DELETE'
    }, { DB: mockD1 as any });
    expect(deleteTxRes.status).toBe(200);

    // 4. Verify the expense claim status went back to pending
    const finalExpense = await db.select().from(expensesTable).where(eq(expensesTable.id, expenseId)).get();
    expect(finalExpense!.status).toBe('pending');
    expect(finalExpense!.transactionId).toBeNull();
  });
});
