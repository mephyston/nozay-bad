import { describe, it, expect, vi } from 'vitest';
import { updateAccountClassRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { updateAccountClass } from './handler';

vi.mock('./handler', () => ({
  updateAccountClass: vi.fn(),
}));

describe('UpdateAccountClass Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await updateAccountClassRoute.request('http://localhost/account-classes/123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'invalid_type' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(updateAccountClass).mockResolvedValue({ code: '123', label: 'Updated Class', type: 'recette' } as any);
    
    const res = await updateAccountClassRoute.request('http://localhost/account-classes/123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Updated Class', type: 'recette' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(updateAccountClass).toHaveBeenCalledWith(expect.anything(), '123', { label: 'Updated Class', type: 'recette' });
  });

  it('should return 404 if account class not found', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(updateAccountClass).mockResolvedValue(undefined as any);
    
    const res = await updateAccountClassRoute.request('http://localhost/account-classes/non-existent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Updated Class' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('Classe de compte introuvable');
  });
});
