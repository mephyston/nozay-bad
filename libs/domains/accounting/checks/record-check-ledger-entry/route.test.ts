import { describe, it, expect, vi } from 'vitest';
import { recordCheckTransactionRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { createCheck } from './handler';

vi.mock('./handler', () => ({
  createCheck: vi.fn(),
  analyzeCheckImage: vi.fn(),
  deleteCheck: vi.fn(),
}));

describe('RecordCheckLedgerEntry Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await recordCheckTransactionRoute.request('http://localhost/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '',
        number: '1234567',
        amount: 100
        // Missing emitter
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(createCheck).mockResolvedValue({ id: 1 });

    const res = await recordCheckTransactionRoute.request('http://localhost/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        number: '1234567',
        amount: 100,
        emitter: 'John Doe',
        bank: 'My Bank',
        memberId: 42,
        category: 'Adhésion',
        description: 'Test check',
        date: '2026-07-22',
        photoUrl: 'http://example.com/check.jpg'
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 1 });
  });

  it('should return 400 when handler throws an error', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(createCheck).mockRejectedValue(new Error('Saison clôturée'));

    const res = await recordCheckTransactionRoute.request('http://localhost/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        number: '1234567',
        amount: 100,
        emitter: 'John Doe'
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Saison clôturée');
  });
});
