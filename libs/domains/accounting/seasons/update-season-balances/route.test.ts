import { describe, it, expect, vi } from 'vitest';
import { updateSeasonBalancesRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { updateSeasonBalances } from './handler';

vi.mock('./handler', () => ({
  updateSeasonBalances: vi.fn(),
}));

describe('UpdateSeasonBalances Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await updateSeasonBalancesRoute.request('http://localhost/25-26/balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ accountId: 1, initialBalanceCents: 'not_a_number' }])
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(updateSeasonBalances).mockResolvedValue(undefined as any);
    
    const payload = [
      { accountId: 1, initialBalanceCents: 150000 },
      { accountId: 2, initialBalanceCents: 500000 }
    ];

    const res = await updateSeasonBalancesRoute.request('http://localhost/25-26/balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(updateSeasonBalances).toHaveBeenCalledWith(expect.anything(), '25-26', payload);
  });
});

