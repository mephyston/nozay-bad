import { describe, it, expect, vi } from 'vitest';
import { listAccountClassesRoute } from './route';

vi.mock('./handler', () => ({
  listAccountClasses: vi.fn().mockResolvedValue([])
}));

describe('listAccountClassesRoute', () => {
  it('handles GET request for account classes', async () => {
    const res = await listAccountClassesRoute.request('/account-classes', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });
});
