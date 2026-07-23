import { describe, it, expect, vi } from 'vitest';
import { updateCategoryRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { updateCategory } from './handler';

vi.mock('./handler', () => ({
  updateCategory: vi.fn(),
}));

describe('UpdateCategory Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await updateCategoryRoute.request('http://localhost/categories/123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hideInExpenses: 'not-a-boolean' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(updateCategory).mockResolvedValue({ id: 123, adminLabel: 'Updated Label' });
    
    const res = await updateCategoryRoute.request('http://localhost/categories/123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminLabel: 'Updated Label', hideInExpenses: true })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(updateCategory).toHaveBeenCalledWith(expect.anything(), 123, { adminLabel: 'Updated Label', hideInExpenses: true });
  });

  it('should return 404 if category not found', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(updateCategory).mockResolvedValue(undefined);
    
    const res = await updateCategoryRoute.request('http://localhost/categories/999', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminLabel: 'Updated Label' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Catégorie introuvable');
  });
});
