import { describe, it, expect, vi } from 'vitest';
import { deleteAccountClassRoute } from './route';

vi.mock('./handler', () => ({
  deleteAccountClass: vi.fn().mockResolvedValue({ code: '6', name: 'Charges' })
}));

describe('deleteAccountClassRoute', () => {
  it('handles valid code param', async () => {
    const res = await deleteAccountClassRoute.request('/account-classes/6', { method: 'DELETE' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 for empty code param', async () => {
    const res = await deleteAccountClassRoute.request('/account-classes/%20', { method: 'DELETE' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
