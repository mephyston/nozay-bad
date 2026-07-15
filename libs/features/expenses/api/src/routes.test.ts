import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { expensesRouter } from './routes';
import {
  setupMockDb,
  seasonsTable,
  transactionsTable,
  expensesTable,
} from '@metacult/shared-db';
import { eq } from 'drizzle-orm';

const app = new Hono<{ Bindings: { DB: any } }>();
app.route('/expenses', expensesRouter);

describe('Expenses API Endpoints', () => {
  it('supports creating, listing, approving and rejecting expenses', async () => {
    const { mockD1, db } = await setupMockDb();

    // Insert season
    await db.insert(seasonsTable).values({ id: '25-26', name: 'Saison 2025-2026', active: true, createdAt: new Date() }).onConflictDoNothing().run();

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
    expect(createJson.data.id).toBeDefined();
    expect(createJson.data.status).toBe('pending');
    expect(createJson.data.emitterName).toBe('Marie Curie');

    const expenseId = createJson.data.id;

    // 2. List expenses
    const listRes = await app.request('http://localhost/expenses?season=25-26', undefined, { DB: mockD1 as any });
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json() as any;
    expect(listJson.success).toBe(true);
    expect(listJson.data).toHaveLength(1);
    expect(listJson.data[0].id).toBe(expenseId);

    // 3. Approve expense
    const approveRes = await app.request(`http://localhost/expenses/${expenseId}/approve`, {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(approveRes.status).toBe(200);
    const approveJson = await approveRes.json() as any;
    expect(approveJson.success).toBe(true);
    expect(approveJson.data.status).toBe('approved');
    expect(approveJson.data.transactionId).toBeDefined();

    // Verify transaction was created in compta
    const tx = await db.select().from(transactionsTable).where(eq(transactionsTable.id, approveJson.data.transactionId)).get();
    expect(tx).toBeDefined();
    expect(tx.type).toBe('depense');
    expect(tx.amount).toBe(4500);
    expect(tx.category).toBe(10);
    expect(tx.description).toContain('Remboursement frais - Marie Curie - Achat de cartons pour tournoi');

    // 4. Create another expense to test rejection
    const res2 = await app.request('http://localhost/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        description: 'Repas de Noel',
        category: 'evenements_buvettes',
        amount: 8500,
        emitterName: 'Albert Einstein'
      })
    }, { DB: mockD1 as any });
    const expenseId2 = (await res2.json() as any).data.id;

    // Reject expense
    const rejectRes = await app.request(`http://localhost/expenses/${expenseId2}/reject`, {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(rejectRes.status).toBe(200);
    const rejectJson = await rejectRes.json() as any;
    expect(rejectJson.success).toBe(true);
    expect(rejectJson.data.status).toBe('rejected');

    // 5. Update expense
    const updateRes = await app.request(`http://localhost/expenses/${expenseId2}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Repas de Noel avec buvette',
        category: 'evenements_buvettes',
        amount: 9000
      })
    }, { DB: mockD1 as any });
    expect(updateRes.status).toBe(200);
    const updateJson = await updateRes.json() as any;
    expect(updateJson.success).toBe(true);
    expect(updateJson.data.description).toBe('Repas de Noel avec buvette');
    expect(updateJson.data.amount).toBe(9000);

    // 6. Test cancellation of approved expense
    const cancelRes = await app.request(`http://localhost/expenses/${expenseId}/cancel`, {
      method: 'POST'
    }, { DB: mockD1 as any });
    expect(cancelRes.status).toBe(200);
    const cancelJson = await cancelRes.json() as any;
    expect(cancelJson.success).toBe(true);
    expect(cancelJson.data.status).toBe('pending');
    expect(cancelJson.data.transactionId).toBeNull();

    // Check associated transaction is deleted
    const txDeleted = await db.select().from(transactionsTable).where(eq(transactionsTable.id, approveJson.data.transactionId)).get();
    expect(txDeleted).toBeUndefined();

  });
});
