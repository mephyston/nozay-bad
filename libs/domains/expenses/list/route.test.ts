import { describe, it, expect, vi } from 'vitest';
import { listExpensesRoute } from './route';

vi.mock('./handler', () => ({
  listExpenses: vi.fn().mockResolvedValue([])
}));

describe('listExpensesRoute', () => {
  it('handles valid query params', async () => {
    const res = await listExpensesRoute.request('/?season=25-26&status=approved', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('handles missing optional query params', async () => {
    const res = await listExpensesRoute.request('/', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
