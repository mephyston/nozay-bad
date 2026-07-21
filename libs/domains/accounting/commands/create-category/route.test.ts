import { describe, it, expect } from 'vitest';
import { createCategoryRoute } from './route';
import { setupMockDb } from '@metacult/shared-db/test-utils';

describe('CreateCategory Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await createCategoryRoute.request('http://localhost/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminLabel: '', adherentLabel: 'Test' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await createCategoryRoute.request('http://localhost/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminLabel: 'Admin Cat', adherentLabel: 'Adherent Cat' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
  });
});
