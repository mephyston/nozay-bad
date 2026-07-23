import { describe, it, expect, vi } from 'vitest';
import { updateBankTransactionStatusRoute } from './route';

vi.mock('./handler', () => ({
  updateBankTransactionStatus: vi.fn().mockResolvedValue(undefined)
}));

describe('updateBankTransactionStatusRoute', () => {
  it('handles valid numeric id param for ignore', async () => {
    const res = await updateBankTransactionStatusRoute.request('/bank-transactions/1/ignore', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('handles valid numeric id param for unignore', async () => {
    const res = await updateBankTransactionStatusRoute.request('/bank-transactions/1/unignore', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await updateBankTransactionStatusRoute.request('/bank-transactions/abc/ignore', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
