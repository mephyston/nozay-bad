import { describe, it, expect, vi } from 'vitest';
import { updateBankStatementLineStatusRoute } from './route';

vi.mock('./handler', () => ({
  updateBankStatementLineStatus: vi.fn().mockResolvedValue(undefined)
}));

describe('updateBankStatementLineStatusRoute', () => {
  it('handles valid numeric id param for ignore', async () => {
    const res = await updateBankStatementLineStatusRoute.request('/bank-statement-lines/1/ignore', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('handles valid numeric id param for unignore', async () => {
    const res = await updateBankStatementLineStatusRoute.request('/bank-statement-lines/1/unignore', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await updateBankStatementLineStatusRoute.request('/bank-statement-lines/abc/ignore', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
