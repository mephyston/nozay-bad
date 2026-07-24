import { describe, it, expect, vi } from 'vitest';
import { createTransactionRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { createLedgerEntry } from './handler';

vi.mock('./handler', () => ({
  createLedgerEntry: vi.fn(),
}));

describe('CreateLedgerEntry Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await createTransactionRoute.request('http://localhost/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '',
        type: 'invalid-type', // Invalid
        accountId: 'current',
        amount: 100,
        date: '2026-07-22',
        paymentMethod: 'virement',
        description: 'Test'
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(createLedgerEntry).mockResolvedValue({ id: 1 });

    const res = await createTransactionRoute.request('http://localhost/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        type: 'recette',
        accountId: 'current',
        amount: 100,
        date: '2026-07-22',
        paymentMethod: 'virement',
        description: 'Test'
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 1 });
  });

  it('should return 400 when handler throws an error', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(createLedgerEntry).mockRejectedValue(new Error('Saison clôturée'));

    const res = await createTransactionRoute.request('http://localhost/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        type: 'recette',
        accountId: 'current',
        amount: 100,
        date: '2026-07-22',
        paymentMethod: 'virement',
        description: 'Test'
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Saison clôturée');
  });
});
