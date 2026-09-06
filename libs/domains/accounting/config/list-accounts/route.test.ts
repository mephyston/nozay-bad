import { describe, it, expect, vi } from 'vitest';
import { listAccountsRoute } from './route';

vi.mock('./handler', () => ({
  listAccounts: vi.fn().mockResolvedValue([{ id: 4, code: 'badnet', label: 'Porte-monnaie Badnet', classCode: '4091', classType: 'tresorerie' }])
}));

describe('listAccountsRoute', () => {
  it('rend la liste des comptes', async () => {
    const res = await listAccountsRoute.request('/accounts', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data[0].code).toBe('badnet');
  });
});
