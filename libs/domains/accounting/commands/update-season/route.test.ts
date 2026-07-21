import { describe, it, expect, vi } from 'vitest';
import { updateSeasonRoute } from './route';
import { setupMockDb } from '@metacult/shared-db/test-utils';
import { updateSeason } from './handler';

vi.mock('./handler', () => ({
  updateSeason: vi.fn(),
}));

describe('UpdateSeason Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await updateSeasonRoute.request('http://localhost/25-26', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', active: 'not-a-boolean' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(updateSeason).mockResolvedValue({ id: '25-26', name: 'Saison 25-26', active: true });
    
    const res = await updateSeasonRoute.request('http://localhost/25-26', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Saison 25-26', active: true, closed: false })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(updateSeason).toHaveBeenCalledWith(expect.anything(), '25-26', { name: 'Saison 25-26', active: true, closed: false });
  });
});
