import { describe, it, expect, vi } from 'vitest';
import { updateSeasonBudgetRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { updateSeasonBudget } from './handler';

vi.mock('./handler', () => ({
  updateSeasonBudget: vi.fn(),
}));

describe('UpdateSeasonBudget Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await updateSeasonBudgetRoute.request('http://localhost/25-26/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ categoryId: 'not-a-number', type: 'invalid_type', amount: 200 }])
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    const expectedData = [{ categoryId: 1, type: 'depense' as const, amount: 500 }];
    vi.mocked(updateSeasonBudget).mockResolvedValue(expectedData as any);
    
    const payload = [
      { categoryId: 1, type: 'depense' as const, amount: 500 }
    ];

    const res = await updateSeasonBudgetRoute.request('http://localhost/25-26/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual(expectedData);
    expect(updateSeasonBudget).toHaveBeenCalledWith(expect.anything(), '25-26', payload);
  });
});
