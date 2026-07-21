import { describe, it, expect } from 'vitest';
import { createSeasonRoute } from './route';
import { setupMockDb } from '@metacult/shared-db/test-utils';

describe('CreateSeason Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await createSeasonRoute.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '', name: '2023-2024' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await createSeasonRoute.request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '23-24', name: 'Saison 2023-2024', active: true })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
  });
});
